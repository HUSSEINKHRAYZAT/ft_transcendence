# 🎮 FT_PONG - 3D Pong Game

A modern, lime-themed 3D Pong game built with TypeScript, Babylon.js, and Tailwind CSS. Features a beautiful frontend interface integrated with an advanced 3D game engine supporting local multiplayer, AI opponents, online play, and tournament modes.

![FT_PONG](https://img.shields.io/badge/FT_PONG-3D%20Game-84cc16?style=for-the-badge&logo=gamepad)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?style=for-the-badge&logo=typescript)
![Babylon.js](https://img.shields.io/badge/Babylon.js-8.23.1-bb464a?style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.6-06b6d4?style=for-the-badge&logo=tailwindcss)

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- Modern web browser with WebGL support

### Installation

1. **Clone or download** the project files
2. **Navigate** to the project directory:
   ```bash
   cd transendencs
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and go to:
   ```
   http://localhost:5174
   ```

## 🎯 How to Play

### 1. **Login**
- Click **"Start Game"** or **"Play Game"** 
1. Browser 1 (Chrome):
    - Login: alice@ftpong.com / alice123
    - Host a room as "Alice"
  2. Browser 2 (Firefox/Incognito):
    - Login: bob@ftpong.com / bob123
    - Join Alice's room as "Bob"

### 2. **Start Playing**
- After login, click **"Play Game"** again
- Select your preferred game mode from the fancy menu
- Use **"← Exit Game"** button to return to the frontend

### 3. **Game Modes**

#### 🏠 **Local Play**
- **2P Local Match**: Two players on the same device
  - Player 1: **Arrow Keys** (↑↓←→)
  - Player 2: **WASD Keys**
- **VS AI**: Single player against AI
  - Adjustable difficulty (1-10)
  - Player: **Arrow Keys**

#### 🌐 **Online Play** (Requires Authentication)
- **Host 2P/4P**: Create a match and share the code
- **Join 2P/4P**: Enter a match code to join

#### 🏆 **Tournament Mode** (Requires Authentication)
- **8 or 16 player** brackets
- **Results saved** to database
- **Real-time bracket** updates

### 4. **Game Controls**
- **Paddle Movement**: Arrow Keys or WASD
- **Camera**: Mouse for 3D view rotation
- **Pause**: ESC key
- **Exit**: Click "← Exit Game" button

## ✨ Features

### 🎨 **Frontend Features**
- **Lime-themed UI** with modern gradients
- **Multi-language support** (English, French, German)
- **Theme customization** (colors and backgrounds)
- **User authentication** with demo account
- **Responsive design** for all screen sizes
- **Toast notifications** for user feedback

### 🎮 **Game Features**
- **3D Babylon.js engine** with realistic physics
- **Multiple game modes** (Local, AI, Online, Tournament)
- **Advanced collision system** with various obstacle shapes
- **Real-time score tracking** with color-coded players
- **Dynamic camera angles** for optimal viewing
- **Audio system** with sound effects
- **Particle effects** and visual enhancements

### 🔧 **Technical Features**
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Hot Module Replacement** (can be disabled)
- **Modern ES modules** architecture
- **WebSocket** support for real-time multiplayer
- **Local storage** for user preferences

## 🎨 UI Customization

### **Settings Panel**
Access the settings in the bottom-right box on the homepage:

- **🌍 Language**: Switch between English, French, German
- **🎨 Theme**: Choose color schemes
- **🖼️ Background**: Select background themes

### **Color Scheme**
The app uses a consistent lime-green color palette:
- **Primary**: #84cc16 (Lime 500)
- **Secondary**: #65a30d (Lime 600) 
- **Accent**: #a3e635 (Lime 400)
- **Background**: Dark grays (#111827, #1f2937)

## 🛠️ Development

### **Available Scripts**

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

### **Project Structure**

```
transendencs/
├── src/
│   ├── components/           # UI components
│   │   ├── home/            # Homepage components
│   │   ├── modals/          # Modal dialogs
│   │   └── navbar/          # Navigation bar
│   ├── game/                # 3D Pong game engine
│   │   ├── Pong3D.ts        # Main game class
│   │   ├── constants.ts     # Game constants
│   │   └── helpers.ts       # Utility functions
│   ├── services/            # API and auth services
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript types
│   ├── langs/               # Internationalization
│   └── styles/              # CSS styles
├── public/                  # Static assets
│   ├── textures/           # 3D textures
│   └── sounds/             # Audio files
└── themes/                 # Theme configurations
```

### **Key Technologies**
- **Babylon.js 8.23.1**: 3D rendering engine
- **TypeScript 5.8.3**: Type-safe JavaScript
- **Tailwind CSS 3.3.6**: Utility-first CSS
- **Vite 7.1.2**: Fast build tool
- **Orbitron Font**: Futuristic game typography

## 🔧 Configuration

### **Environment Variables**
Create a `.env` file for custom configuration:

```env
VITE_API_BASE=http://localhost:3000
```

### **Disable Auto-Refresh** (Currently Disabled)
The HMR (Hot Module Replacement) is disabled for stable game testing. To re-enable:

```typescript
// vite.config.ts
server: {
  hmr: true, // Change from false to true
}
```

## 🐛 Troubleshooting

### **Common Issues**

#### **Game Audio Not Working**
- **Solution**: Click anywhere on the page first (browser requires user gesture)
- Modern browsers block auto-playing audio

#### **"Network Error" on Login**
- **Solution**: Use the demo credentials provided
- The app works offline with localStorage authentication

#### **Game Performance Issues**
- **Solution**: 
  - Close other browser tabs
  - Ensure WebGL is enabled
  - Update graphics drivers

#### **Score UI Hidden Behind Navbar**
- **Solution**: Already fixed - score appears below navbar
- If issues persist, refresh the page

#### **Game Continues Playing After Exit**
- **Solution**: Already fixed - game engine properly disposes
- Use the "← Exit Game" button, not browser back

### **Browser Compatibility**
- **Chrome/Edge**: ✅ Fully supported
- **Firefox**: ✅ Fully supported  
- **Safari**: ✅ Supported (may need WebGL enabled)
- **Mobile**: ⚠️ Limited support (desktop recommended)

### **Performance Tips**
- Use **Chrome** or **Edge** for best performance
- Ensure **hardware acceleration** is enabled
- Close unnecessary browser tabs
- Reduce AI difficulty if experiencing lag

## 📋 Demo Account

For quick testing, use these credentials:

```
Email: demo@ftpong.com
Password: demo123
```

**Demo User Stats:**
- Name: Demo User
- Games Played: 15
- Wins: 12
- Losses: 3
- Win Rate: 80%

## 🤝 Contributing

This is a 42 School project. The codebase demonstrates:
- Modern web development practices
- 3D game engine integration
- Real-time multiplayer architecture
- Professional UI/UX design

## 📄 License

MIT License - Built for educational purposes at 42 School.

---

**🎮 Ready to play? Start with `npm run dev` and visit http://localhost:5174**

**🎯 Need help? All game instructions are provided in the UI**

**🚀 Enjoy the most advanced 3D Pong experience!**