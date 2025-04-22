import json
import boto3
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')

def get_latest_data(client_id):
    """Get the most recent data point for a given client_id"""
    try:
        # Query the table to get the most recent item
        response = device_data_table.query(
            KeyConditionExpression='client_id = :client_id',
            ExpressionAttributeValues={
                ':client_id': client_id
            },
            ScanIndexForward=False,  # Sort in descending order
            Limit=1  # Get only the most recent item
        )
        
        if response.get('Items') and len(response['Items']) > 0:
            latest_item = response['Items'][0]
            
            # Convert Decimal to float for all numeric values and exclude device, client_id, and timestamp
            processed_data = []
            timestamp = None
            
            for key, value in latest_item.items():
                if key in ['device', 'client_id', 'timestamp']:
                    if key == 'timestamp':
                        timestamp = float(value) if isinstance(value, Decimal) else value
                    continue
                    
                if isinstance(value, Decimal):
                    processed_data.append({
                        'name': key,
                        'value': float(value)
                    })
                else:
                    processed_data.append({
                        'name': key,
                        'value': value
                    })
            
            return {
                'latest_data': processed_data,
                'timestamp': timestamp
            }
        return None
            
    except Exception as e:
        logger.error(f"Error getting latest data: {str(e)}")
        return None

def lambda_handler(event, context):
    try:
        # Get client_id directly from the event
        client_id = event.get('client_id')
        if not client_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                'body': json.dumps({'error': 'client_id is required'})
            }
            
        # Get the latest data
        result = get_latest_data(client_id)
        if not result:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                'body': json.dumps({'error': 'No data available'})
            }
            
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({'error': str(e)})
        } 