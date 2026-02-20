#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_BIN="$DIR/node"
INDEX_JS="$DIR/index.js"
NODE_MODULES="$DIR/node_modules"

echo "Starting DeadDrop Offline..."

# 1. Check for Node.js Binary
if [ ! -f "$NODE_BIN" ]; then
    echo ""
    echo "[CRITICAL ERROR] 'node' binary is MISSING!"
    echo "---------------------------------------------------"
    echo "Please download the Node.js Linux binary"
    echo "and place it in this folder:"
    echo "$DIR"
    echo "---------------------------------------------------"
    exit 1
fi

# 2. Check for node_modules
if [ ! -d "$NODE_MODULES" ]; then
    echo ""
    echo "[WARNING] 'node_modules' folder is MISSING!"
    echo "Attempting to install via system npm..."
    if command -v npm &> /dev/null; then
        npm install
    else
        echo "[ERROR] npm not found. Please run 'npm install' manually"
        echo "before copying to the USB drive."
        exit 1
    fi
fi

# 3. Ensure Execution Permissions
chmod +x "$NODE_BIN"

# 4. Run Server
"$NODE_BIN" "$INDEX_JS"
