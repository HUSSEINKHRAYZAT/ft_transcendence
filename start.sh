#!/usr/bin/env zsh
# ╔════════════════════════════════════════════════════════════════════════╗
# ║              FT TRANSCENDENCE - Interactive Launcher                   ║
# ║                    🎮 A Lime-Themed Pong Game 🎮                       ║
# ╚════════════════════════════════════════════════════════════════════════╝

# ==========================================
# Color Palette (Lime Theme)
# ==========================================
# Primary Colors
LIME='\033[38;5;154m'           # Bright Lime #84cc16
LIME_LIGHT='\033[38;5;155m'     # Light Lime #a3e635
LIME_DARK='\033[38;5;106m'      # Dark Lime #4d7c0f
DARK_GREEN='\033[38;5;28m'      # Dark Green #16a34a

# Status Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'

# Special Effects
BOLD='\033[1m'
DIM='\033[2m'
ITALIC='\033[3m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
REVERSE='\033[7m'
RESET='\033[0m'

# Background Colors
BG_LIME='\033[48;5;154m'
BG_DARK='\033[48;5;235m'
BG_BLACK='\033[40m'

# ==========================================
# Configuration
# ==========================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/Backend"
FRONTEND_DIR="$SCRIPT_DIR/Frontend"

# ==========================================
# ASCII Art Functions
# ==========================================
show_logo() {
    clear
    echo ""
    echo "${LIME}${BOLD}"
    echo "    ███████╗████████╗    ████████╗██████╗  █████╗ ███╗   ██╗███████╗"
    echo "    ██╔════╝╚══██╔══╝    ╚══██╔══╝██╔══██╗██╔══██╗████╗  ██║██╔════╝"
    echo "    █████╗     ██║          ██║   ██████╔╝███████║██╔██╗ ██║███████╗"
    echo "    ██╔══╝     ██║          ██║   ██╔══██╗██╔══██║██║╚██╗██║╚════██║"
    echo "    ██║        ██║          ██║   ██║  ██║██║  ██║██║ ╚████║███████║"
    echo "    ╚═╝        ╚═╝          ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝"
    echo "${RESET}"
    echo "${LIME_LIGHT}                    ╔═══════════════════════════════════╗${RESET}"
    echo "${LIME_LIGHT}                    ║   ${WHITE}🎮  PONG GAME LAUNCHER  🎮${LIME_LIGHT}   ║${RESET}"
    echo "${LIME_LIGHT}                    ╚═══════════════════════════════════╝${RESET}"
    echo ""
}

show_pong_animation() {
    local ball_pos=5
    local direction=1
    local paddle_left=2
    local paddle_right=68

    for i in {1..15}; do
        printf "\r${LIME}║${RESET}"

        # Left paddle
        for p in {0..2}; do
            if [ $((i % 4)) -eq $p ]; then
                printf "${LIME_DARK}█${RESET}"
            else
                printf " "
            fi
        done

        # Ball movement
        for ((j=0; j<60; j++)); do
            if [ $j -eq $ball_pos ]; then
                printf "${YELLOW}●${RESET}"
            else
                printf " "
            fi
        done

        # Right paddle
        for p in {0..2}; do
            if [ $((i % 4)) -eq $p ]; then
                printf "${LIME_DARK}█${RESET}"
            else
                printf " "
            fi
        done

        printf "${LIME}║${RESET}"

        # Update ball position
        ball_pos=$((ball_pos + direction * 4))
        if [ $ball_pos -ge 55 ] || [ $ball_pos -le 5 ]; then
            direction=$((direction * -1))
        fi

        sleep 0.05
    done
    printf "\n"
}

# ==========================================
# Status Check Functions
# ==========================================
check_docker() {
    if command -v docker &> /dev/null; then
        echo "${GREEN}✓${RESET}"
        return 0
    else
        echo "${RED}✗${RESET}"
        return 1
    fi
}


# ==========================================
# Progress Bar
# ==========================================
show_progress() {
    local duration=$1
    local message=$2
    local steps=50

    echo -n "${CYAN}${message}${RESET} ["

    for ((i=0; i<steps; i++)); do
        echo -n "${LIME}█${RESET}"
        sleep $(echo "scale=4; $duration/$steps" | bc)
    done

    echo "] ${GREEN}Done!${RESET}"
}

