# ==========================================
# FT Transcendence Project - Hybrid Makefile
# Backend: Containerized | Frontend: npm run dev
# ==========================================

.PHONY: all help setup certs build up down restart clean logs status \
        backend-build backend-up backend-down backend-logs backend-restart \
        frontend-dev frontend-install frontend-reinstall frontend-build frontend-preview \
        dev-build dev-up dev-down prune health check-docker

MAKEFLAGS += --no-print-directory

# ==========================================
# Color Codes for Pretty Output
# ==========================================
RED     := \033[0;31m
GREEN   := \033[0;32m
YELLOW  := \033[0;33m
BLUE    := \033[0;34m
MAGENTA := \033[0;35m
CYAN    := \033[0;36m
RESET   := \033[0m

# ==========================================
# Docker Compose Detection
# ==========================================
# Prefer Docker Compose V2 (docker compose) over V1 (docker-compose)
# V2 is the modern plugin-based version that doesn't have Python dependency issues
DOCKER_COMPOSE_V2 := $(shell docker compose version 2> /dev/null)
ifdef DOCKER_COMPOSE_V2
	DOCKER_COMPOSE := docker compose
else
	DOCKER_COMPOSE_V1 := $(shell command -v docker-compose 2> /dev/null)
	ifdef DOCKER_COMPOSE_V1
		DOCKER_COMPOSE := docker-compose
	else
		$(error Neither 'docker compose' nor 'docker-compose' found. Please install Docker Compose)
	endif
endif

# ==========================================
# Directory Paths
# ==========================================
BACKEND_DIR  := Backend
FRONTEND_DIR := Frontend
CERTS_DIR    := $(BACKEND_DIR)/certs

# ==========================================
# Default Target
# ==========================================
all: help

# ==========================================
# Help - Display Available Commands
# ==========================================
help:
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║        FT TRANSCENDENCE - PRODUCTION DEPLOYMENT COMMANDS               ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)🚀 Quick Start:$(RESET)"
	@echo "  $(YELLOW)make setup$(RESET)              - Initial setup (generate certificates)"
	@echo "  $(YELLOW)make up$(RESET)                 - Start all services (backend + frontend)"
	@echo "  $(YELLOW)make down$(RESET)               - Stop all services"
	@echo "  $(YELLOW)make restart$(RESET)            - Restart all services"
	@echo ""
	@echo "$(GREEN)🔐 Certificate Management:$(RESET)"
	@echo "  $(YELLOW)make certs$(RESET)              - Generate SSL/TLS certificates"
	@echo ""
	@echo "$(GREEN)🏗️  Build Commands:$(RESET)"
	@echo "  $(YELLOW)make build$(RESET)              - Build backend + frontend production"
	@echo "  $(YELLOW)make backend-build$(RESET)      - Build only backend services"
	@echo "  $(YELLOW)make frontend-build$(RESET)     - Build frontend for production"
	@echo ""
	@echo "$(GREEN)🐳 Backend Control:$(RESET)"
	@echo "  $(YELLOW)make backend-up$(RESET)         - Start backend services"
	@echo "  $(YELLOW)make backend-down$(RESET)       - Stop backend services"
	@echo "  $(YELLOW)make backend-restart$(RESET)    - Restart backend services"
	@echo ""
	@echo "$(GREEN)⚡ Frontend Control:$(RESET)"
	@echo "  $(YELLOW)make frontend-dev$(RESET)        - Start frontend dev server"
	@echo "  $(YELLOW)make frontend-down$(RESET)      - Stop frontend dev server"
	@echo "  $(YELLOW)make frontend-install$(RESET)    - Install frontend dependencies"
	@echo "  $(YELLOW)make frontend-reinstall$(RESET) - Reinstall frontend dependencies"
	@echo "  $(YELLOW)make frontend-preview$(RESET)    - Preview production build"
	@echo ""
	@echo "$(GREEN)📊 Monitoring:$(RESET)"
	@echo "  $(YELLOW)make logs$(RESET)               - View all service logs"
	@echo "  $(YELLOW)make backend-logs$(RESET)       - View backend logs"
	@echo "  $(YELLOW)make frontend-logs$(RESET)      - View frontend logs"
	@echo "  $(YELLOW)make status$(RESET)             - Show service status"
	@echo "  $(YELLOW)make health$(RESET)             - Check service health"
	@echo "  $(YELLOW)make check-docker$(RESET)       - Verify Docker Compose installation"
	@echo ""
	@echo "$(GREEN)🧹 Cleanup:$(RESET)"
	@echo "  $(YELLOW)make clean$(RESET)              - Stop services and remove volumes"
	@echo "  $(YELLOW)make prune$(RESET)              - Deep clean (remove all unused Docker resources)"
	@echo ""
	@echo "$(BLUE)💡 Example Workflow:$(RESET)"
	@echo "  1. $(CYAN)make setup$(RESET)    # First time setup"
	@echo "  2. $(CYAN)make up$(RESET)       # Start backend + frontend dev"
	@echo "  3. $(CYAN)make status$(RESET)   # Check if everything is running"
	@echo ""

# ==========================================
# Setup - Initial Project Setup
# ==========================================
setup: certs frontend-cert-setup
	@echo "$(GREEN)✅ Setup complete! Ready to build and deploy.$(RESET)"

frontend-cert-setup:
	@echo "$(BLUE)🔐 Setting up frontend certificates...$(RESET)"
	@mkdir -p $(FRONTEND_DIR)/cert
	@if [ -f $(CERTS_DIR)/services/frontend/server.crt ]; then \
		cp $(CERTS_DIR)/services/frontend/server.crt $(FRONTEND_DIR)/cert/cert.pem; \
		cp $(CERTS_DIR)/services/frontend/server.key $(FRONTEND_DIR)/cert/key.pem; \
		echo "$(GREEN)✅ Frontend certificates copied!$(RESET)"; \
	else \
		echo "$(YELLOW)⚠️  Frontend certificates not found. Run 'make certs' first.$(RESET)"; \
	fi

# ==========================================
# Certificate Generation
# ==========================================
certs:
	@echo "$(BLUE)🔐 Generating SSL/TLS certificates...$(RESET)"
	@if [ -f "$(CERTS_DIR)/ca/ca.key" ]; then \
		echo "$(YELLOW)⚠️  Certificates already exist. Skipping generation.$(RESET)"; \
		echo "$(YELLOW)   Delete $(CERTS_DIR)/ca/ca.key to regenerate.$(RESET)"; \
	else \
		chmod +x $(CERTS_DIR)/generate-certs.sh; \
		cd $(CERTS_DIR) && ./generate-certs.sh; \
		echo "$(GREEN)✅ Certificates generated successfully!$(RESET)"; \
	fi

# ==========================================
# Build Commands
# ==========================================
build: backend-build frontend-build
	@echo "$(GREEN)✅ All services built successfully!$(RESET)"

backend-build:
	@echo "$(BLUE)🔨 Building backend services...$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) build
	@echo "$(GREEN)✅ Backend services built!$(RESET)"

frontend-build:
	@echo "$(BLUE)🔨 Building frontend for production...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✅ Frontend built!$(RESET)"

# ==========================================
# Start Services
# ==========================================
up: backend-up frontend-dev
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║                  🎉 ALL SERVICES STARTED SUCCESSFULLY! 🎉              ║$(RESET)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(CYAN)📍 Service URLs:$(RESET)"
	@echo "  $(YELLOW)Frontend:$(RESET)      https://localhost:5173"
	@echo "  $(YELLOW)API Gateway:$(RESET)   https://localhost:8080"
	@echo ""
	@echo "$(MAGENTA)💡 Tip: Use 'make logs' to view service logs$(RESET)"
	@echo "$(MAGENTA)💡 Tip: Use 'make status' to check service health$(RESET)"
	@echo ""

backend-up:
	@echo "$(BLUE)🐳 Starting backend services...$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✅ Backend services started!$(RESET)"

frontend-dev:
	@echo "$(BLUE)⚡ Starting frontend development server...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run dev

# ==========================================
# Stop Services
# ==========================================
down: backend-down frontend-down
	@echo "$(GREEN)✅ All services stopped!$(RESET)"

backend-down:
	@echo "$(YELLOW)🛑 Stopping backend services...$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) down
	@echo "$(GREEN)✅ Backend services stopped!$(RESET)"

frontend-down:
	@echo "$(YELLOW)🛑 Stopping frontend development server...$(RESET)"
	@pkill -f "vite.*dev" || true
	@echo "$(GREEN)✅ Frontend development server stopped!$(RESET)"

# ==========================================
# Restart Services
# ==========================================
restart: down up

backend-restart: backend-down backend-up

frontend-restart: frontend-down frontend-dev

# ==========================================
# Frontend Commands
# ==========================================
frontend-install:
	@echo "$(BLUE)📦 Installing frontend dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✅ Frontend dependencies installed!$(RESET)"

frontend-reinstall:
	@echo "$(BLUE)🔄 Reinstalling frontend dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && rm -rf node_modules package-lock.json && npm install
	@echo "$(GREEN)✅ Frontend dependencies reinstalled!$(RESET)"

frontend-preview:
	@echo "$(BLUE)👀 Starting frontend preview server...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run preview

# ==========================================
# Logs
# ==========================================
logs:
	@echo "$(BLUE)📋 Showing backend logs...$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to exit$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) logs -f

backend-logs:
	@echo "$(BLUE)📋 Showing backend logs...$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) logs -f

frontend-logs:
	@echo "$(BLUE)📋 Frontend runs in development mode - check terminal output$(RESET)"
	@echo "$(YELLOW)Frontend logs are shown in the terminal where 'make up' was run$(RESET)"

# ==========================================
# Status and Health
# ==========================================
status:
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║                        SERVICE STATUS REPORT                           ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)🔧 Docker Compose Command:$(RESET) $(DOCKER_COMPOSE)"
	@echo ""
	@echo "$(GREEN)📦 Backend Services:$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) ps
	@echo ""
	@echo "$(GREEN)🎨 Frontend Service:$(RESET)"
	@if pgrep -f "vite.*dev" > /dev/null; then \
		echo "  ✅ Frontend dev server is running"; \
	else \
		echo "  ❌ Frontend dev server is not running"; \
	fi
	@echo ""

health:
	@echo "$(BLUE)🏥 Checking service health...$(RESET)"
	@echo ""
	@echo "$(CYAN)Backend Services:$(RESET)"
	@cd $(BACKEND_DIR) && docker ps --filter "label=com.transcendence.service" --format "table {{.Names}}\t{{.Status}}"
	@echo ""
	@echo "$(CYAN)Frontend Service:$(RESET)"
	@if pgrep -f "vite.*dev" > /dev/null; then \
		echo "  ✅ Frontend dev server is running"; \
	else \
		echo "  ❌ Frontend dev server is not running"; \
	fi
	@echo ""

# ==========================================
# Cleanup Commands
# ==========================================
clean:
	@echo "$(RED)🧹 Cleaning up all services and volumes...$(RESET)"
	@cd $(BACKEND_DIR) && $(DOCKER_COMPOSE) down --volumes --remove-orphans
	@pkill -f "vite.*dev" || true
	@cd $(FRONTEND_DIR) && rm -rf node_modules dist 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete!$(RESET)"

prune: clean
	@echo "$(RED)🧹 Performing deep clean (removing unused Docker resources)...$(RESET)"
	@docker system prune -af --volumes
	@echo "$(GREEN)✅ Deep clean complete!$(RESET)"

# ==========================================
# Development Shortcuts
# ==========================================
dev-build: certs build

dev-up: dev-build up

dev-down: down

# ==========================================
# Advanced Commands
# ==========================================
rebuild: clean build up

rebuild-backend: backend-down backend-build backend-up

rebuild-frontend: frontend-down frontend-build frontend-up

# ==========================================
# Docker Compose Verification
# ==========================================
check-docker:
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║                  DOCKER COMPOSE VERIFICATION                           ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)🔍 Detected Docker Compose Command:$(RESET) $(DOCKER_COMPOSE)"
	@echo ""
	@echo "$(CYAN)Version Information:$(RESET)"
	@$(DOCKER_COMPOSE) version
	@echo ""
	@echo "$(CYAN)Docker Information:$(RESET)"
	@docker --version
	@echo ""
	@if [ "$(DOCKER_COMPOSE)" = "docker-compose" ]; then \
		echo "$(YELLOW)⚠️  WARNING: Using legacy docker-compose (V1)$(RESET)"; \
		echo "$(YELLOW)   This may cause issues with Python 3.12+$(RESET)"; \
		echo ""; \
		echo "$(GREEN)💡 Recommendation: Install Docker Compose V2$(RESET)"; \
		echo "   Visit: https://docs.docker.com/compose/install/"; \
		echo ""; \
	else \
		echo "$(GREEN)✅ Using modern Docker Compose V2 (recommended)$(RESET)"; \
	fi
