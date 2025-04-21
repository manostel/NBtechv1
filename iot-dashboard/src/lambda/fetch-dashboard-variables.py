import json
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
import traceback
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Lambda function to fetch available variables for a device's dashboard
    
    Standard Input Format:
    {
        "client_id": "device_id"
    }
    
    Standard Response Format:
    {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": {
            "variables": ["var1", "var2", ...],
            "timestamp": "ISO timestamp",
            "client_id": "device_id"
        }
    }
    """
    print("Received event:", json.dumps(event, cls=DecimalEncoder))
    
    try:
        # Handle API Gateway event format
        if 'body' in event:
            event = json.loads(event['body'])
            
        client_id = event.get('client_id')
        
        if not client_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'code': 'MISSING_CLIENT_ID',
                        'message': 'client_id is required',
                        'details': 'Please provide a valid client_id in the request'
                    }
                }, cls=DecimalEncoder)
            }
        
        # Get available variables
        variables = get_available_variables(client_id)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'variables': variables,
                'timestamp': datetime.now().isoformat(),
                'client_id': client_id
            }, cls=DecimalEncoder)
        }
        
    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INVALID_JSON',
                    'message': 'Invalid JSON in request body',
                    'details': str(e)
                }
            }, cls=DecimalEncoder)
        }
    except Exception as e:
        print(f"Error in fetch-dashboard-variables: {str(e)}")
        print("Traceback:", traceback.format_exc())
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'code': 'INTERNAL_SERVER_ERROR',
                    'message': 'Internal server error',
                    'details': str(e)
                }
            }, cls=DecimalEncoder)
        }

def get_available_variables(client_id):
    """
    Fetch available variables for a device from DynamoDB
    
    Args:
        client_id (str): The device's client ID
        
    Returns:
        list: List of available variable names (excluding client_id, device, timestamp)
    """
    try:
        print(f"Connecting to DynamoDB for client_id: {client_id}")
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('IoT_DeviceData')
        
        print("Executing DynamoDB query...")
        # Query the latest data point to get available variables
        response = table.query(
            KeyConditionExpression=Key('client_id').eq(client_id),
            Limit=1,
            ScanIndexForward=False  # Get the most recent item
        )
        
        if not response['Items']:
            print(f"No items found for client_id: {client_id}")
            return []
            
        # Get all keys except the ones we want to exclude
        latest_item = response['Items'][0]
        
        # Define columns to exclude
        exclude_columns = ['client_id', 'device', 'timestamp']
        
        # Get all columns except the excluded ones
        variables = [key for key in latest_item.keys() 
                    if key not in exclude_columns]
        
        print(f"Extracted variables: {variables}")
        return variables
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        print("Error code:", e.response['Error']['Code'])
        print("Error message:", e.response['Error']['Message'])
        return []
    except Exception as e:
        print(f"Error in get_available_variables: {str(e)}")
        print("Traceback:", traceback.format_exc())
        return [] 