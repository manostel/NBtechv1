import json
import boto3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('IoT_DeviceData')

# Cache for recent results (last 5 minutes)
result_cache = {}
CACHE_DURATION = 300  # 5 minutes in seconds

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def get_cached_result(client_id: str) -> Optional[str]:
    """Get cached result if available and not expired"""
    if client_id in result_cache:
        cached_time, result = result_cache[client_id]
        if time.time() - cached_time < CACHE_DURATION:
            return result
    return None

def set_cached_result(client_id: str, result: str):
    """Cache the result with current timestamp"""
    result_cache[client_id] = (time.time(), result)

def determine_battery_state(battery_data: List[tuple]) -> str:
    """
    Determine battery state based on battery data points.
    Returns:
    - 'charging' if battery level is increasing
    - 'discharging' if battery level is decreasing
    - 'idle' if not enough data points
    """
    if not battery_data or len(battery_data) < 2:  # Need at least 2 points
        return 'idle'  # Return idle if not enough data
    
    try:
        # Sort by timestamp to ensure chronological order
        sorted_data = sorted(battery_data, key=lambda x: x[0])
        
        # Get last two points (since we publish every 5 minutes)
        last_two_points = sorted_data[-2:]
        
        # Calculate the change between the last two points
        change = last_two_points[1][1] - last_two_points[0][1]
        
        # If battery increased by at least 0.5%, it's charging
        if change >= 0.5:
            return 'charging'
        # If battery decreased or stayed the same, it's discharging
        else:
            return 'discharging'
        
    except Exception as e:
        logger.error(f"Error determining battery state: {str(e)}")
        return 'idle'  # Return idle on error

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Handle CORS preflight request
        if event.get("httpMethod") == "OPTIONS":
            return create_cors_response(200, {"message": "CORS preflight successful"})
        
        # Handle both direct JSON and API Gateway events
        if 'body' in event:
            # API Gateway event
            body = json.loads(event['body'])
        else:
            # Direct JSON event
            body = event
            
        client_id = body.get('client_id')
        
        if not client_id:
            return create_cors_response(400, {
                'error': 'Missing client_id parameter',
                'battery_state': 'idle'
            })
        
        # Calculate time range (last 15 minutes to get at least 2-3 points)
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=15)
        
        logger.info(f"Querying data for client_id: {client_id} from {start_time} to {end_time}")
        
        # Query DynamoDB for all points in the last 15 minutes
        response = table.query(
            KeyConditionExpression='client_id = :cid AND #ts BETWEEN :start AND :end',
            ExpressionAttributeValues={
                ':cid': client_id,
                ':start': start_time.isoformat() + 'Z',
                ':end': end_time.isoformat() + 'Z'
            },
            ExpressionAttributeNames={
                '#ts': 'timestamp'
            },
            ScanIndexForward=True  # Get all points in chronological order
        )
        
        points = response.get('Items', [])
        
        if not points or len(points) < 2:  # Need at least 2 points
            return create_cors_response(200, {
                'battery_state': 'idle'
            })
        
        # Create battery data with all points
        battery_data = [
            (point['timestamp'], float(point['battery']))
            for point in points
        ]
        
        # Determine battery state
        battery_state = determine_battery_state(battery_data)
        
        # Cache the result
        set_cached_result(client_id, battery_state)
        
        logger.info(f"Battery state determined: {battery_state}")
        
        return create_cors_response(200, {
            'battery_state': battery_state
        })
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return create_cors_response(500, {
            'error': str(e),
            'battery_state': 'idle'
        }) 