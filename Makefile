# ==========================================
# FT Transcendence Project - Hybrid Makefile
# Backend: Containerized | Frontend: npm run dev
# ==========================================

.PHONY: all help setup certs build up down restart clean logs status \
        backend-build backend-up backend-down backend-logs backend-restart \
        frontend-dev frontend-install frontend-reinstall frontend-build frontend-preview \
        frontend-clean-console dev-build dev-up dev-down prune health check-docker launcher eval

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
	@echo "$(GREEN)✨ Interactive Launcher:$(RESET)"
	@echo "  $(YELLOW)make launcher$(RESET)           - 🎮 Launch interactive menu (recommended!)"
	@echo "  $(YELLOW)./start.sh$(RESET)              - Same as above"
	@echo ""
	@echo "$(YELLOW)🎓 42 Evaluation:$(RESET)"
	@echo "  $(YELLOW)make eval$(RESET)               - Complete setup for evaluation (setup→certs→build→up)"
	@echo ""
	@echo "$(GREEN)🚀 Quick Start:$(RESET)"
	@echo "  $(YELLOW)make setup$(RESET)              - Initial setup (certs + frontend npm install)"
	@echo "  $(YELLOW)make up$(RESET)                 - Start all services (containerized with nginx)"
	@echo "  $(YELLOW)make dev$(RESET)                - Start backend + local Vite dev server"
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
	@echo "  $(YELLOW)make frontend-dev$(RESET)        - Start local Vite dev server"
	@echo "  $(YELLOW)make frontend-down$(RESET)      - Stop local Vite dev server"
	@echo "  $(YELLOW)make frontend-install$(RESET)    - Install frontend dependencies"
	@echo "  $(YELLOW)make frontend-reinstall$(RESET) - Reinstall frontend dependencies"
	@echo "  $(YELLOW)make frontend-build$(RESET)     - Build frontend (in container)"
	@echo "  $(YELLOW)make frontend-clean-console$(RESET) - Remove all console.log statements"
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
	@echo "$(BLUE)💡 Example Workflows:$(RESET)"
	@echo "  $(MAGENTA)Production Mode (Nginx + Containers):$(RESET)"
	@echo "    1. $(CYAN)make setup$(RESET)    # First time setup"
	@echo "    2. $(CYAN)make up$(RESET)       # Start all containerized services"
	@echo "    3. $(CYAN)make status$(RESET)   # Check if everything is running"
	@echo ""
	@echo "  $(MAGENTA)Development Mode (Local Vite):$(RESET)"
	@echo "    1. $(CYAN)make setup$(RESET)    # First time setup"
	@echo "    2. $(CYAN)make dev$(RESET)      # Start backend + Vite dev server"
	@echo "    3. $(CYAN)make status$(RESET)   # Check backend services"
	@echo ""

# ==========================================
# Setup - Initial Project Setup
# ==========================================
setup: certs frontend-cert-setup frontend-install
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
	$(DOCKER_COMPOSE) build
	@echo "$(GREEN)✅ Backend services built!$(RESET)"

frontend-build:
	@echo "$(BLUE)🔨 Building frontend for production...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✅ Frontend built!$(RESET)"

# ==========================================
# Evaluation - Complete Setup for 42
# ==========================================
eval:
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║                   🎓 42 EVALUATION MODE - FULL SETUP 🎓                ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)This will run the complete setup process:$(RESET)"
	@echo "  1️⃣  Setup project (certs + frontend npm install)"
	@echo "  2️⃣  Generate certificates"
	@echo "  3️⃣  Build all services"
	@echo "  4️⃣  Start all services"
	@echo ""
	@echo "$(MAGENTA)⏱️  This may take a few minutes...$(RESET)"
	@echo ""
	@sleep 2
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)Step 1/4: Running setup...$(RESET)"
	@$(MAKE) setup
	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)Step 2/4: Generating certificates...$(RESET)"
	@$(MAKE) certs
	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)Step 3/4: Building all services...$(RESET)"
	@$(MAKE) build
	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)Step 4/4: Starting all services...$(RESET)"
	@$(MAKE) up
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║         ✅ EVALUATION SETUP COMPLETE - READY FOR TESTING! ✅           ║$(RESET)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(CYAN)📍 Access the application:$(RESET)"
	@echo "  $(YELLOW)Frontend:$(RESET) https://localhost:5173"
	@echo "  $(YELLOW)API:$(RESET)      https://localhost:8080"
	@echo "  $(YELLOW)Network:$(RESET)  https://$$(hostname -I | awk '{print $$1}'):5173"
	@echo ""
	@echo "$(MAGENTA)💡 Useful commands:$(RESET)"
	@echo "  $(CYAN)make status$(RESET)  - Check service health"
	@echo "  $(CYAN)make logs$(RESET)    - View service logs"
	@echo "  $(CYAN)make down$(RESET)    - Stop all services"
	@echo ""

