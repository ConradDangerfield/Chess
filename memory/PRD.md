# Chess Multiplayer Web App - PRD

## Problem Statement
Build a real-time multiplayer chess web app with integrated chat system.

## Architecture
- **Backend**: FastAPI + python-socketio (ASGI) + python-chess for validation
- **Frontend**: React + react-chessboard v5 + chess.js + socket.io-client
- **Database**: MongoDB (available but not used — all state in-memory per requirement)
- **Real-time**: Socket.IO over polling + WebSocket at `/api/socket.io`

## User Personas
- **Player**: Joins a room, gets assigned white/black, makes moves, chats
- **Spectator**: Joins a full room (2 players already), watches the game + chats

## Core Requirements
- [x] Game rooms via unique URL (/game/:roomId)
- [x] Two players per room (auto-assigned white/black)
- [x] Spectators can watch but not move
- [x] Turn-based enforcement (server-side)
- [x] Server-side move validation with python-chess
- [x] Real-time FEN state sync via Socket.IO
- [x] Game status display (turn, check, checkmate, draw)
- [x] Real-time chat per room
- [x] Username prompt before joining
- [x] Reconnect handling (refresh & rejoin)
- [x] Game reset button (players only)
- [x] Move history list in algebraic notation
- [x] Legal move dots on piece selection
- [x] Last move highlighting
- [x] Click-to-move + drag-and-drop support
- [x] Clean split layout (board left, chat/moves right)
- [x] Responsive design (desktop + mobile)
- [x] Custom board colors (#262626 dark, #F8F9FA light)

## What's Been Implemented (Feb 2026)
- Full backend with FastAPI + python-socketio ASGI app
- In-memory game room management with python-chess
- Socket.IO events: join_room, make_move, send_chat, reset_game
- Reconnect handling via username matching
- REST API: create room, get room state
- React frontend with react-chessboard v5 (options API)
- Swiss-inspired light theme with Cabinet Grotesk + IBM Plex Sans fonts
- Glassmorphism username modal
- Tabs for Chat/Moves with underline indicators
- Auto-scroll chat with message bubbles
- Move history in two-column algebraic notation
- Player info with color indicators

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1 (Nice to have)
- Promotion piece picker (currently defaults to queen)
- Timer/clock per player
- Sound effects on moves

### P2 (Future)
- Database persistence for game history
- Share room link via social
- Mobile-optimized touch interactions
- Rematch button

## Update Log - Feb 2026 (Post-MVP)
### Changes Applied
- **Board colors**: Changed from high-contrast (#262626/#F8F9FA) to classic brown/cream (#B58863/#F0D9B5) per user request
- **Sound effects**: Added Web Audio API-generated sounds:
  - Regular move: short wood tap
  - Capture: deeper thud (triggered when SAN contains 'x')
  - Check: two-tone alert (SAN contains '+')
  - Checkmate: dramatic descending tone (SAN contains '#')
  - Draw/stalemate: game-over sound on state change
  - Join/reset: soft notification ping
