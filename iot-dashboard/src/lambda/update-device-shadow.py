import json
import boto3

# Use the correct IoT Core Data Endpoint
iot_endpoint = "https://al047cml3y4l3-ats.iot.eu-central-1.amazonaws.com"
iot_client = boto3.client("iot-data", endpoint_url=iot_endpoint, region_name="eu-central-1")

# Shadow field mapping: short names (from firmware) -> full names (for compatibility)
# Note: Now using short names directly (o1, o2, i1, i2) instead of OUT1, OUT2, IN1, IN2
SHADOW_FIELD_MAP = {
    'ms': 'motor_speed',
    'ps': 'power_saving',
    'ch': 'charging'
}

# Mapping for backward compatibility: if frontend sends old names, convert to new
LEGACY_TO_SHORT_MAP = {
    'OUT1': 'o1',
    'OUT2': 'o2',
    'IN1': 'i1',
    'IN2': 'i2',
    'motor_speed': 'ms',
    'power_saving': 'ps',
    'charging': 'ch'
}

def normalize_shadow_state(shadow_state):
    """Convert field names for compatibility (only for non-IO fields)"""
    if not shadow_state:
        return shadow_state
    
    normalized = {}
    for key, value in shadow_state.items():
        # Use mapping only for non-IO fields, keep IO fields as-is (o1, o2, i1, i2)
        full_name = SHADOW_FIELD_MAP.get(key, key)
        normalized[full_name] = value
    
    return normalized

def convert_to_short_names(state_dict):
    """Convert legacy field names to short names for firmware compatibility"""
    if not state_dict:
        return state_dict
    
    converted = {}
    for key, value in state_dict.items():
        # Convert legacy names (OUT1, OUT2) to short names (o1, o2), or keep as-is if already short
        short_name = LEGACY_TO_SHORT_MAP.get(key, key)
        converted[short_name] = value
    
    return converted

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
    """Update Device Shadow desired state directly"""
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
        desired_state = body.get("desired_state")
        
        if not client_id:
            return create_cors_response(400, {
                "error": "Missing client_id"
            })
        
        if not desired_state:
            return create_cors_response(400, {
                "error": "Missing desired_state"
            })

        # Validate desired_state is a dictionary
        if not isinstance(desired_state, dict):
            return create_cors_response(400, {
                "error": "desired_state must be a JSON object"
            })

        # Convert legacy field names (if any) to short names (for firmware)
        # Frontend may send: o1, o2 (new) or OUT1, OUT2 (legacy)
        # Firmware expects: o1, o2, i1, i2, ms, ps, ch, etc.
        desired_state_short = convert_to_short_names(desired_state)
        print(f"Converted desired state to short names: {desired_state} -> {desired_state_short}")

        # Update Device Shadow with desired state (using short names)
        shadow_payload = {
            "state": {
                "desired": desired_state_short
            }
        }
        
        try:
            response = iot_client.update_thing_shadow(
                thingName=client_id,
                payload=json.dumps(shadow_payload)
            )
            print(f"Updated shadow for {client_id}: {json.dumps(shadow_payload)}")
            
            # After updating shadow, fetch the current shadow state to return to frontend
            try:
                shadow_response = iot_client.get_thing_shadow(thingName=client_id)
                shadow_doc = json.loads(shadow_response['payload'].read())
                reported_state = shadow_doc.get("state", {}).get("reported", {})
                
                # Normalize shadow state (convert short names to full names for non-IO fields)
                normalized_reported = normalize_shadow_state(reported_state)
                
                # Map shadow state to frontend format (using short names: o1, o2, i1, i2)
                current_state = {
                    "out1_state": normalized_reported.get("o1", reported_state.get("o1", 0)),
                    "out2_state": normalized_reported.get("o2", reported_state.get("o2", 0)),
                    "motor_speed": normalized_reported.get("motor_speed", 0),
                    "power_saving": normalized_reported.get("power_saving", 0),
                    "in1_state": normalized_reported.get("i1", reported_state.get("i1", 0)),
                    "in2_state": normalized_reported.get("i2", reported_state.get("i2", 0)),
                    "charging": normalized_reported.get("charging", 0),
                    "connection_status": normalized_reported.get("connection_status", "unknown")
                }
            except Exception as shadow_error:
                print(f"Warning: Could not fetch shadow state after update: {str(shadow_error)}")
                current_state = None
            
            return create_cors_response(200, {
                "message": "Shadow desired state updated successfully",
                "thingName": client_id,
                "desiredState": desired_state,
                "currentState": current_state,  # Include current state for immediate UI update
                "method": "shadow"
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

