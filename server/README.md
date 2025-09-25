# 🎮 FT Transcendence Multiplayer Server

A standalone Socket.IO server for real-time multiplayer functionality in FT Transcendence.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Start Server
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server runs on **port 3001** by default.

### 3. Test Server
```bash
curl http://localhost:3001/health
```

## 🌐 Remote Access Setup

### For LAN (Local Network)
1. Get your local IP address:
   ```bash
   # Linux/Mac
   hostname -I | awk '{print $1}'

   # Windows
   ipconfig
   ```

2. Share your IP with other players
3. Players connect to: `http://YOUR_IP:3001`

### For Internet Play
1. **Port Forward**: Configure router to forward port 3001 to your machine
2. **Get Public IP**: Use a service like whatismyip.com
3. **Share Public IP**: Players connect to `http://YOUR_PUBLIC_IP:3001`
4. **Firewall**: Ensure port 3001 is allowed through firewall

## 🎯 Features

### 🏠 Room Management
- **6-character room codes** (e.g., "ABC123")
- **2-player and 4-player** game modes
- **Host/guest** system
- **Automatic room cleanup**

### 📡 Real-time Communication
- **Game state synchronization**
- **Player input forwarding**
- **Chat messaging**
- **Connection management**

### 🔧 Robust Architecture
- **Automatic reconnection**
- **Error handling**
- **Health monitoring**
- **Graceful shutdown**

## 📊 API Endpoints

### Health Check
```
GET /health
```
Returns server status and statistics.

## 🔌 Socket Events

### Client → Server
- `register_player` - Register with display name
- `create_room` - Create new game room
- `join_room` - Join existing room by code
- `leave_room` - Leave current room
- `start_game` - Start game (host only)
- `game_state` - Send game state (host only)
- `player_input` - Send player input
- `chat_message` - Send chat message

### Server → Client
- `room_created` - Room successfully created
- `room_joined` - Successfully joined room
- `room_updated` - Room state changed
- `player_joined` - New player joined
- `player_left` - Player left room
- `game_started` - Game has started
- `game_state` - Game state update
- `player_input` - Input from another player
- `chat_message` - Chat message received
- `error` - Error occurred

## 🛠️ Client Integration

Your existing client should connect using Socket.IO:

```javascript
import { io } from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:3001');

// Register player
socket.emit('register_player', { name: 'PlayerName' });

// Create room
socket.emit('create_room', { gameMode: '2p' });

// Join room
socket.emit('join_room', { roomId: 'ABC123', playerName: 'Guest' });
```

## 🔍 Monitoring

### Check Server Status
```bash
curl http://localhost:3001/health
```

### Monitor Logs
```bash
# If using PM2
pm2 logs ft-transcendence-mp

# If running directly
# Logs appear in console
```

### Server Statistics
The health endpoint provides:
- Active rooms count
- Connected players count
- Server uptime
- Timestamp

## 🚀 Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name "ft-transcendence-mp"

# Save configuration
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server.js ./
EXPOSE 3001
CMD ["node", "server.js"]
```

### Environment Variables
```bash
# Server port (default: 3001)
PORT=3001

# Node environment
NODE_ENV=production
```

## 🔧 Troubleshooting

### Connection Issues
- **Check firewall**: Ensure port 3001 is open
- **Network access**: Verify server is reachable
- **CORS errors**: Check browser console

### Performance Issues
- **Too many rooms**: Server auto-cleans empty rooms every 5 minutes
- **Memory usage**: Monitor with `ps aux | grep node`
- **Network latency**: Test with `ping YOUR_SERVER_IP`

### Common Errors
- `EADDRINUSE`: Port 3001 already in use
- `ECONNREFUSED`: Server not running or unreachable
- `Room not found`: Room code expired or doesn't exist

## 📝 Development

### Adding Features
1. Add new socket event handlers in `server.js`
2. Update the Socket Events documentation
3. Test with multiple clients

### Code Structure
- `GameRoom` class manages room state
- Socket event handlers manage communication
- Automatic cleanup prevents memory leaks

## 🔒 Security Notes

- Input validation on all socket events
- Rate limiting recommended for production
- Sanitize chat messages to prevent XSS
- Consider authentication for persistent rooms

## 📈 Scaling

For high traffic:
- Use Redis adapter for multiple server instances
- Implement room persistence
- Add load balancing
- Monitor with dedicated tools

---

The server is completely standalone and doesn't require any changes to your existing client code. It works with any Socket.IO client implementation.