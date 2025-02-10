# app.py
from flask import Flask, jsonify, render_template, request
from mqtt_client import MQTTClient

app = Flask(__name__)

# MQTT Configuration
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "NBtechv1/Sim7080"  # Change to your desired topic

mqtt_client = MQTTClient(MQTT_BROKER, MQTT_PORT, MQTT_TOPIC)
mqtt_client.connect()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/messages', methods=['GET'])
def get_messages():
    messages = mqtt_client.get_messages()
    return jsonify(messages)

@app.route('/publish', methods=['POST'])
def publish_message():
    data = request.json
    message = data.get('message', '')
    mqtt_client.publish(MQTT_TOPIC, message)
    return jsonify({"status": "Message published", "message": message})

if __name__ == '__main__':
    app.run(debug=True)