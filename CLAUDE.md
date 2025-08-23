# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D Pong game built with TypeScript and Babylon.js. The game supports local multiplayer, AI opponents, and online multiplayer with real-time synchronization via WebSockets. It also includes tournament functionality.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compilation followed by Vite build)
- **Preview production build**: `npm run preview`

## Architecture

### Entry Point
- `main.ts` - Main entry point that initializes the menu and game
- `index.html` - HTML shell with canvas element for 3D rendering

### Core Game Engine
- `src/game/Pong3D.ts` - Main game class containing all 3D rendering, physics, networking, and AI logic
- `src/game/helpers.ts` - Utility functions for math, collision detection, and visual effects
- `src/game/constants.ts` - Game constants including obstacle shapes and weights

### UI and Menu System
- `src/menu.ts` - Main menu system for game mode selection and configuration
- `src/ui.ts` - UI utility functions for managing DOM elements
- `src/types.ts` - TypeScript type definitions for game configuration and networking

### Networking and API
- `src/api.ts` - API client for authentication, matchmaking, and tournament management
- `src/tournament.ts` - Tournament bracket management logic

### Asset Structure
- `public/textures/` - 3D textures for ball, walls, floor, and obstacles
- `public/sounds/` - Audio files for game sound effects

## Key Game Features

### Game Modes
1. **Local 2P** - Two players on same device (Arrow keys vs W/S)
2. **AI Mode** - Single player vs AI with adjustable difficulty (1-10)
3. **4P Mode** - Four-player mode with different paddle orientations
4. **Online Multiplayer** - Real-time multiplayer via WebSocket
5. **Tournament Mode** - Bracket-style tournaments with 8 or 16 players

### Physics and Collision System
- 3D ball physics with gravity and velocity
- Paddle collision with angle-based deflection
- Obstacle collision with various shapes (sphere, cylinder, cone, capsule, disc, box)
- Wall and corner collision detection

### Networking Architecture
- Host-authoritative multiplayer model
- WebSocket-based real-time state synchronization
- Guest input forwarding to host for processing
- Match result reporting to backend API

## Important Implementation Details

### Camera System
The game uses a rotating camera system where each player's view is rotated so their paddle appears on the left side, maintaining consistent controls across different player positions.

### AI System
AI opponents use predictive ball tracking with configurable error ranges and response speeds. Higher difficulty reduces error and increases reaction speed.

### Audio System
Uses Babylon.js Sound API with fallback to Web Audio API beeps. Audio requires user gesture for initialization.

### State Management
Game state is managed centrally in the Pong3D class with different control schemes based on connection type (local, AI, host, guest).

## Development Notes

### Technology Stack
- **TypeScript 5.8.3** with strict configuration
- **Vite 7.1.2** for development and building
- **Babylon.js 8.23.1** for 3D rendering and physics
- **WebSocket** for real-time multiplayer

### Code Style
- Uses ES2022 target with modern JavaScript features
- Strict TypeScript configuration with unused parameter/variable checking
- Modular architecture with clear separation of concerns
- Event-driven input handling and networking

### Testing
No formal test framework is configured. Testing should be done manually by running different game modes and verifying functionality.