# ==========================================
# Spinner Animation
# ==========================================
spinner() {
    local pid=$1
    local message=$2
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0

    echo -n "${CYAN}${message}${RESET} "

    while kill -0 $pid 2>/dev/null; do
        i=$(( (i+1) %10 ))
        printf "\r${CYAN}${message}${RESET} ${LIME}${spin:$i:1}${RESET}"
        sleep 0.1
    done

    printf "\r${CYAN}${message}${RESET} ${GREEN}✓${RESET}\n"
}

# ==========================================
# Main Menu
# ==========================================
show_main_menu() {
    show_logo

    # Main Menu
    echo "${LIME_LIGHT}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${BOLD}${WHITE}MAIN MENU${RESET}                                                             ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}╠════════════════════════════════════════════════════════════════════════╣${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${YELLOW}${BOLD}🎓 42 EVALUATION${RESET}                                                     ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}1.${RESET} ${BOLD}Eval Mode${RESET}              ${GRAY}(Complete setup: setup→certs→build→up)${RESET} ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${LIME}${BOLD}🚀 QUICK START${RESET}                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}2.${RESET} Setup Project          ${GRAY}(First time setup)${RESET}                   ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}3.${RESET} Start All Services     ${GRAY}(Production mode - Containerized)${RESET}    ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}4.${RESET} Start Dev Mode         ${GRAY}(Backend + Local Vite)${RESET}               ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}5.${RESET} Stop All Services      ${GRAY}(Shutdown everything)${RESET}                ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${DARK_GREEN}${BOLD}🔧 MANAGEMENT${RESET}                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}6.${RESET} Build Services         ${GRAY}(Rebuild containers)${RESET}                 ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}7.${RESET} Restart Services       ${GRAY}(Quick restart)${RESET}                      ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}8.${RESET} View Logs              ${GRAY}(Monitor services)${RESET}                   ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}    ${WHITE}9.${RESET} Service Status         ${GRAY}(Detailed health check)${RESET}              ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${CYAN}${BOLD}🔐 CERTIFICATES${RESET}                                                       ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}10.${RESET} Generate Certificates  ${GRAY}(SSL/TLS setup)${RESET}                      ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${MAGENTA}${BOLD}📦 FRONTEND${RESET}                                                          ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}11.${RESET} Install Dependencies   ${GRAY}(npm install)${RESET}                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}12.${RESET} Build Frontend         ${GRAY}(Production build)${RESET}                   ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}13.${RESET} Start Vite Dev Server  ${GRAY}(Local development)${RESET}                 ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}  ${RED}${BOLD}🧹 CLEANUP${RESET}                                                           ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}14.${RESET} Clean All              ${GRAY}(Stop + Remove volumes)${RESET}              ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}15.${RESET} Deep Clean             ${GRAY}(Docker system prune)${RESET}                ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}   ${WHITE}0.${RESET}  Exit                   ${GRAY}(Close launcher)${RESET}                     ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}║${RESET}                                                                        ${LIME_LIGHT}║${RESET}"
    echo "${LIME_LIGHT}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -n "${LIME}${BOLD}➜${RESET} ${WHITE}Enter your choice:${RESET} "
}

# ==========================================
# Action Functions
# ==========================================
action_eval() {
    echo ""
    echo "${YELLOW}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${YELLOW}║${RESET}  ${BOLD}${WHITE}🎓 42 EVALUATION MODE - COMPLETE SETUP 🎓${RESET}                         ${YELLOW}║${RESET}"
    echo "${YELLOW}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo "${LIME}This will run the complete setup process:${RESET}"
    echo "  ${WHITE}1️⃣${RESET}  Setup project (certs + frontend npm install)"
    echo "  ${WHITE}2️⃣${RESET}  Generate certificates"
    echo "  ${WHITE}3️⃣${RESET}  Build all services"
    echo "  ${WHITE}4️⃣${RESET}  Start all services"
    echo ""
    echo "${MAGENTA}⏱️  This may take several minutes...${RESET}"
    echo ""
    echo -n "${YELLOW}${BOLD}Continue with evaluation setup? (y/n):${RESET} "
    read confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        generate_env
        echo ""
        show_pong_animation
        echo ""

        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        echo "${GREEN}${BOLD}Step 1/4: Running setup...${RESET}"
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        make setup

        echo ""
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        echo "${GREEN}${BOLD}Step 2/4: Generating certificates...${RESET}"
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        make certs

        echo ""
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        echo "${GREEN}${BOLD}Step 3/4: Building all services...${RESET}"
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        make build

        echo ""
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        echo "${GREEN}${BOLD}Step 4/4: Starting all services...${RESET}"
        echo "${LIME}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
        make up

        echo ""
        echo "${GREEN}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
        echo "${GREEN}║${RESET}  ${BOLD}${WHITE}✅ EVALUATION SETUP COMPLETE - READY FOR TESTING! ✅${RESET}           ${GREEN}║${RESET}"
        echo "${GREEN}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
        echo ""
        echo "${CYAN}📍 Access the application:${RESET}"
        echo "  ${LIME}Frontend:${RESET}   ${UNDERLINE}https://localhost:5173${RESET}"
        echo "  ${LIME}API:${RESET}        ${UNDERLINE}https://localhost:8080${RESET}"
        echo ""
        echo "${MAGENTA}💡 Useful commands:${RESET}"
        echo "  ${CYAN}Option 9${RESET}  - Check service health"
        echo "  ${CYAN}Option 8${RESET}  - View service logs"
        echo "  ${CYAN}Option 5${RESET}  - Stop all services"
        echo ""
    else
        echo ""
        echo "${YELLOW}❌ Evaluation setup cancelled${RESET}"
    fi

    pause
}

