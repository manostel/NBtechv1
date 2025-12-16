import json
import boto3

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

def lambda_handler(event, context):
    """Fetch device state from AWS IoT Device Shadow"""
    print("Received event:", json.dumps(event, indent=2))

    # Handle CORS preflight request
    if event.get("httpMethod") == "OPTIONS":
        return create_cors_response(200, {"message": "CORS preflight successful"})

    try:
        # Parse request body
        if "body" in event:
            body = json.loads(event["body"])
        else:
            body = event

        client_id = body.get("client_id")
        if not client_id:
            return create_cors_response(400, {
                "error": "Missing client_id"
            })

        # Get Device Shadow state
        try:
            response = iot_client.get_thing_shadow(thingName=client_id)
            shadow_doc = json.loads(response['payload'].read())
            
            # Extract reported state from shadow document
            # Format: {"state":{"reported":{...},"desired":{...}},"metadata":{...},"version":123}
            reported_state = shadow_doc.get("state", {}).get("reported", {})
            desired_state = shadow_doc.get("state", {}).get("desired", {})
            
            # Map shadow state to frontend format
            # Shadow uses: OUT1, OUT2, motor_speed, power_saving, IN1, IN2, charging, connection_status
            # Frontend expects: out1_state, out2_state, motor_speed, power_saving, in1_state, in2_state, charging
            device_state = {
                "client_id": client_id,
                "timestamp": shadow_doc.get("timestamp", 0),
                "version": shadow_doc.get("version", 0),
                "out1_state": reported_state.get("OUT1", 0),
                "out2_state": reported_state.get("OUT2", 0),
                "motor_speed": reported_state.get("motor_speed", 0),
                "power_saving": reported_state.get("power_saving", 0),
                "in1_state": reported_state.get("IN1", 0),
                "in2_state": reported_state.get("IN2", 0),
                "charging": reported_state.get("charging", 0),
                "connection_status": reported_state.get("connection_status", "unknown"),
                # Include desired state for UI feedback
                "desired": {
                    "out1_state": desired_state.get("OUT1"),
                    "out2_state": desired_state.get("OUT2"),
                    "motor_speed": desired_state.get("motor_speed"),
                    "power_saving": desired_state.get("power_saving")
                },
                # Include metadata if available
                "metadata": shadow_doc.get("metadata", {})
            }
            
            return create_cors_response(200, {
                "message": "Device shadow state retrieved successfully",
                "state": device_state,
                "source": "shadow"
            })
            
        except iot_client.exceptions.ResourceNotFoundException:
            return create_cors_response(404, {
                "error": f"Thing '{client_id}' not found in AWS IoT Core",
                "state": None,
                "source": "shadow"
            })
        except Exception as e:
            print(f"Error getting shadow state: {str(e)}")
            return create_cors_response(500, {
                "error": f"Failed to get shadow state: {str(e)}",
                "state": None,
                "source": "shadow"
            })

    except Exception as e:
        print("Error:", str(e))
        return create_cors_response(500, {
            "error": str(e)
        })

