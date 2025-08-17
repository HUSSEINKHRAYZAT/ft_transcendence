# Socket.IO Multiplayer Setup Guide

This project now supports real-time multiplayer using Socket.IO! This allows players to play across different browsers/devices.

## Quick Start

### 1. Start the Socket.IO Server

First, open a terminal and start the Socket.IO server:

```bash
cd server
npm install
npm start
```

The server will start on port 3001 and you should see:
```
🎮 FT_PONG Socket.IO Server running on port 3001
🌐 CORS enabled for localhost:5173, 5174, 5175, 3000
📊 Active rooms: 0, Active players: 0
```

### 2. Start the Game Frontend

In another terminal, start the frontend development server:

```bash
npm run dev
```

This will start the game on http://localhost:5173

### 3. Test Multiplayer

1. **Host a Game**: 
   - Open the game in your browser
   - Click "Host 2P (Socket.IO)" or "Host 4P (Socket.IO)"
   - You'll get a room ID (e.g., "ABC123")

2. **Join from Another Browser**:
   - Open the game in another browser/tab/device
   - Click "Join 2P (Socket.IO)" or "Join 4P (Socket.IO)"
   - Enter the room ID from step 1

3. **Play Together**:
   - Once connected, the host can start the game
   - Both players can use their controls simultaneously
   - Chat is available during gameplay

## Features

- ✅ Real-time multiplayer (2P and 4P)
- ✅ Room-based matchmaking
- ✅ Live chat during games
- ✅ Automatic reconnection
- ✅ Cross-browser compatibility
- ✅ Host migration if host leaves

## Controls

- **Player 1**: Arrow keys (Up/Down)
- **Player 2**: W/S keys
- **Chat**: Available in-game for communication

## Troubleshooting

### Server Not Starting
- Make sure port 3001 is not in use
- Check you ran `npm install` in the server directory

### Can't Connect
- Ensure the Socket.IO server is running
- Check browser console for connection errors
- Verify firewall isn't blocking port 3001

### Game Not Syncing
- Check browser console for errors
- Ensure both players are in the same room
- Try refreshing and reconnecting

## Architecture

- **Frontend**: React/TypeScript with Socket.IO client
- **Backend**: Node.js + Express + Socket.IO server
- **Real-time**: WebSocket with polling fallback
- **State Management**: Host-authoritative game state

The Socket.IO implementation provides better reliability than raw WebSockets with automatic reconnection and fallback transports.