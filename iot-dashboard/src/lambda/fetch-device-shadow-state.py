import json
import boto3

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"
iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint, region_name="eu-central-1")

# Shadow field mapping: short names (from firmware) -> full names (for compatibility)
SHADOW_FIELD_MAP = {
    'ms': 'motor_speed',
    'o1': 'OUT1',
    'o2': 'OUT2',
    'ps': 'power_saving',
    'i1': 'IN1',
    'i2': 'IN2',
    'ch': 'charging'
}

def normalize_shadow_state(shadow_state):
    """Convert short field names to full names for backward compatibility"""
    if not shadow_state:
        return shadow_state
    
    normalized = {}
    for key, value in shadow_state.items():
        full_name = SHADOW_FIELD_MAP.get(key, key)
        normalized[full_name] = value
    
    return normalized

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
            
            # Normalize shadow state (convert short names to full names)
            normalized_reported = normalize_shadow_state(reported_state)
            normalized_desired = normalize_shadow_state(desired_state)
            
            # Map shadow state to frontend format
            # Shadow uses: OUT1, OUT2, motor_speed, power_saving, IN1, IN2, charging, connection_status
            # Frontend expects: out1_state, out2_state, motor_speed, power_saving, in1_state, in2_state, charging
            device_state = {
                "client_id": client_id,
                "timestamp": shadow_doc.get("timestamp", 0),
                "version": shadow_doc.get("version", 0),
                "out1_state": normalized_reported.get("OUT1", 0),
                "out2_state": normalized_reported.get("OUT2", 0),
                "motor_speed": normalized_reported.get("motor_speed", 0),
                "power_saving": normalized_reported.get("power_saving", 0),
                "in1_state": normalized_reported.get("IN1", 0),
                "in2_state": normalized_reported.get("IN2", 0),
                "charging": normalized_reported.get("charging", 0),
                "connection_status": normalized_reported.get("connection_status", "unknown"),
                # Include desired state for UI feedback
                "desired": {
                    "out1_state": normalized_desired.get("OUT1"),
                    "out2_state": normalized_desired.get("OUT2"),
                    "motor_speed": normalized_desired.get("motor_speed"),
                    "power_saving": normalized_desired.get("power_saving")
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

