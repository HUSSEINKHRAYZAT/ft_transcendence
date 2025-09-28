# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

FT Pong is a full-stack 3D Pong game with microservices backend and TypeScript/Babylon.js frontend.

### Backend Architecture (Docker Microservices)
- **API Gateway** (Port 8080): Main entry point, routes requests to microservices
- **User Management** (Port 3001): User authentication and profiles
- **Session Service** (Port 3003): Session management and JWT tokens
- **Game Service** (Port 3004): Game state, scores, tournament logic
- **Socket Service** (Port 3005): Real-time multiplayer WebSocket connections
- **Google OAuth2** (Port 3006): Google authentication integration
- **Mailer Service** (Port 3002): Email notifications
- **Realtime Service** (Port 3020): Real-time game synchronization

All services use SQLite databases with shared volumes for data persistence.

### Frontend Architecture (TypeScript + Babylon.js)
- **3D Game Engine**: Babylon.js-based Pong implementation in `src/game/`
- **UI Components**: Tailwind CSS components in `src/components/`
- **Service Layer**: API communication in `src/services/`
- **Authentication**: JWT-based auth in `src/auth/`
- **Multi-language**: i18n support in `src/langs/`

## Development Commands

### Full Development Environment
```bash
make dev              # Start both backend (Docker) and frontend (Vite)
make install          # Install all dependencies
```

### Backend (Docker Services)
```bash
make backend-up              # Start all microservices (foreground)
make backend-up-detached     # Start all microservices (background)
make backend-down            # Stop all services
make backend-logs            # View logs from all services
make backend-restart         # Restart all services
```

### Frontend (Vite + TypeScript)
```bash
cd Frontend && npm run dev           # Start dev server (port 5173)
cd Frontend && npm run build         # Build for production
cd Frontend && npm run preview       # Preview production build
cd Frontend && npm run type-check    # Run TypeScript checks
```

### Individual Backend Services
Each microservice (api-gateway, user-management, etc.) has:
```bash
npm run dev     # Development with ts-node
npm run build   # Compile TypeScript
npm run start   # Run compiled JavaScript
```

## Project Structure

```
ft_pong/
├── Frontend/                    # Vite + TypeScript frontend
│   ├── src/
│   │   ├── game/               # Babylon.js 3D Pong engine
│   │   ├── components/         # UI components (Tailwind CSS)
│   │   ├── services/           # API communication layer
│   │   ├── auth/              # JWT authentication logic
│   │   └── types/             # TypeScript type definitions
│   ├── Conf/                  # Vite and TypeScript config
│   └── public/                # Static assets (textures, sounds)
├── Backend/                   # Docker microservices
│   ├── api-gateway/          # Main API gateway (Fastify)
│   ├── user-management/      # User service (SQLite)
│   ├── session-microservice/ # Session management
│   ├── game-microservice/    # Game logic and tournaments
│   ├── socket-microservice/  # WebSocket multiplayer
│   └── docker-compose.yml    # Service orchestration
└── Makefile                  # Development commands
```

## Key Technologies

- **Frontend**: TypeScript 5.8.3, Babylon.js 8.23.1, Tailwind CSS 3.3.6, Vite 5.4.20
- **Backend**: Node.js, Fastify, TypeScript, SQLite, Docker
- **Real-time**: WebSockets for multiplayer functionality
- **Authentication**: JWT tokens, Google OAuth2 integration

## Development Notes

- Frontend runs on port 5173, backend gateway on port 8080
- API endpoints are proxied through the gateway at http://localhost:8080
- Each microservice has its own SQLite database with shared volumes
- Frontend uses path aliases configured in vite.config.ts (@/, @/components, etc.)
- Game engine supports local multiplayer, AI opponents, online play, and tournaments
- All services include health checks and restart policies