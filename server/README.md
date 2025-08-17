# FT_PONG Socket.IO Server

This is the Socket.IO server for FT_PONG real-time multiplayer functionality.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3001 by default.

## Features

- Real-time multiplayer rooms (2P and 4P)
- Room-based game state synchronization
- Player input handling
- Live chat support
- Automatic room cleanup

## Endpoints

- **Health Check**: `GET /health` - Server status
- **Socket.IO**: WebSocket connection on `/socket.io`

## Environment Variables

- `PORT` - Server port (default: 3001)

## CORS Configuration

The server is configured to accept connections from:
- http://localhost:5173 (Vite dev server)
- http://localhost:5174
- http://localhost:5175
- http://localhost:3000

Add more origins as needed for production deployment.