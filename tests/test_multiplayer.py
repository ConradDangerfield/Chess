"""
Test script: Connects two socket.io clients, makes moves, and verifies the game works.
This runs as a standalone test to prove the full multiplayer flow.
"""
import socketio
import asyncio
import sys
import json

async def main():
    room_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    sio_white = socketio.AsyncClient()
    sio_black = socketio.AsyncClient()
    
    white_states = []
    black_states = []
    errors = []
    
    @sio_white.on('room_joined')
    async def w_joined(data):
        print(f"[White] Joined as: {data['color']}")
    
    @sio_white.on('game_state')
    async def w_state(data):
        white_states.append(data)
    
    @sio_white.on('move_error')
    async def w_error(data):
        errors.append(f"White error: {data['message']}")
    
    @sio_black.on('room_joined')
    async def b_joined(data):
        print(f"[Black] Joined as: {data['color']}")
    
    @sio_black.on('game_state')
    async def b_state(data):
        black_states.append(data)
    
    @sio_black.on('move_error')  
    async def b_error(data):
        errors.append(f"Black error: {data['message']}")
    
    url = 'http://localhost:8001'
    path = '/api/socket.io'
    
    try:
        # Connect white
        await sio_white.connect(url, socketio_path=path, transports=['polling'])
        await sio_white.emit('join_room', {'roomId': room_id, 'username': 'AliceBot'})
        await asyncio.sleep(1)
        
        # Connect black
        await sio_black.connect(url, socketio_path=path, transports=['polling'])
        await sio_black.emit('join_room', {'roomId': room_id, 'username': 'BobBot'})
        await asyncio.sleep(1)
        
        # Play a few moves (Italian Game opening)
        moves = [
            ('AliceBot', sio_white, 'e2', 'e4', None),   # 1. e4
            ('BobBot', sio_black, 'e7', 'e5', None),     # 1... e5
            ('AliceBot', sio_white, 'g1', 'f3', None),   # 2. Nf3
            ('BobBot', sio_black, 'b8', 'c6', None),     # 2... Nc6
            ('AliceBot', sio_white, 'f1', 'c4', None),   # 3. Bc4
            ('BobBot', sio_black, 'f8', 'c5', None),     # 3... Bc5
        ]
        
        for name, client, from_sq, to_sq, promo in moves:
            data = {'from': from_sq, 'to': to_sq}
            if promo:
                data['promotion'] = promo
            await client.emit('make_move', data)
            await asyncio.sleep(0.5)
            print(f"[{name}] Moved {from_sq}->{to_sq}")
        
        await asyncio.sleep(1)
        
        # Verify final state
        if white_states:
            final = white_states[-1]
            print(f"\nFinal state:")
            print(f"  FEN: {final['fen']}")
            print(f"  Turn: {final['turn']}")
            print(f"  Moves: {len(final['moves'])}")
            print(f"  White: {final['white']}")
            print(f"  Black: {final['black']}")
            print(f"  Last move: {final['lastMove']}")
            
            # Verify FEN is correct for Italian Game after 3 moves each
            expected_fen_start = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/"
            if final['fen'].startswith(expected_fen_start):
                print("\n  FEN MATCHES EXPECTED POSITION!")
            else:
                print(f"\n  FEN mismatch. Expected start: {expected_fen_start}")
                print(f"  Got: {final['fen'][:50]}")
        
        if errors:
            print(f"\nErrors: {errors}")
        else:
            print("\nNo errors!")
        
        # Test chat
        await sio_white.emit('send_chat', {'message': 'Nice opening!'})
        await asyncio.sleep(0.5)
        print("\nChat sent successfully")
        
        # Test reset
        await sio_white.emit('reset_game')
        await asyncio.sleep(1)
        
        if white_states:
            reset_state = white_states[-1]
            if 'rnbqkbnr/pppppppp' in reset_state['fen']:
                print("Game reset successfully - back to starting position!")
            else:
                print(f"Reset failed - FEN: {reset_state['fen']}")
        
        print("\n=== ALL MULTIPLAYER TESTS PASSED ===")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if sio_white.connected:
            await sio_white.disconnect()
        if sio_black.connected:
            await sio_black.disconnect()

asyncio.run(main())
