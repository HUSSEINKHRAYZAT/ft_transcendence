# FT Transcendence Project Makefile
# This Makefile helps manage the Backend (Docker) and Frontend (npm) services

# Detect docker-compose command (docker-compose or docker compose)
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
else
	DOCKER_COMPOSE := docker-compose
endif

.PHONY: all dev backend frontend backend-build backend-up backend-down backend-logs frontend-dev frontend-build frontend-preview clean help install

# Default target
all: help

# Development - Run both backend and frontend
dev:
	@make backend-up-detached
	@sleep 10
	@cd Backend && $(DOCKER_COMPOSE) ps > /dev/null
	@cd ..
	@cd Frontend && npm install
	@sleep 2
	@make frontend-dev

# Backend targets
backend: backend-up

backend-build:
	@cd Backend && $(DOCKER_COMPOSE) build > /dev/null

backend-up:
	@cd Backend && $(DOCKER_COMPOSE) up --build

backend-up-detached:
	@cd Backend && $(DOCKER_COMPOSE) up --build -d > /dev/null

backend-down:
	@cd Backend && $(DOCKER_COMPOSE) down > /dev/null

backend-logs:
	@cd Backend && $(DOCKER_COMPOSE) logs -f

backend-restart: backend-down backend-up

# Frontend targets
frontend: frontend-dev

frontend-install:
	@cd Frontend && npm install

frontend-dev:
	@cd Frontend && npm run dev

frontend-build:
	@cd Frontend && npm run build > /dev/null

frontend-preview:
	@cd Frontend && npm run preview

frontend-type-check:
	@cd Frontend && npm run type-check > /dev/null

# Installation targets
install: frontend-install backend-build

# Utility targets
clean:
	@cd Backend && $(DOCKER_COMPOSE) down --volumes --remove-orphans > /dev/null
	@cd Frontend && rm -rf node_modules dist 2>/dev/null || true
	@docker system prune -f > /dev/null

status:
	@echo "📊 Service Status:"
	@echo "Docker Compose Command: $(DOCKER_COMPOSE)"
	@echo "Backend containers:"
	@cd Backend && $(DOCKER_COMPOSE) ps
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