action_setup() {
    echo ""
    echo "${LIME}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${LIME}║${RESET}  ${BOLD}${WHITE}SETUP - First Time Configuration${RESET}                                  ${LIME}║${RESET}"
    echo "${LIME}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    show_pong_animation

    echo "${CYAN}📋 Running initial setup...${RESET}"
    echo ""

    make setup

    echo ""
    echo "${GREEN}✅ Setup complete!${RESET}"
    pause
}

action_start_all() {
    echo ""
    echo "${LIME}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${LIME}║${RESET}  ${BOLD}${WHITE}STARTING ALL SERVICES (Production Mode)${RESET}                          ${LIME}║${RESET}"
    echo "${LIME}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    generate_env

    make up &
    local pid=$!
    spinner $pid "Starting containers"
    wait $pid

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${GREEN}║${RESET}  ${BOLD}${WHITE}🎉 ALL SERVICES STARTED SUCCESSFULLY! 🎉${RESET}                          ${GREEN}║${RESET}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo "${CYAN}📍 Access URLs:${RESET}"
    echo "  ${LIME}Frontend:${RESET}   ${UNDERLINE}https://localhost:5173${RESET}"
    echo "  ${LIME}API:${RESET}        ${UNDERLINE}https://localhost:8080${RESET}"
    echo ""
    pause
}

action_dev_mode() {
    echo ""
    echo "${LIME}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${LIME}║${RESET}  ${BOLD}${WHITE}STARTING DEVELOPMENT MODE${RESET}                                         ${LIME}║${RESET}"
    echo "${LIME}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    echo "${CYAN}🔧 Starting backend services...${RESET}"
    make backend-up

    echo ""
    echo "${CYAN}⚡ Starting Vite dev server...${RESET}"
    echo "${YELLOW}💡 Press Ctrl+C to stop the dev server${RESET}"
    echo ""

    cd "$FRONTEND_DIR" && npm run dev
}

action_stop() {
    echo ""
    echo "${YELLOW}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${YELLOW}║${RESET}  ${BOLD}${WHITE}STOPPING ALL SERVICES${RESET}                                             ${YELLOW}║${RESET}"
    echo "${YELLOW}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    make down &
    local pid=$!
    spinner $pid "Stopping services"
    wait $pid

    echo ""
    echo "${GREEN}✅ All services stopped!${RESET}"
    pause
}

action_build() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${BLUE}║${RESET}  ${BOLD}${WHITE}BUILDING SERVICES${RESET}                                                  ${BLUE}║${RESET}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    make build

    echo ""
    echo "${GREEN}✅ Build complete!${RESET}"
    pause
}

action_restart() {
    echo ""
    echo "${CYAN}🔄 Restarting all services...${RESET}"
    echo ""

    make restart

    echo ""
    echo "${GREEN}✅ Services restarted!${RESET}"
    pause
}

action_logs() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${BLUE}║${RESET}  ${BOLD}${WHITE}SERVICE LOGS${RESET}                                                       ${BLUE}║${RESET}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo "${YELLOW}💡 Press Ctrl+C to exit logs${RESET}"
    echo ""

    make logs
}

action_status() {
    echo ""
    echo "${CYAN}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${CYAN}║${RESET}  ${BOLD}${WHITE}SERVICE STATUS${RESET}                                                     ${CYAN}║${RESET}"
    echo "${CYAN}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    make status

    echo ""
    make health

    pause
}

