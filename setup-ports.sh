#!/bin/bash

# Configuration
PORTS=(4007 4008)

for PORT in "${PORTS[@]}"; do
    echo "[Port Safety] Checking for processes on port $PORT..."

    # Check if lsof is available
    if ! command -v lsof &> /dev/null; then
        echo "[Error] lsof command not found. Please install lsof."
        exit 1
    fi

    # Find PID usage on port
    PID=$(lsof -t -i:$PORT)

    if [ -z "$PID" ]; then
        echo "[Port Safety] Port $PORT is free."
    else
        echo "[Port Safety] Port $PORT is occupied by PID $PID."
        PROCESS_NAME=$(ps -p $PID -o comm=)
        echo "[Port Safety] Process name: $PROCESS_NAME"
        
        # Try to kill it
        echo "[Port Safety] Attempting to kill PID $PID..."
        kill -9 $PID 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "[Port Safety] Successfully killed PID $PID."
        else
            echo "[Port Safety] Failed to kill PID $PID (likely requires sudo)."
            echo "[Action Required] Please run: sudo kill -9 $PID"
            exit 1
        fi
    fi
done
exit 0
