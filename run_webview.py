import webview
import sys
import threading
import time
from app import app

# Config
PORT = 5000
HOST = '127.0.0.1'

def start_server():
    """Starts the Flask server in a background thread."""
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)

if __name__ == '__main__':
    # 1. Start Flask in a generic thread
    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()

    # 2. Wait a bit for server to spin up
    time.sleep(2)

    # 3. Create a Fullscreen Window pointing to the local server
    # On Raspi, this uses WebKitGTK which is often lighter than Chromium
    webview.create_window(
        title='Jadwal Sholat',
        url=f'http://{HOST}:{PORT}',
        fullscreen=True,
        confirm_close=True
    )

    # 4. Start the GUI loop
    webview.start()
