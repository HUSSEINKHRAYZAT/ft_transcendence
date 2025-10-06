# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FT Transcendence is a sophisticated 3D Pong game with tournament functionality, built as a microservices-based web application. The project combines a TypeScript frontend with 3D graphics capabilities and a containerized Node.js backend.

## Development Commands

### Quick Start
```bash
make dev                    # Start full development environment (backend + frontend)
make install               # Install all dependencies
make status                # Check service status
```

### Frontend Development
```bash
make frontend-dev          # Start frontend dev server (port 5173)
make frontend-build        # Build for production
make frontend-type-check   # Run TypeScript type checking
make frontend-preview      # Preview production build
```

### Backend Development
```bash
make backend-up            # Start all microservices (foreground)
make backend-up-detached   # Start all microservices (background)
make backend-down          # Stop all services
make backend-logs          # View logs from all services
make backend-restart       # Restart backend services
make backend-build         # Build Docker images
```

### Utilities
```bash
make clean                 # Clean containers, volumes, and dependencies
make help                  # Show all available commands
```

## Architecture

### Frontend (TypeScript + Vite)
- **Port**: 5173
- **Build Tool**: Vite with custom config at `Frontend/Conf/vite.config.ts`
- **3D Engines**: Three.js (0.179.1) + Babylon.js (8.23.1)
- **Styling**: Tailwind CSS with custom lime theme
- **Package Manager**: npm

**Key Directories:**
- `Frontend/src/game/` - 3D Pong game engine and core logic
  - `game/core/` - Core game engine (Pong3D.ts, GameState.ts, InputHandler.ts)
  - `game/ui/` - In-game UI overlays and HUD
  - `game/effects/` - Visual effects and particles
  - `game/audio/` - Sound effects and audio management
- `Frontend/src/tournament/` - Tournament bracket and management system
  - Tournament services, match coordination, bracket rendering
  - Real-time synchronization with backend
- `Frontend/src/components/` - Reusable UI components
- `Frontend/src/auth/` - Authentication flow and JWT handling
- `Frontend/src/services/` - API integration and HTTP clients
- `Frontend/src/menu/` - Main menu and navigation
- `Frontend/src/utils/` - Utility functions and helpers

### Backend (Microservices + Docker)
- **API Gateway**: Port 8080 (main entry point for all requests)
- **Framework**: Fastify with TypeScript
- **Database**: SQLite (Better SQLite3) with shared volume
- **Authentication**: JWT + Google OAuth2

**Microservices:**
- `api-gateway` (8080) - Main API gateway with CORS, rate limiting, and request routing
- `user-management` (3001) - User profiles, authentication, and data management
- `game-microservice` (3004) - Game logic, scoring, and match history
- `session-microservice` (3003) - Session management and state
- `realtime-microservice` (3020) - WebSocket for real-time game synchronization
- `socket-service` (3005) - Socket communication service
- `google-oauth2` (3006) - OAuth authentication provider
- `mailer` (3002) - Email notifications

**Service Dependencies:**
- All services depend on `user-management` for user data
- `api-gateway` routes requests to all other services
- Shared SQLite volume (`usermgmt_data`) between user-management, game-microservice, and session-microservice
- Real-time features flow: Frontend → `realtime-microservice` (WebSocket) → other services

### Path Aliases
The frontend uses extensive TypeScript path mapping (configured in `Frontend/Conf/tsconfig.json` and `Frontend/Conf/vite.config.ts`):
```typescript
@/             -> src/
@/components   -> src/components/
@/game         -> src/game/
@/services     -> src/services/
@/types        -> src/types/
@/auth         -> src/auth/
@/utils        -> src/utils/
@/styles       -> src/styles/
@/assets       -> src/assets/
@/langs        -> src/langs/
@/menu         -> src/menu/
@/ui           -> src/ui.ts
```

## Key Technologies

### Frontend Stack
- TypeScript 5.3.2 (strict mode enabled)
- Vite 5.4.20 (build tool)
- Three.js 0.179.1 (primary 3D graphics)
- Babylon.js 8.23.1 (additional 3D rendering)
- Tailwind CSS (styling with custom configuration)

### Backend Stack
- Node.js with TypeScript
- Fastify 5.5.0 (web framework)
- Better SQLite3 (database)
- WebSocket (ws) for real-time features
- Docker & Docker Compose (containerization)

## Development Workflow