action_certs() {
    echo ""
    echo "${MAGENTA}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${MAGENTA}║${RESET}  ${BOLD}${WHITE}GENERATING CERTIFICATES${RESET}                                           ${MAGENTA}║${RESET}"
    echo "${MAGENTA}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    make certs

    echo ""
    echo "${GREEN}✅ Certificates generated!${RESET}"
    pause
}

action_frontend_install() {
    echo ""
    echo "${CYAN}📦 Installing frontend dependencies...${RESET}"
    echo ""

    make frontend-install

    echo ""
    echo "${GREEN}✅ Dependencies installed!${RESET}"
    pause
}

action_frontend_build() {
    echo ""
    echo "${BLUE}🔨 Building frontend...${RESET}"
    echo ""

    make frontend-build

    echo ""
    echo "${GREEN}✅ Frontend built!${RESET}"
    pause
}

action_frontend_dev() {
    echo ""
    echo "${LIME}⚡ Starting Vite development server...${RESET}"
    echo "${YELLOW}💡 Press Ctrl+C to stop${RESET}"
    echo ""

    cd "$FRONTEND_DIR" && npm run dev
}

action_clean() {
    echo ""
    echo "${RED}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${RED}║${RESET}  ${BOLD}${WHITE}CLEANING UP${RESET}                                                        ${RED}║${RESET}"
    echo "${RED}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    echo -n "${YELLOW}⚠️  This will stop all services and remove volumes. Continue? (y/N): ${RESET}"
    read confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        make clean
        echo ""
        echo "${GREEN}✅ Cleanup complete!${RESET}"
    else
        echo "${YELLOW}❌ Cancelled${RESET}"
    fi

    pause
}

action_prune() {
    echo ""
    echo "${RED}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
    echo "${RED}║${RESET}  ${BOLD}${WHITE}DEEP CLEAN (Docker System Prune)${RESET}                                  ${RED}║${RESET}"
    echo "${RED}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""

    echo -n "${RED}⚠️  WARNING: This will remove ALL unused Docker resources! Continue? (y/N): ${RESET}"
    read confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        make prune
        echo ""
        echo "${GREEN}✅ Deep clean complete!${RESET}"
    else
        echo "${YELLOW}❌ Cancelled${RESET}"
    fi

    pause
}

# ==========================================
# Utility Functions
# ==========================================
pause() {
    echo ""
    echo -n "${DIM}Press Enter to continue...${RESET}"
    read
}

invalid_choice() {
    echo ""
    echo "${RED}❌ Invalid choice. Please try again.${RESET}"
    sleep 1
}

generate_env() {
    echo "${CYAN}🔧 Generating .env file for Docker Compose...${RESET}"

    # Get machine IP
    IP_HOST=$(hostname -I | awk '{print $1}')

    # Path to .env in Backend
    ENV_FILE="./.env"

    # Write ALLOWED_REDIRECTS to .env
    cat >> "$ENV_FILE" << EOF
ALLOWED_REDIRECTS=https://localhost:5173,https://127.0.0.1:5173,https://$IP_HOST:5173
EOF

    echo "${GREEN}✅ .env file generated at $ENV_FILE with ALLOWED_REDIRECTS including localhost, 127.0.0.1 and $IP_HOST${RESET}"
}

# ==========================================
# Main Loop
# ==========================================
main() {
    while true; do
        show_main_menu
        read choice

        case $choice in
            1) action_eval ;;
            2) action_setup ;;
            3) action_start_all ;;
            4) action_dev_mode ;;
            5) action_stop ;;
            6) action_build ;;
            7) action_restart ;;
            8) action_logs ;;
            9) action_status ;;
            10) action_certs ;;
            11) action_frontend_install ;;
            12) action_frontend_build ;;
            13) action_frontend_dev ;;
            14) action_clean ;;
            15) action_prune ;;
            0)
                clear
                echo ""
                echo "${LIME}╔════════════════════════════════════════════════════════════════════════╗${RESET}"
                echo "${LIME}║${RESET}        ${BOLD}${WHITE}Thanks for using FT TRANSCENDENCE Launcher!${RESET}               ${LIME}║${RESET}"
                echo "${LIME}║${RESET}                    ${LIME_LIGHT}🎮 See you in the game! 🎮${RESET}                       ${LIME}║${RESET}"
                echo "${LIME}╚════════════════════════════════════════════════════════════════════════╝${RESET}"
                echo ""
                exit 0
                ;;
            *) invalid_choice ;;
        esac
    done
}

# ==========================================
# Entry Point
# ==========================================
main
