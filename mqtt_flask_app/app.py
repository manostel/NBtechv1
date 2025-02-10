from flask import Flask, jsonify, request
from flask_cors import CORS  # ✅ Import CORS
from mqtt_client import MQTTClient
from database import insert_data, fetch_latest_data, fetch_last_100_data

app = Flask(__name__)
CORS(app)  # ✅ Allow requests from any frontend (localhost:3000)

# MQTT Configuration
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "NBtechv1/data"

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

### 📌 PUBLISH MQTT MESSAGE
@app.route('/publish', methods=['POST'])
def publish_message():
    data = request.json
    topic = data.get("topic", MQTT_TOPIC)
    message = data.get("message", "")

    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    mqtt_client.publish(topic, message)
    return jsonify({"status": "Message published", "topic": topic, "message": message})

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
