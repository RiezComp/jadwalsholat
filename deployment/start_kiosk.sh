#!/bin/bash

# Configuration
APP_DIR="$HOME/jadwalsholat" # Automatically uses the current user's home directory
PORT=5000

# 1. Disable Screen Blanking (Prevent sleeping)
xset s noblank
xset s off
xset -dpms

# 2. Hide Mouse Cursor (requires 'unclutter' to be installed)
# unclutter -idle 0 &

# 3. Start Python Backend
cd $APP_DIR
# Kill any existing instance just in case
pkill -f "python app.py"
# Start in background
python app.py &

# Wait for server to start
sleep 5

# 4. Start Chromium in Kiosk Mode
# Try 'chromium' first, then 'chromium-browser', then 'firefox'
BROWSER="chromium"

if ! command -v chromium &> /dev/null; then
    if command -v chromium-browser &> /dev/null; then
        BROWSER="chromium-browser"
    elif command -v firefox &> /dev/null; then
        BROWSER="firefox"
    elif command -v firefox-esr &> /dev/null; then
        BROWSER="firefox-esr"
    fi
fi

if [[ "$BROWSER" == *"firefox"* ]]; then
    # Firefox Kiosk flags
    $BROWSER --kiosk http://localhost:$PORT
else
    # Chromium Kiosk flags
    $BROWSER \
        --noerrdialogs \
        --disable-infobars \
        --kiosk \
        http://localhost:$PORT \
        --incognito \
        --check-for-update-interval=31536000
fi
