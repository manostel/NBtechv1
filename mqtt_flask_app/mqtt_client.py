import paho.mqtt.client as mqtt
import json
from database import insert_data  # Use SQLite for storage

class MQTTClient:
    def __init__(self, broker, port, topic):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def on_connect(self, client, userdata, flags, rc):
        print("Connected with result code " + str(rc))
        client.subscribe(self.topic)

    def on_message(self, client, userdata, msg):
        try:
            message = json.loads(msg.payload.decode())  # Convert JSON to dict
            print(f"Message received: {message}")

            # Extract temperature and humidity correctly
            client_id = message["ClientID"]
            device = message["device"]
            timestamp = message["timestamp"]
            temperature = message["data"].get("temperature")  # Extract temperature
            humidity = message["data"].get("humidity")  # Extract humidity

            # Store in SQLite
            insert_data(client_id, device, timestamp, temperature, humidity)

        except json.JSONDecodeError:
            print("Invalid JSON received, ignoring...")

    def publish(self, topic, message):
        """Publish message to a topic."""
        self.client.publish(topic, message)

    def connect(self):
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
