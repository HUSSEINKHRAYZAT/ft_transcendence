#!/bin/bash

# FT Transcendence Multiplayer Server Startup Script

set -e

echo "🚀 Starting FT Transcendence Multiplayer Server"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) detected ✓"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_status "npm $(npm --version) detected ✓"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_status "Dependencies installed ✓"
else
    print_status "Dependencies already installed ✓"
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = " " ]; then
    SERVER_IP="localhost"
fi

print_status "Server will run on: http://localhost:3001"
if [ "$SERVER_IP" != "localhost" ]; then
    print_status "Remote access: http://$SERVER_IP:3001"
fi

echo ""
print_warning "For remote multiplayer, share this information:"
print_warning "• Local network: http://$SERVER_IP:3001"
print_warning "• Ensure port 3001 is accessible through firewall"
echo ""

# Check if port 3001 is already in use
if command -v lsof &> /dev/null; then
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_error "Port 3001 is already in use. Please stop the existing service."
        print_error "To kill existing process: lsof -ti:3001 | xargs kill -9"
        exit 1
    fi
fi

print_status "Starting multiplayer server..."
echo ""

# Start the server
npm start