# ==========================================
# Start Services
# ==========================================
up:
	@echo "$(BLUE)🚀 Starting all services (containerized)...$(RESET)"
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║                  🎉 ALL SERVICES STARTED SUCCESSFULLY! 🎉              ║$(RESET)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(CYAN)📍 Service URLs:$(RESET)"
	@echo "  $(YELLOW)Frontend (Nginx):$(RESET) https://localhost:5173"
	@echo "  $(YELLOW)API Gateway:$(RESET)     https://localhost:8080"
	@echo "  $(YELLOW)Network:$(RESET)          https://$$(hostname -I | awk '{print $$1}'):5173"
	@echo ""
	@echo "$(MAGENTA)💡 Tip: Use 'make logs' to view service logs$(RESET)"
	@echo "$(MAGENTA)💡 Tip: Use 'make status' to check service health$(RESET)"
	@echo "$(MAGENTA)💡 Tip: Use 'make dev' for local development with Vite$(RESET)"
	@echo ""

backend-up:
	@echo "$(BLUE)🐳 Starting backend services...$(RESET)"
	$(DOCKER_COMPOSE) up -d user_management socket_microservice game_microservice mailer session_microservice google_oauth2 realtime_microservice api_gateway
	@echo "$(GREEN)✅ Backend services started!$(RESET)"

# Local development mode (Vite dev server - NOT containerized)
dev: backend-up frontend-dev
	@echo ""
	@echo "$(GREEN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(GREEN)║              🎉 DEVELOPMENT MODE STARTED SUCCESSFULLY! 🎉              ║$(RESET)"
	@echo "$(GREEN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(CYAN)📍 Development URLs:$(RESET)"
	@echo "  $(YELLOW)Frontend (Vite):$(RESET) https://localhost:5173"
	@echo "  $(YELLOW)API Gateway:$(RESET)     https://localhost:8080"
	@echo "  $(YELLOW)Network:$(RESET)         https://$$(hostname -I | awk '{print $$1}'):5173"
	@echo ""
	@echo "$(YELLOW)⚠️  Note: In dev mode, you may see certificate warnings$(RESET)"
	@echo ""

frontend-dev:
	@echo "$(BLUE)⚡ Starting frontend development server (Vite)...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run dev

# ==========================================
# Stop Services
# ==========================================
down:
	@echo "$(YELLOW)🛑 Stopping all services...$(RESET)"
	$(DOCKER_COMPOSE) down
	@pkill -f "vite.*dev" 2>/dev/null || true
	@echo "$(GREEN)✅ All services stopped!$(RESET)"

backend-down:
	@echo "$(YELLOW)🛑 Stopping backend services...$(RESET)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✅ Backend services stopped!$(RESET)"

frontend-down:
	@echo "$(YELLOW)🛑 Stopping frontend development server (Vite)...$(RESET)"
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

frontend-clean-console:
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║           🧹 Removing Console Statements from Frontend 🧹             ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(YELLOW)This will remove all console.log, console.warn, and console.error$(RESET)"
	@echo "$(YELLOW)statements from your Frontend TypeScript/JavaScript files.$(RESET)"
	@echo ""
	@echo "$(MAGENTA)✓ A backup will be created automatically$(RESET)"
	@echo "$(MAGENTA)✓ Location: Frontend/backups/console-removal-TIMESTAMP/$(RESET)"
	@echo ""
	@if command -v python3 >/dev/null 2>&1; then \
		echo "$(GREEN)🐍 Using Python script (recommended)...$(RESET)"; \
		cd $(FRONTEND_DIR) && python3 scripts/remove-console-logs.py; \
	else \
		echo "$(YELLOW)⚠️  Python3 not found, using bash script...$(RESET)"; \
		cd $(FRONTEND_DIR) && bash scripts/remove-console-logs.sh; \
	fi

# ==========================================
# Logs
# ==========================================
logs:
	@echo "$(BLUE)📋 Showing backend logs...$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to exit$(RESET)"
	$(DOCKER_COMPOSE) logs -f

backend-logs:
	@echo "$(BLUE)📋 Showing backend logs...$(RESET)"
	$(DOCKER_COMPOSE) logs -f

frontend-logs:
	@echo "$(BLUE)📋 Showing frontend (nginx) logs...$(RESET)"
	$(DOCKER_COMPOSE) logs -f frontend

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
	$(DOCKER_COMPOSE) ps
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
	docker ps --filter "label=com.transcendence.service" --format "table {{.Names}}\t{{.Status}}"
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
	$(DOCKER_COMPOSE) down --volumes --remove-orphans
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

# ==========================================
# Interactive Launcher
# ==========================================
launcher:
	@./start.sh

