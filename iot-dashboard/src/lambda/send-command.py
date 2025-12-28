import json
import boto3
import time

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"

iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint, region_name="eu-central-1")

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
        "SET_SPEED",
        "POWER_SAVING_ON",
        "POWER_SAVING_OFF"
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
                "error": f"Invalid command. Must be one of: RESTART, TOGGLE_1_ON, TOGGLE_1_OFF, TOGGLE_2_ON, TOGGLE_2_OFF, GET_STATE, SET_SPEED, POWER_SAVING_ON, POWER_SAVING_OFF"
            })

        # Professional: Use Device Shadow instead of MQTT command topic
        # This provides state persistence, offline queuing, and better state management
        
        # Map commands to shadow desired state
        desired_state = {}
        
        if command == "TOGGLE_1_ON":
            desired_state["OUT1"] = 1
        elif command == "TOGGLE_1_OFF":
            desired_state["OUT1"] = 0
        elif command == "TOGGLE_2_ON":
            desired_state["OUT2"] = 1
        elif command == "TOGGLE_2_OFF":
            desired_state["OUT2"] = 0
        elif command == "SET_SPEED":
            if "speed" not in body:
                return create_cors_response(400, {
                    "error": "Missing speed value for SET_SPEED command"
                })
            speed_value = int(body["speed"])
            # Validate speed range (0-255)
            if speed_value < 0 or speed_value > 255:
                return create_cors_response(400, {
                    "error": "Speed must be between 0 and 255"
                })
            desired_state["motor_speed"] = speed_value
        elif command == "POWER_SAVING_ON":
            desired_state["power_saving"] = 1
        elif command == "POWER_SAVING_OFF":
            desired_state["power_saving"] = 0
        elif command == "RESTART":
            # RESTART is a special command - use MQTT topic for immediate action
            # (Shadow is for state management, RESTART is an action)
            command_topic = f"NBtechv1/{client_id}/cmd"
            message_payload = {"command": "RESTART"}
        iot_client.publish(
            topic=command_topic,
            qos=1,
            payload=json.dumps(message_payload)
        )
            print(f"Published RESTART to {command_topic}: {json.dumps(message_payload)}")
            return create_cors_response(200, {
                "message": f"RESTART command sent successfully to device {client_id}",
                "method": "mqtt"  # Indicate we used MQTT for this action command
            })
        elif command == "GET_STATE":
            # GET_STATE: Request current shadow state
            try:
                response = iot_client.get_thing_shadow(thingName=client_id)
                shadow_doc = json.loads(response['payload'].read())
                return create_cors_response(200, {
                    "message": "Shadow state retrieved successfully",
                    "shadow": shadow_doc
                })
            except iot_client.exceptions.ResourceNotFoundException:
                return create_cors_response(404, {
                    "error": f"Thing '{client_id}' not found"
                })
            except Exception as e:
                return create_cors_response(500, {
                    "error": f"Failed to get shadow state: {str(e)}"
                })
        else:
            return create_cors_response(400, {
                "error": f"Command '{command}' not yet implemented for shadow updates"
            })

        # Update Device Shadow with desired state
        shadow_payload = {
            "state": {
                "desired": desired_state
            }
        }
        
        try:
            response = iot_client.update_thing_shadow(
                thingName=client_id,
                payload=json.dumps(shadow_payload)
            )
            print(f"Updated shadow for {client_id}: {json.dumps(shadow_payload)}")
            
            # After updating shadow, fetch the current shadow state to return to frontend
            # This ensures frontend gets the latest state immediately
            try:
                shadow_response = iot_client.get_thing_shadow(thingName=client_id)
                shadow_doc = json.loads(shadow_response['payload'].read())
                reported_state = shadow_doc.get("state", {}).get("reported", {})
                
                # Map shadow state to frontend format
                current_state = {
                    "out1_state": reported_state.get("OUT1", 0),
                    "out2_state": reported_state.get("OUT2", 0),
                    "motor_speed": reported_state.get("motor_speed", 0),
                    "power_saving": reported_state.get("power_saving", 0),
                    "in1_state": reported_state.get("IN1", 0),
                    "in2_state": reported_state.get("IN2", 0),
                    "charging": reported_state.get("charging", 0),
                    "connection_status": reported_state.get("connection_status", "unknown")
                }
            except Exception as shadow_error:
                print(f"Warning: Could not fetch shadow state after update: {str(shadow_error)}")
                current_state = None

        return create_cors_response(200, {
                "message": f"Command '{command}' sent successfully via Device Shadow",
                "thingName": client_id,
                "desiredState": desired_state,
                "currentState": current_state,  # Include current state for immediate UI update
                "method": "shadow"  # Indicate we used Shadow
            })
        except iot_client.exceptions.ResourceNotFoundException:
            return create_cors_response(404, {
                "error": f"Thing '{client_id}' not found in AWS IoT Core"
            })
        except Exception as e:
            print(f"Error updating shadow: {str(e)}")
            return create_cors_response(500, {
                "error": f"Failed to update shadow: {str(e)}"
        })

    except Exception as e:
        print("Error:", str(e))
        return create_cors_response(500, {
            "error": str(e)
        }) 