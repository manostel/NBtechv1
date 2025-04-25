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
    Determine battery state based on 1 hour of battery data.
    Returns:
    - 'charging' if battery increased by 3% or more
    - 'discharging' if battery decreased by 3% or more
    - 'idle' if change is between -2% and +2%
    """
    if not battery_data or len(battery_data) < 2:
        return 'idle'
    
    try:
        # Get first and last battery values
        first_battery = battery_data[0][1]
        last_battery = battery_data[-1][1]
        
        # Calculate the change
        change = last_battery - first_battery
        
        # If battery increased by 3% or more, it's charging
        if change >= 4.0:
            return 'charging'
        # If battery decreased by 3% or more, it's discharging
        elif change <= -4.0:
            return 'discharging'
        # If change is between -2% and +2%, it's idle
        elif -4.0 < change < 4.0:
            return 'idle'
        # For changes between 2-3% or -3% to -2%, we'll consider it idle
        return 'idle'
        
    except Exception as e:
        logger.error(f"Error determining battery state: {str(e)}")
        return 'idle'

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
        
        # Calculate time range (last 1 hour)
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        
        logger.info(f"Querying data for client_id: {client_id} from {start_time} to {end_time}")
        
        # Query DynamoDB for the first and last points in the last hour
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
            ScanIndexForward=True,  # Get oldest first
            Limit=1  # Get first point
        )
        
        first_point = response.get('Items', [])
        
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
            ScanIndexForward=False,  # Get newest first
            Limit=1  # Get last point
        )
        
        last_point = response.get('Items', [])
        
        if not first_point or not last_point:
            return create_cors_response(200, {
                'battery_state': 'idle'
            })
        
        # Create battery data with just first and last points
        battery_data = [
            (first_point[0]['timestamp'], float(first_point[0]['battery'])),
            (last_point[0]['timestamp'], float(last_point[0]['battery']))
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