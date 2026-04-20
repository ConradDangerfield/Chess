from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
import uuid
import chess
import socketio
import httpx
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

fastapi_app = FastAPI()

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO — register on both '/' and '/proxy' namespaces for Discord
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False,
    ping_timeout=120,
    ping_interval=60,
    namespaces=['/', '/proxy'],
)

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='api/socket.io')

api_router = APIRouter(prefix="/api")

# --------------- In-memory game state ---------------
games = {}      # roomId -> GameRoom
sessions = {}   # sid -> { roomId, username, color, namespace }

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROOM_IDLE_TIMEOUT = 7200  # 2 hours in seconds


class GameRoom:
    """Server-authoritative chess game room"""

    def __init__(self, room_id):
        self.room_id = room_id
        self.board = chess.Board()
        self.white = None
        self.black = None
        self.spectators = []
        self.moves = []
        self.last_activity = datetime.now(timezone.utc)

    def touch(self):
        self.last_activity = datetime.now(timezone.utc)

    def is_empty(self):
        has_white = self.white and self.white.get('connected', False)
        has_black = self.black and self.black.get('connected', False)
        return not has_white and not has_black and len(self.spectators) == 0

    def get_state(self):
        turn = 'white' if self.board.turn == chess.WHITE else 'black'
        status = 'playing'

        if self.board.is_checkmate():
            winner = 'black' if self.board.turn == chess.WHITE else 'white'
            status = f'checkmate_{winner}'
        elif self.board.is_stalemate():
            status = 'stalemate'
        elif self.board.is_insufficient_material():
            status = 'draw_insufficient'
        elif self.board.can_claim_fifty_moves():
            status = 'draw_fifty'
        elif self.board.can_claim_threefold_repetition():
            status = 'draw_repetition'
        elif self.board.is_check():
            status = 'check'

        last_move = None
        if self.moves:
            last = self.moves[-1]
            last_move = {'from': last['from'], 'to': last['to']}

        return {
            'fen': self.board.fen(),
            'turn': turn,
            'status': status,
            'isCheck': self.board.is_check(),
            'isGameOver': self.board.is_game_over(),
            'white': {'username': self.white['username']} if self.white else None,
            'black': {'username': self.black['username']} if self.black else None,
            'spectatorCount': len(self.spectators),
            'moves': self.moves,
            'lastMove': last_move,
            'playerCount': (1 if self.white else 0) + (1 if self.black else 0),
        }

    def try_move(self, from_sq, to_sq, promotion=None):
        uci_str = from_sq + to_sq + (promotion or '')
        move_obj = chess.Move.from_uci(uci_str)

        if move_obj in self.board.legal_moves:
            san = self.board.san(move_obj)
            color = 'white' if self.board.turn == chess.WHITE else 'black'
            self.board.push(move_obj)
            move_number = (len(self.moves) // 2) + 1
            self.moves.append({
                'from': from_sq, 'to': to_sq, 'san': san,
                'color': color, 'moveNumber': move_number,
            })
            self.touch()
            return True, san
        return False, None

    def reset(self):
        self.board = chess.Board()
        self.moves = []
        self.touch()


# --------------- Room cleanup ---------------
def cleanup_room(room_id):
    """Remove a room if it's empty (no connected players or spectators)."""
    if room_id in games and games[room_id].is_empty():
        del games[room_id]
        # Clean up orphaned sessions
        for sid in list(sessions.keys()):
            if sessions[sid]['roomId'] == room_id:
                del sessions[sid]
        logger.info(f"Room {room_id} cleaned up (empty)")


async def idle_room_reaper():
    """Background task: evict rooms idle for more than 2 hours."""
    while True:
        await asyncio.sleep(300)  # check every 5 minutes
        now = datetime.now(timezone.utc)
        stale = [
            rid for rid, room in games.items()
            if (now - room.last_activity).total_seconds() > ROOM_IDLE_TIMEOUT
        ]
        for rid in stale:
            del games[rid]
            for sid in list(sessions.keys()):
                if sessions[sid]['roomId'] == rid:
                    del sessions[sid]
            logger.info(f"Room {rid} evicted (idle > 2h)")


@fastapi_app.on_event("startup")
async def start_reaper():
    asyncio.create_task(idle_room_reaper())


# --------------- REST endpoints ---------------
@api_router.get("/")
async def root():
    return {"message": "Chess Server Running"}


@api_router.post("/room/create")
async def create_room():
    room_id = str(uuid.uuid4())[:8]
    games[room_id] = GameRoom(room_id)
    return {"roomId": room_id}


@api_router.get("/room/{room_id}")
async def get_room(room_id: str):
    if room_id in games:
        return {"exists": True, "state": games[room_id].get_state()}
    return {"exists": False}


class TokenRequest(BaseModel):
    code: str

@api_router.post("/token")
async def exchange_token(req: TokenRequest):
    client_id = os.environ.get("DISCORD_CLIENT_ID", "")
    client_secret = os.environ.get("DISCORD_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        return JSONResponse({"error": "Discord credentials not configured"}, status_code=500)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "authorization_code",
                "code": req.code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if resp.status_code != 200:
        logger.error(f"Discord token exchange failed: {resp.text}")
        return JSONResponse({"error": "Token exchange failed"}, status_code=400)

    return resp.json()


fastapi_app.include_router(api_router)


# --------------- Socket.IO event handlers ---------------
# Registered on both '/' and '/proxy' namespaces so Discord clients
# connecting via the proxy namespace are handled identically.

async def _on_connect(sid, environ, namespace):
    logger.info(f"Client connected: {sid} (ns={namespace})")


async def _on_join_room(sid, data, namespace):
    room_id = data.get('roomId')
    username = data.get('username', 'Anonymous')

    if room_id not in games:
        games[room_id] = GameRoom(room_id)

    game = games[room_id]
    game.touch()
    color = None

    if game.white and game.white['username'] == username:
        game.white['sid'] = sid
        game.white['connected'] = True
        color = 'white'
    elif game.black and game.black['username'] == username:
        game.black['sid'] = sid
        game.black['connected'] = True
        color = 'black'
    elif not game.white:
        game.white = {'sid': sid, 'username': username, 'connected': True}
        color = 'white'
    elif not game.black:
        game.black = {'sid': sid, 'username': username, 'connected': True}
        color = 'black'
    else:
        game.spectators.append({'sid': sid, 'username': username})
        color = 'spectator'

    for old_sid in list(sessions.keys()):
        if (sessions[old_sid]['roomId'] == room_id
                and sessions[old_sid]['username'] == username
                and old_sid != sid):
            del sessions[old_sid]

    sessions[sid] = {'roomId': room_id, 'username': username, 'color': color, 'namespace': namespace}
    await sio.enter_room(sid, room_id, namespace=namespace)

    await sio.emit('room_joined', {
        'color': color,
        'username': username,
        'state': game.get_state(),
    }, room=sid, namespace=namespace)

    await sio.emit('game_state', game.get_state(), room=room_id, namespace=namespace)
    logger.info(f"{username} joined room {room_id} as {color} (ns={namespace})")


async def _on_make_move(sid, data, namespace):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']
    color = info['color']

    if room_id not in games:
        return

    game = games[room_id]

    if color == 'spectator':
        await sio.emit('move_error', {'message': 'Spectators cannot move pieces'}, room=sid, namespace=namespace)
        return

    current_turn = 'white' if game.board.turn == chess.WHITE else 'black'
    if color != current_turn:
        await sio.emit('move_error', {'message': 'Not your turn'}, room=sid, namespace=namespace)
        return

    success, san = game.try_move(data.get('from'), data.get('to'), data.get('promotion'))

    if success:
        state = game.get_state()
        # Broadcast to all namespaces that have clients in this room
        await sio.emit('game_state', state, room=room_id, namespace='/')
        await sio.emit('game_state', state, room=room_id, namespace='/proxy')
        await sio.emit('move_made', {'from': data['from'], 'to': data['to'], 'san': san}, room=room_id, namespace='/')
        await sio.emit('move_made', {'from': data['from'], 'to': data['to'], 'san': san}, room=room_id, namespace='/proxy')
    else:
        await sio.emit('move_error', {'message': 'Invalid move'}, room=sid, namespace=namespace)


async def _on_reset_game(sid, data, namespace):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']

    if info['color'] == 'spectator':
        await sio.emit('move_error', {'message': 'Spectators cannot reset'}, room=sid, namespace=namespace)
        return

    if room_id not in games:
        return

    games[room_id].reset()
    state = games[room_id].get_state()
    await sio.emit('game_state', state, room=room_id, namespace='/')
    await sio.emit('game_state', state, room=room_id, namespace='/proxy')
    await sio.emit('game_reset', {}, room=room_id, namespace='/')
    await sio.emit('game_reset', {}, room=room_id, namespace='/proxy')


async def _on_disconnect(sid, namespace):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']

    if room_id in games:
        game = games[room_id]

        if info['color'] == 'white' and game.white and game.white['sid'] == sid:
            game.white['connected'] = False
        elif info['color'] == 'black' and game.black and game.black['sid'] == sid:
            game.black['connected'] = False
        elif info['color'] == 'spectator':
            game.spectators = [s for s in game.spectators if s['sid'] != sid]

        await sio.emit('game_state', game.get_state(), room=room_id, namespace='/')
        await sio.emit('game_state', game.get_state(), room=room_id, namespace='/proxy')

        # Clean up empty rooms after a short delay (allow reconnect)
        async def delayed_cleanup():
            await asyncio.sleep(30)
            cleanup_room(room_id)
        asyncio.create_task(delayed_cleanup())

    if info['color'] == 'spectator':
        del sessions[sid]

    logger.info(f"Disconnected: {sid} ({info.get('username', '?')}) ns={namespace}")


# Register handlers on '/' namespace
@sio.on('connect', namespace='/')
async def connect_default(sid, environ):
    await _on_connect(sid, environ, '/')

@sio.on('join_room', namespace='/')
async def join_room_default(sid, data):
    await _on_join_room(sid, data, '/')

@sio.on('make_move', namespace='/')
async def make_move_default(sid, data):
    await _on_make_move(sid, data, '/')

@sio.on('reset_game', namespace='/')
async def reset_game_default(sid, data=None):
    await _on_reset_game(sid, data, '/')

@sio.on('disconnect', namespace='/')
async def disconnect_default(sid):
    await _on_disconnect(sid, '/')


# Register same handlers on '/proxy' namespace (Discord clients)
@sio.on('connect', namespace='/proxy')
async def connect_proxy(sid, environ):
    await _on_connect(sid, environ, '/proxy')

@sio.on('join_room', namespace='/proxy')
async def join_room_proxy(sid, data):
    await _on_join_room(sid, data, '/proxy')

@sio.on('make_move', namespace='/proxy')
async def make_move_proxy(sid, data):
    await _on_make_move(sid, data, '/proxy')

@sio.on('reset_game', namespace='/proxy')
async def reset_game_proxy(sid, data=None):
    await _on_reset_game(sid, data, '/proxy')

@sio.on('disconnect', namespace='/proxy')
async def disconnect_proxy(sid):
    await _on_disconnect(sid, '/proxy')


@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
