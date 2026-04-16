from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import uuid
import chess
import socketio
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

# FastAPI app
fastapi_app = FastAPI()

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO server (ASGI mode)
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

# Wrap FastAPI with Socket.IO — this becomes the ASGI app uvicorn serves
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='api/socket.io')

api_router = APIRouter(prefix="/api")

# --------------- In-memory game state ---------------
games = {}      # roomId -> GameRoom
sessions = {}   # sid -> { roomId, username, color }

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class GameRoom:
    """Server-authoritative chess game room"""

    def __init__(self, room_id):
        self.room_id = room_id
        self.board = chess.Board()
        self.white = None          # { sid, username }
        self.black = None
        self.spectators = []       # [{ sid, username }]
        self.chat = []             # [{ username, message, timestamp, isSystem, color }]
        self.moves = []            # [{ from, to, san, color, moveNumber }]

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
                'from': from_sq,
                'to': to_sq,
                'san': san,
                'color': color,
                'moveNumber': move_number,
            })
            return True, san
        return False, None

    def reset(self):
        self.board = chess.Board()
        self.moves = []


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


fastapi_app.include_router(api_router)


# --------------- Socket.IO events ---------------
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")


@sio.event
async def join_room(sid, data):
    room_id = data.get('roomId')
    username = data.get('username', 'Anonymous')

    if room_id not in games:
        games[room_id] = GameRoom(room_id)

    game = games[room_id]
    color = None

    # Reconnection: match by username
    if game.white and game.white['username'] == username:
        game.white['sid'] = sid
        color = 'white'
    elif game.black and game.black['username'] == username:
        game.black['sid'] = sid
        color = 'black'
    elif not game.white:
        game.white = {'sid': sid, 'username': username}
        color = 'white'
    elif not game.black:
        game.black = {'sid': sid, 'username': username}
        color = 'black'
    else:
        game.spectators.append({'sid': sid, 'username': username})
        color = 'spectator'

    # Clean up stale sessions for this username in this room
    for old_sid in list(sessions.keys()):
        if (sessions[old_sid]['roomId'] == room_id
                and sessions[old_sid]['username'] == username
                and old_sid != sid):
            del sessions[old_sid]

    sessions[sid] = {'roomId': room_id, 'username': username, 'color': color}
    await sio.enter_room(sid, room_id)

    # Send initial data to joining client
    await sio.emit('room_joined', {
        'color': color,
        'username': username,
        'state': game.get_state(),
        'chat': game.chat[-100:],
    }, room=sid)

    # Broadcast updated state
    await sio.emit('game_state', game.get_state(), room=room_id)

    # System message
    system_msg = {
        'username': 'System',
        'message': f'{username} joined as {color}',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'isSystem': True,
    }
    game.chat.append(system_msg)
    await sio.emit('chat_message', system_msg, room=room_id)
    logger.info(f"{username} joined room {room_id} as {color}")


@sio.event
async def make_move(sid, data):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']
    color = info['color']

    if room_id not in games:
        return

    game = games[room_id]

    if color == 'spectator':
        await sio.emit('move_error', {'message': 'Spectators cannot move pieces'}, room=sid)
        return

    current_turn = 'white' if game.board.turn == chess.WHITE else 'black'
    if color != current_turn:
        await sio.emit('move_error', {'message': 'Not your turn'}, room=sid)
        return

    from_sq = data.get('from')
    to_sq = data.get('to')
    promotion = data.get('promotion')

    success, san = game.try_move(from_sq, to_sq, promotion)

    if success:
        state = game.get_state()
        await sio.emit('game_state', state, room=room_id)
        await sio.emit('move_made', {'from': from_sq, 'to': to_sq, 'san': san}, room=room_id)
    else:
        await sio.emit('move_error', {'message': 'Invalid move'}, room=sid)


@sio.event
async def send_chat(sid, data):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']
    message = data.get('message', '').strip()

    if not message or room_id not in games:
        return

    game = games[room_id]
    chat_msg = {
        'username': info['username'],
        'message': message,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'color': info['color'],
        'isSystem': False,
    }
    game.chat.append(chat_msg)
    await sio.emit('chat_message', chat_msg, room=room_id)


@sio.event
async def reset_game(sid, data=None):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']

    if info['color'] == 'spectator':
        await sio.emit('move_error', {'message': 'Spectators cannot reset'}, room=sid)
        return

    if room_id not in games:
        return

    game = games[room_id]
    game.reset()

    system_msg = {
        'username': 'System',
        'message': f'{info["username"]} reset the game',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'isSystem': True,
    }
    game.chat.append(system_msg)
    await sio.emit('chat_message', system_msg, room=room_id)
    await sio.emit('game_state', game.get_state(), room=room_id)
    await sio.emit('game_reset', {}, room=room_id)


@sio.event
async def disconnect(sid):
    if sid not in sessions:
        return

    info = sessions[sid]
    room_id = info['roomId']

    if room_id in games:
        game = games[room_id]

        if info['color'] == 'spectator':
            game.spectators = [s for s in game.spectators if s['sid'] != sid]

        system_msg = {
            'username': 'System',
            'message': f'{info["username"]} disconnected',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'isSystem': True,
        }
        game.chat.append(system_msg)
        await sio.emit('chat_message', system_msg, room=room_id)
        await sio.emit('game_state', game.get_state(), room=room_id)

    # Keep player sessions for reconnect; remove spectator sessions
    if info['color'] == 'spectator':
        del sessions[sid]

    logger.info(f"Disconnected: {sid} ({info.get('username', '?')})")


@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
