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
    
        if not hasattr(self, "subscribed"):
            client.subscribe(self.topic)
            self.subscribed = True  # ✅ Ensures it subscribes only once
            print(f"Subscribed to topic: {self.topic}")
        else:
            print("Already subscribed, skipping duplicate subscription.")


    def on_message(self, client, userdata, msg):
        try:
            message = json.loads(msg.payload.decode())  # Convert JSON to dict
            print(f"Message received: {message}")

            # Extract temperature, humidity, battery, and signal quality
            client_id = message["ClientID"]
            device = message["device"]
            timestamp = message["timestamp"]
            temperature = message["data"].get("temperature")
            humidity = message["data"].get("humidity")
            battery = message["data"].get("battery", 100)  # ✅ Default to 100 if missing
            signal_quality = message["data"].get("signal_quality")  # ✅ Default to 0 if missing

            # Store in SQLite
            insert_data(client_id, device, timestamp, temperature, humidity, battery, signal_quality)

        except json.JSONDecodeError:
            print("Invalid JSON received, ignoring...")

    def publish(self, topic, message):
        """Publish message to a topic."""
        self.client.publish(topic, message)

    def connect(self):
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
