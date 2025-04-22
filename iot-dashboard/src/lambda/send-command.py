import json
import boto3
import time

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"

iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint)

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body)
    }

def validate_command(command):
    """Validate that the command is one of the allowed values"""
    valid_commands = [
        "RESTART",
        "TOGGLE_1_ON",
        "TOGGLE_1_OFF",
        "TOGGLE_2_ON",
        "TOGGLE_2_OFF",
        "GET_STATE",
        "SET_SPEED"
    ]
    return command in valid_commands

def lambda_handler(event, context):
    print("Received event:", json.dumps(event, indent=2))

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

    try:
        # Handle command sending (POST request)
        if "body" in event:
            body = json.loads(event["body"])
        else:
            body = event

        client_id = body.get("client_id")
        # Check both 'command' and 'action' fields
        command = body.get("command")

        if not client_id or not command:
            return create_cors_response(400, {
                "error": "Missing client_id or command"
            })

        # Validate the command
        if not validate_command(command):
            return create_cors_response(400, {
                "error": f"Invalid command. Must be one of: RESTART, TOGGLE_1_ON, TOGGLE_1_OFF, TOGGLE_2_ON, TOGGLE_2_OFF, GET_STATE, SET_SPEED"
            })

        # Define MQTT topics
        command_topic = f"NBtechv1/{client_id}/cmd"

        # Prepare message payload - match exact format expected by edge device
        if command == "SET_SPEED":
            if "speed" not in body:
                return create_cors_response(400, {
                    "error": "Missing speed value for SET_SPEED command"
                })
            message_payload = {
                "command": "SET_SPEED",
                "speed": body["speed"]
            }
        else:
            message_payload = {
                "command": command
            }

        # Publish message to AWS IoT Core
        iot_client.publish(
            topic=command_topic,
            qos=1,
            payload=json.dumps(message_payload)
        )
        print(f"Published to {command_topic}: {json.dumps(message_payload)}")

        return create_cors_response(200, {
            "message": f"Command '{command}' sent successfully to device {client_id}"
        })

    except Exception as e:
        print("Error:", str(e))
        return create_cors_response(500, {
            "error": str(e)
        }) 