1. **Starting Development**: Use `make dev` to start both backend and frontend
2. **Frontend Only**: Use `make frontend-dev` for frontend-only development
3. **Backend Only**: Use `make backend-up-detached` for backend-only development
4. **Type Checking**: Run `make frontend-type-check` before committing changes
5. **Production Build**: Use `make frontend-build` to test production builds
6. **Debugging Backend**: Use `make backend-logs` to view real-time logs from all microservices

## Code Conventions

### Frontend
- Use TypeScript strict mode (enabled in tsconfig.json)
- Import using path aliases (e.g., `import { GameEngine } from '@/game'`)
- Follow existing component patterns in `Frontend/src/components/`
- 3D game logic should be placed in `Frontend/src/game/`
- Tournament logic lives in `Frontend/src/tournament/`

### Backend
- Each microservice follows Fastify patterns with TypeScript
- Use SQLite for data persistence via Better SQLite3
- JWT authentication is handled by the API gateway
- Real-time features use WebSocket through the realtime microservice
- Microservices communicate via HTTP requests using service URLs from environment variables

## Testing and Validation

- Run `make frontend-type-check` to validate TypeScript types
- Use `make status` to verify all services are running
- Check `make backend-logs` for debugging backend issues
- Frontend dev server has hot reload on port 5173
- Backend services have health check endpoints for monitoring

## Configuration Files

- `Frontend/Conf/vite.config.ts` - Vite build configuration with path aliases
- `Frontend/Conf/tsconfig.json` - TypeScript configuration with strict mode and path mappings
- `Backend/docker-compose.yml` - Microservices orchestration and service definitions
- `Makefile` - Development automation and commands
- `Frontend/src/styles/main.css` - Main CSS with Tailwind directives
- `Frontend/src/styles/tournament-new.css` - Tournament-specific styles

## Tournament System

The codebase includes extensive documentation for the tournament system, which has undergone multiple iterations of fixes and improvements:

### Documentation Files
- `TOURNAMENT_COMPLETE_FLOW.md` - Complete tournament flow and state management
- `TOURNAMENT_FLOW_DIAGRAM.md` - Visual flow diagrams
- `TOURNAMENT_BRACKET_WAITING_SCREEN.md` - Bracket UI and waiting screen details
- `CRITICAL_TOURNAMENT_FIX.md` - Critical fixes for player retention
- `TOURNAMENT_PLAYER_RETENTION_FIX.md` - Player retention during matches
- `TOURNAMENT_SYNC_FIX.md` - Real-time synchronization fixes
- `TOURNAMENT_REALTIME_BRACKET_FIX.md` - Real-time bracket updates
- `TOURNAMENT_WINNER_FLOW_COMPLETE.md` - Winner flow implementation
- `TOURNAMENT_WINNER_BLANK_SCREEN_FIX.md` - Winner screen rendering fixes
- `TOURNAMENT_WINNER_OVERLAY_FIX.md` - Winner overlay UI fixes
- `TOURNAMENT_HOST_LOSER_FIX.md` - Host and loser state handling
- `WINNER_VICTORY_MESSAGE_FIX.md` - Victory message display fixes
- `QUICK_TEST_GUIDE.md` - Testing guide for tournament features
- `BRACKET_VISUAL_EXAMPLE.txt` - Visual bracket structure examples

### Tournament Architecture
- `Frontend/src/tournament/NewTournamentService.ts` - Main tournament state management
- `Frontend/src/tournament/NewTournamentMatchCoordinator.ts` - Match coordination and progression
- `Frontend/src/tournament/TournamentBracket.ts` - Bracket rendering and visualization
- `Frontend/src/tournament/TournamentUI.ts` - Tournament UI components (60KB+ file)
- `Frontend/src/tournament/TournamentMatchService.ts` - Match-level service layer
- `Frontend/src/tournament/TournamentService.ts` - Legacy tournament service

### Key Tournament Concepts
- Tournament matches use the same `Pong3D` game engine but with `config.tournament = true`
- Winners wait on bracket screen; losers are eliminated
- Real-time updates via WebSocket to sync bracket state across players
- Auto-reload is **disabled** for tournament matches (critical fix)
- Victory overlays transition to bracket waiting screens after 2 seconds

## Current Development Focus

Based on recent git activity and documentation, active development areas include:
- Tournament system stability and edge case handling
- Real-time multiplayer synchronization improvements
- UI/UX refinements for tournament flow
- Winner/loser state management

When working on tournament features, always refer to the extensive markdown documentation files in the root directory for context on previous fixes and known issues.
