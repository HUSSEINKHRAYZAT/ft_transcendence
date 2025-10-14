# ===============================
# FT Transcendence Project Makefile
# Handles Backend (Docker) and Frontend (npm) services with HTTPS setup
# ===============================

MAKEFLAGS += --no-print-directory

# Detect docker-compose command (docker-compose or docker compose)
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
else
	DOCKER_COMPOSE := docker-compose
endif

.PHONY: all dev backend frontend backend-build backend-up backend-down backend-logs frontend-dev frontend-build frontend-preview frontend-reinstall clean help install secure check-certs status

# ========================
# SSL certificate settings
# ========================
CERT_DIR := Frontend/cert
CERT_KEY := $(CERT_DIR)/key.pem
CERT_FILE := $(CERT_DIR)/cert.pem

# Create self-signed HTTPS certificate (valid for 1 year)
secure:
	@echo "🔐 Generating HTTPS certificates for Frontend..."
	@mkdir -p $(CERT_DIR)
	@openssl req -x509 -newkey rsa:2048 -keyout $(CERT_KEY) -out $(CERT_FILE) -days 365 -nodes -subj "/CN=localhost"
	@echo "✅ HTTPS certificates created at $(CERT_DIR)/"

# Check for existing certs or create if missing
check-certs:
	@if [ ! -f "$(CERT_KEY)" ] || [ ! -f "$(CERT_FILE)" ]; then \
		echo "🔐 HTTPS certificates not found — creating them..."; \
		$(MAKE) secure; \
	else \
		echo "✅ HTTPS certificates already exist."; \
	fi

# ========================
# Default target
# ========================
all: help

# ========================
# Development - Run both backend and frontend
# ========================
dev:
	@$(MAKE) check-certs
	@echo "🧹 Cleaning up Docker containers..."
	@sudo docker stop $$(sudo docker ps -q) 2>/dev/null 1>/dev/null || true
	@sudo docker rm -f $$(sudo docker ps -aq) 2>/dev/null 1>/dev/null || true
	@echo "🐳 Starting backend services..."
	@cd Backend && $(DOCKER_COMPOSE) up --build -d >/dev/null 2>&1
	@sleep 10
	@if [ ! -d "Frontend/node_modules" ]; then \
		echo "📦 Installing frontend dependencies..."; \
		cd Frontend && npm install --silent >/dev/null 2>&1; \
	fi
	@sleep 2
	@echo "✅ Services ready! Starting frontend..."
	@make frontend-dev

# ========================
# Backend targets
# ========================
backend: backend-up

backend-build:
	@echo "🔨 Building backend services..."
	@cd Backend && $(DOCKER_COMPOSE) build >/dev/null 2>&1
	@echo "✅ Backend build complete"

backend-up:
	@echo "🐳 Starting backend services (foreground)..."
	@cd Backend && $(DOCKER_COMPOSE) up --build

backend-up-detached:
	@echo "🐳 Starting backend services (background)..."
	@cd Backend && $(DOCKER_COMPOSE) up --build -d >/dev/null 2>&1
	@echo "✅ Backend services started"

backend-down:
	@echo "🛑 Stopping backend services..."
	@cd Backend && $(DOCKER_COMPOSE) down >/dev/null 2>&1
	@echo "✅ Backend services stopped"

backend-logs:
	@cd Backend && $(DOCKER_COMPOSE) logs -f

backend-restart: backend-down backend-up

# ========================
# Frontend targets
# ========================
frontend: frontend-dev

frontend-install:
	@if [ ! -d "Frontend/node_modules" ]; then \
		echo "📦 Installing frontend dependencies..."; \
		cd Frontend && npm install; \
	else \
		echo "✅ Frontend dependencies already installed (use 'make frontend-reinstall' to force reinstall)"; \
	fi

frontend-reinstall:
	@echo "🔄 Reinstalling frontend dependencies..."
	@cd Frontend && rm -rf node_modules package-lock.json && npm install --silent

frontend-dev:
	@cd Frontend && npm run dev

frontend-build:
	@echo "🔨 Building frontend..."
	@cd Frontend && npm run build >/dev/null 2>&1
	@echo "✅ Frontend build complete"

frontend-preview:
	@cd Frontend && npm run preview

frontend-type-check:
	@echo "🔍 Running type checks..."
	@cd Frontend && npm run type-check >/dev/null 2>&1
	@echo "✅ Type check complete"

# ========================
# Installation targets
# ========================
install: frontend-install backend-build

# ========================
# Utility targets
# ========================
clean:
	@echo "🧹 Cleaning up all services..."
	@cd Backend && $(DOCKER_COMPOSE) down --volumes --remove-orphans >/dev/null 2>&1
	@cd Frontend && rm -rf node_modules dist 2>/dev/null || true
	@docker system prune -f >/dev/null 2>&1
	@echo "✅ Cleanup complete"

status:
	@echo "📊 Service Status:"
	@echo "Docker Compose Command: $(DOCKER_COMPOSE)"
	@echo "Backend containers:"
	@cd Backend && $(DOCKER_COMPOSE) ps
	@echo "\nFrontend process:"
	@pgrep -f "vite.*dev" && echo "Frontend dev server is running" || echo "Frontend dev server is not running"

# ========================
# Help target
# ========================
help:
	@echo "🎮 FT Transcendence Project Commands"
	@echo "==========================================================================================================="
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev              				- Start both backend and frontend (auto HTTPS)"
	@echo "  make install          				- Install all dependencies"
	@echo ""
	@echo "🔐 Security:"
	@echo "  make secure           				- Generate HTTPS certs manually"
	@echo ""
	@echo "🐳 Backend (Docker):"
	@echo "  make backend          				- Start backend services"
	@echo "  make backend-build    				- Build backend Docker images"
	@echo "  make backend-up       				- Start backend services (foreground)"
	@echo "  make backend-up-detached				- Start backend services (background)"
	@echo "  make backend-down     				- Stop backend services"
	@echo "  make backend-logs     				- Show backend logs"
	@echo "  make backend-restart  				- Restart backend services"
	@echo ""
	@echo "⚡ Frontend (npm):"
	@echo "  make frontend         				- Start frontend dev server"
	@echo "  make frontend-install 				- Install frontend dependencies"
	@echo "  make frontend-dev     				- Start frontend development server"
	@echo "  make frontend-build   				- Build frontend for production"
	@echo "  make frontend-preview 				- Preview production build"
	@echo "  make frontend-type-check 				- Run TypeScript type checking"
	@echo ""
	@echo "🛠️  Utilities:"
	@echo "  make clean            				- Clean up containers and dependencies"
	@echo "  make status           				- Show service status"
	@echo "  make help             				- Show this help message"
	@echo ""
	@echo "💡 Examples:"
	@echo "  make dev              				# Start full development environment (auto HTTPS)"
	@echo "  make secure           				# Generate HTTPS certs manually"
	@echo "  make backend-up-detached && make frontend-dev  	# Start backend in bg, frontend in fg"
