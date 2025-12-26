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

# 3. Start Application (Lightweight WebView)
cd $APP_DIR
# Run the wrapper script which handles Flask server + GUI window
python3 run_webview.py
