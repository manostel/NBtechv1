from flask import Flask, jsonify, request
from flask_cors import CORS  # ✅ Import CORS
from mqtt_client import MQTTClient
from database import insert_data, fetch_latest_data, fetch_last_100_data, fetch_last_timestamp  # ✅ Import fetch_last_timestamp
import json  # ✅ Import JSON module



app = Flask(__name__)
CORS(app)  # ✅ Allow requests from any frontend (localhost:3000)

# MQTT Configuration
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "NBtechv1/data"
MQTT_COMMAND_TOPIC = "NBtechv1/command"
MQTT_RESPONSE_TOPIC = "NBtechv1/response"

# Initialize MQTT Client
mqtt_client = MQTTClient(MQTT_BROKER, MQTT_PORT, MQTT_TOPIC)
mqtt_client.connect()

@app.route('/')
def index():
    return jsonify({"status": "Backend Running", "message": "Welcome to the IoT Backend"})

### 📌 GET LATEST MESSAGES
@app.route('/messages', methods=['GET'])
def get_messages():
    limit = request.args.get('limit', 10, type=int)
    messages = fetch_latest_data(limit)
    return jsonify(messages)

### 📌 GET LAST 100 DATA POINTS (Fixes CORS)
@app.route('/last-100', methods=['GET'])
def get_last_100():
    messages = fetch_last_100_data()
    response = jsonify(messages)
    response.headers.add("Access-Control-Allow-Origin", "*")  # ✅ CORS Fix
    return response

@app.route('/device-status', methods=['GET'])
def device_status():
    """Check if the device is online or offline based on the last timestamp."""
    last_timestamp = fetch_last_timestamp()
    
    if last_timestamp:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        last_seen = datetime.strptime(last_timestamp, "%Y-%m-%dT%H:%M:%SZ")  # Adjust format if needed
        
        # ✅ Define "Offline" threshold (e.g., 30 seconds without new data)
        offline_threshold = now - timedelta(seconds=30) 

        status = "Online" if last_seen >= offline_threshold else "Offline"
        
        # ✅ Format the timestamp to remove 'T' and 'Z'
        formatted_last_seen = last_seen.strftime("%Y-%m-%d %H:%M:%S")
        
        return jsonify({"status": status, "last_seen": formatted_last_seen})
    else:
        return jsonify({"status": "Offline", "last_seen": "No Data"})

@app.route('/publish', methods=['POST'])
def publish_message():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON received"}), 400

        print("Received Publish Request:", data)

        topic = data.get("topic", MQTT_TOPIC)
        message = data.get("message", "")

        if not message:
            return jsonify({"error": "Message cannot be empty"}), 400

        # ✅ Convert message into a JSON string
        mqtt_message = json.dumps({"command": message})

        mqtt_client.publish(topic, mqtt_message)  # ✅ Publish as JSON string
        return jsonify({"status": "Message published", "topic": topic, "message": mqtt_message})

    except Exception as e:
        print("Error processing request:", str(e))
        return jsonify({"error": "Server error"}), 500

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
