# FT Transcendence Project Makefile
# This Makefile helps manage the Backend (Docker) and Frontend (npm) services

.PHONY: all dev backend frontend backend-build backend-up backend-down backend-logs frontend-dev frontend-build frontend-preview clean help install

# Default target
all: help

# Development - Run both backend and frontend
dev:
	@echo "🚀 Starting Full Development Environment..."
	@make backend-up-detached
	@echo "⏳ Waiting for backend services to initialize..."
	@sleep 10
	@echo "📊 Backend service status:"
	@cd Backend && docker-compose ps
	@echo "⚡ Starting Frontend development server..."
	@make frontend-dev

# Backend targets
backend: backend-up

backend-build:
	@echo "🔨 Building Backend services..."
	@cd Backend && docker-compose build

backend-up:
	@echo "🐳 Starting Backend services..."
	@cd Backend && docker-compose up --build

backend-up-detached:
	@echo "🐳 Starting Backend services in background..."
	@cd Backend && docker-compose up --build -d

backend-down:
	@echo "🛑 Stopping Backend services..."
	@cd Backend && docker-compose down

backend-logs:
	@echo "📋 Showing Backend logs..."
	@cd Backend && docker-compose logs -f

backend-restart: backend-down backend-up

# Frontend targets
frontend: frontend-dev

frontend-install:
	@echo "📦 Installing Frontend dependencies..."
	@cd Frontend && npm install

frontend-dev:
	@echo "⚡ Starting Frontend development server..."
	@cd Frontend && npm run dev

frontend-build:
	@echo "🔨 Building Frontend for production..."
	@cd Frontend && npm run build

frontend-preview:
	@echo "👀 Starting Frontend preview server..."
	@cd Frontend && npm run preview

frontend-type-check:
	@echo "🔍 Type checking Frontend..."
	@cd Frontend && npm run type-check

# Installation targets
install: backend-build frontend-install
	@echo "✅ Installation complete!"

# Utility targets
clean:
	@echo "🧹 Cleaning up..."
	@cd Backend && docker-compose down --volumes --remove-orphans
	@cd Frontend && rm -rf node_modules dist
	@docker system prune -f

status:
	@echo "📊 Service Status:"
	@echo "Backend containers:"
	@cd Backend && docker-compose ps
	@echo "\nFrontend process:"
	@pgrep -f "vite.*dev" && echo "Frontend dev server is running" || echo "Frontend dev server is not running"

# Help target
help:
	@echo "🎮 FT Transcendence Project Commands"
	@echo "=================================="
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev              - Start both backend and frontend"
	@echo "  make install          - Install all dependencies"
	@echo ""
	@echo "🐳 Backend (Docker):"
	@echo "  make backend          - Start backend services"
	@echo "  make backend-build    - Build backend Docker images"
	@echo "  make backend-up       - Start backend services (foreground)"
	@echo "  make backend-up-detached - Start backend services (background)"
	@echo "  make backend-down     - Stop backend services"
	@echo "  make backend-logs     - Show backend logs"
	@echo "  make backend-restart  - Restart backend services"
	@echo ""
	@echo "⚡ Frontend (npm):"
	@echo "  make frontend         - Start frontend dev server"
	@echo "  make frontend-install - Install frontend dependencies"
	@echo "  make frontend-dev     - Start frontend development server"
	@echo "  make frontend-build   - Build frontend for production"
	@echo "  make frontend-preview - Preview production build"
	@echo "  make frontend-type-check - Run TypeScript type checking"
	@echo ""
	@echo "🛠️  Utilities:"
	@echo "  make clean            - Clean up containers and dependencies"
	@echo "  make status           - Show service status"
	@echo "  make help             - Show this help message"
	@echo ""
	@echo "💡 Examples:"
	@echo "  make dev              # Start full development environment"
	@echo "  make backend-up-detached && make frontend-dev  # Start backend in bg, frontend in fg"
