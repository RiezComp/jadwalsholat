from flask import Flask, render_template, jsonify
from prayer_service import PrayerService
import json

app = Flask(__name__)
service = PrayerService()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/schedule')
def get_schedule():
    data = service.get_schedule()
    if data:
        return jsonify({"status": "success", "data": data})
    else:
        # If cache missing/fetch failed, we might want to return something or handle error
        # For now, let's just return empty and let frontend handle retry
        return jsonify({"status": "error", "message": "Could not fetch schedule"}), 500

@app.route('/api/config')
def get_config():
    # Reload config in case it changed (optional, but good for tweaking without restart)
    # in production we might not do this every request
    with open('config.json', 'r') as f:
        config = json.load(f)
    return jsonify(config)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
