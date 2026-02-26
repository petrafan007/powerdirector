#!/bin/bash

# PowerDirector Preparation & Setup Script
# This script handles initial environmental setup, dependency installation, and port safety.

echo "==== PowerDirector Setup: Preparing Environment ===="

# 1. Dependency Checks
echo "[1/5] Checking system dependencies..."
for cmd in node npm lsof; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: $cmd is not installed. Please install it to proceed."
        exit 1
    fi
done
echo "System dependencies verified."

# 2. Environment Configuration
echo "[2/5] Configuring environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env from .env.example. PLEASE EDIT IT with your API keys."
    else
        touch .env
        echo "Created empty .env file."
    fi
else
    echo ".env file already exists."
fi

# 3. Port Safety
echo "[3/5] Performing port safety checks..."
if [ -f ./setup-ports.sh ]; then
    chmod +x ./setup-ports.sh
    ./setup-ports.sh
else
    echo "Warning: setup-ports.sh not found. Skipping."
fi

# 4. Dependency Installation
echo "[4/5] Installing project dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: npm install failed."
    exit 1
fi

# 5. Project Build
echo "[5/5] Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "Error: Build failed."
    exit 1
fi

echo "==== Setup Complete! ===="
echo "You can now start PowerDirector with: npm start"
