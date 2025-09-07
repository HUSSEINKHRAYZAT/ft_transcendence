# 🔐 Demo Accounts for Testing

Use these accounts to test the Socket.IO multiplayer functionality with different users:

## Available Demo Accounts

| Email | Password | Name | Use For |
|-------|----------|------|---------|
| `alice@ftpong.com` | `alice123` | Alice Smith | 👩 Host Player |
| `bob@ftpong.com` | `bob123` | Bob Johnson | 👨 Guest Player |
| `carol@ftpong.com` | `carol123` | Carol Brown | 👩 Player 3 |
| `david@ftpong.com` | `david123` | David Wilson | 👨 Player 4 |
| `demo@ftpong.com` | `demo123` | Demo Player | 🎮 Default |

## Testing Steps

### **Browser 1 (Host)**
1. Go to `http://localhost:5176`
2. Login with: `alice@ftpong.com` / `alice123`
3. Click "Play Game" → Host 2P (Socket.IO)
4. Enter name "Alice" and create room

### **Browser 2 (Guest)**  
1. Go to `http://localhost:5176` (new browser/incognito)
2. Login with: `bob@ftpong.com` / `bob123`
3. Click "Play Game" → Join 2P (Socket.IO)
4. Enter name "Bob" and room ID from Browser 1

## Expected Results

- **Host Display**: "Alice vs Waiting…" → "Alice vs Bob"
- **Guest Display**: "Bob vs Alice" 
- **Server Logs**: Shows both distinct users
- **No "undefined"**: Clear player identification

## Notes

- Each account has unique user data (name, email, ID)
- Perfect for testing multiplayer with distinct players
- All accounts work offline (no backend required)
- Use different browsers or incognito mode for separate logins