#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOCAL_NODE="$DIR/node"
INDEX_JS="$DIR/index.js"
NODE_MODULES="$DIR/node_modules"

echo "======================================"
echo "   🚀 DeadDrop Offline (Linux)       "
echo "======================================"

# 1. Determine which Node to use
if [ -f "$LOCAL_NODE" ]; then
    NODE_BIN="$LOCAL_NODE"
    chmod +x "$NODE_BIN" 2>/dev/null
    echo "Using portable Node binary..."
elif command -v node &> /dev/null; then
    NODE_BIN="node"
    echo "Using system Node.js..."
else
    echo ""
    echo "[CRITICAL ERROR] Node.js not found!"
    echo "---------------------------------------------------"
    echo "Please install Node.js (apt install nodejs) or"
    echo "place a 'node' binary in the project folder."
    echo "---------------------------------------------------"
    exit 1
fi

# 2. Check for node_modules
if [ ! -d "$NODE_MODULES" ]; then
    echo "[WARNING] 'node_modules' missing. Attempting install..."
    if command -v npm &> /dev/null; then
        cd "$DIR" && npm install --production
    else
        echo "[ERROR] npm not found! Please run 'npm install' before transporting."
        exit 1
    fi
fi

# 3. Run Server
# Note: Root (sudo) is required for Port 80.
# If run as normal user, the app will auto-fallback to Port 3001.
"$NODE_BIN" "$INDEX_JS"
