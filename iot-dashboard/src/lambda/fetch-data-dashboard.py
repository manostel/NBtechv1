import json
import boto3
from datetime import datetime, timedelta
import logging
from decimal import Decimal
from statistics import mean
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')

# Maximum allowed time window in hours
MAX_TIME_WINDOW = 24

# Custom JSON encoder to handle Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_cors_response(status_code, body):
    """Create a response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def get_time_range_and_points(time_range, target_points=100):
    """Get start time and calculate interval for consistent points"""
    now = datetime.utcnow()
    if time_range == 'live':
        return now - timedelta(minutes=2), 20
    elif time_range == '15m':
        return now - timedelta(minutes=15), 15  # One point per minute for 15m
    elif time_range == '1h':
        return now - timedelta(hours=1), target_points
    elif time_range == '2h':
        return now - timedelta(hours=2), target_points
    elif time_range == '4h':
        return now - timedelta(hours=4), target_points
    elif time_range == '8h':
        return now - timedelta(hours=8), target_points
    elif time_range == '16h':
        return now - timedelta(hours=16), target_points
    elif time_range == '24h':
        return now - timedelta(hours=24), target_points
    else:
        return now - timedelta(hours=1), target_points

def get_last_timestamp(client_id):
    """Get the most recent timestamp for a given client_id"""
    try:
        logger.info(f"Querying for last timestamp of client_id: {client_id}")
        
        # Query the table to get the most recent item
        response = device_data_table.query(
            KeyConditionExpression='client_id = :client_id',
            ExpressionAttributeValues={
                ':client_id': client_id
            },
            ExpressionAttributeNames={
                '#ts': 'timestamp'
            },
            ScanIndexForward=False,  # Sort in descending order
            Limit=1  # Get only the most recent item
        )
        
        logger.info(f"Query response: {json.dumps(response)}")
        
        if response.get('Items') and len(response['Items']) > 0:
            last_item = response['Items'][0]
            logger.info(f"Found last timestamp for {client_id}: {last_item['timestamp']}")
            return last_item['timestamp']
        else:
            logger.warning(f"No data found for client_id {client_id}")
            return None
    except Exception as e:
        logger.error(f"Error getting last timestamp: {str(e)}")
        return None

def fetch_data_in_chunks(client_id, start_time, end_time=None, selected_variables=None):
    """Fetch data in smaller chunks to prevent timeouts"""
    all_items = []
    last_evaluated_key = None
    query_count = 0
    total_scan_time = 0
    
    # For longer time periods, use larger chunks
    if end_time and (end_time - start_time).total_seconds() > 24 * 60 * 60:
        chunk_hours = 12
    else:
        chunk_hours = 4
    
    current_start = start_time
    final_end = end_time or datetime.utcnow()
    
    logger.info(f"Starting data fetch for client_id: {client_id}")
    logger.info(f"Time range: {current_start.isoformat()} to {final_end.isoformat()}")
    logger.info(f"Selected variables: {selected_variables}")
    
    while current_start < final_end:
        chunk_end = min(current_start + timedelta(hours=chunk_hours), final_end)
        logger.info(f"Fetching chunk from {current_start.isoformat()} to {chunk_end.isoformat()}")
        
        chunk_items = []
        last_evaluated_key = None
        
        while True:
            query_start = time.time()
            query_count += 1
            
            try:
                if last_evaluated_key:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts BETWEEN :start_time AND :end_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat(),
                            ':end_time': chunk_end.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        ExclusiveStartKey=last_evaluated_key,
                        ScanIndexForward=True  # Get data in chronological order
                    )
                else:
                    response = device_data_table.query(
                        KeyConditionExpression='client_id = :client_id AND #ts BETWEEN :start_time AND :end_time',
                        ExpressionAttributeValues={
                            ':client_id': client_id,
                            ':start_time': current_start.isoformat(),
                            ':end_time': chunk_end.isoformat()
                        },
                        ExpressionAttributeNames={
                            '#ts': 'timestamp'
                        },
                        ScanIndexForward=True  # Get data in chronological order
                    )
                
                query_time = time.time() - query_start
                total_scan_time += query_time
                
                items_count = len(response.get('Items', []))
                logger.info(f"Query {query_count} returned {items_count} items in {query_time:.2f}s")
                
                if 'Items' in response:
                    # Filter items based on selected variables if provided
                    if selected_variables:
                        filtered_items = []
                        for item in response['Items']:
                            filtered_item = {
                                'timestamp': item['timestamp'],
                                'client_id': item['client_id']
                            }
                            for var in selected_variables:
                                if var in item:
                                    filtered_item[var] = item[var]
                            filtered_items.append(filtered_item)
                        chunk_items.extend(filtered_items)
                    else:
                        chunk_items.extend(response['Items'])
                
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break
                    
            except Exception as e:
                logger.error(f"Error in query: {str(e)}")
                break
        
        all_items.extend(chunk_items)
        current_start = chunk_end
    
    logger.info(f"Total items fetched: {len(all_items)} in {query_count} queries. Scan time: {total_scan_time:.2f}s")
    
    if not all_items:
        logger.warning(f"No data found for client_id: {client_id} in the specified time range")
        logger.warning(f"Query parameters: client_id={client_id}, start_time={start_time.isoformat()}, end_time={end_time.isoformat() if end_time else 'now'}")
    
    return all_items

def aggregate_data(items, target_points, selected_variables=None):
    """Aggregate data to achieve consistent number of points"""
    if not items:
        return []

    # Sort items by timestamp
    sorted_items = sorted(items, key=lambda x: x['timestamp'])
    
    # Calculate number of items per group
    items_per_group = max(1, len(sorted_items) // target_points)
    
    processed_data = []
    current_group = []
    
    # Get all possible metrics from the first item, excluding specific fields
    excluded_fields = {'timestamp', 'client_id', 'user_email', 'device'}
    if selected_variables:
        metrics = selected_variables
    else:
        metrics = [key for key in sorted_items[0].keys() if key not in excluded_fields]
    
    for item in sorted_items:
        group_data = {}
        for metric in metrics:
            try:
                group_data[metric] = float(item.get(metric, 0))
            except (ValueError, TypeError):
                group_data[metric] = 0
        current_group.append(group_data)
        
        if len(current_group) >= items_per_group:
            avg_point = {'timestamp': item['timestamp']}
            for metric in metrics:
                values = [p[metric] for p in current_group]
                avg_point[metric] = round(mean(values), 2)
            processed_data.append(avg_point)
            current_group = []
    
    if current_group:
        avg_point = {'timestamp': sorted_items[-1]['timestamp']}
        for metric in metrics:
            values = [p[metric] for p in current_group]
            avg_point[metric] = round(mean(values), 2)
        processed_data.append(avg_point)

    return processed_data

def calculate_summary_statistics(data, metrics):
    """Calculate summary statistics for all metrics"""
    summary = {
        'data_points': len(data),
        'original_points': len(data),
        'target_points': len(data)
    }
    
    for metric in metrics:
        values = [float(item.get(metric, 0)) for item in data]
        if values:
            summary[f'avg_{metric}'] = round(mean(values), 2)
            summary[f'min_{metric}'] = round(min(values), 2)
            summary[f'max_{metric}'] = round(max(values), 2)
            summary[f'latest_{metric}'] = round(values[-1], 2)
    
    return summary

def lambda_handler(event, context):
    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': ''
        }

    try:
        # Handle both direct input and API Gateway input formats
        if 'body' in event:
            # API Gateway format
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            # Direct input format
            body = event
            
        # Extract required fields
        action = body.get('action')
        client_id = body.get('client_id')
        time_range = body.get('time_range', '1h')
        points = body.get('points', 100)
        latest_timestamp = body.get('latest_timestamp')
        selected_variables = body.get('selected_variables', None)
        
        # Validate required fields
        if not all([action, client_id]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Missing required fields',
                    'message': 'action and client_id are required'
                })
            }
            
        # Get the time range and points
        start_time, target_points = get_time_range_and_points(time_range, points)
        
        # If latest_timestamp is provided, use it as the end time
        if latest_timestamp:
            end_time = datetime.fromisoformat(latest_timestamp.replace('Z', '+00:00'))
            # Calculate start time based on the time range
            if time_range == '15m':
                start_time = end_time - timedelta(minutes=15)
            elif time_range == '1h':
                start_time = end_time - timedelta(hours=1)
            elif time_range == '2h':
                start_time = end_time - timedelta(hours=2)
            elif time_range == '4h':
                start_time = end_time - timedelta(hours=4)
            elif time_range == '8h':
                start_time = end_time - timedelta(hours=8)
            elif time_range == '16h':
                start_time = end_time - timedelta(hours=16)
            elif time_range == '24h':
                start_time = end_time - timedelta(hours=24)
            else:
                start_time = end_time - timedelta(hours=1)
        else:
            end_time = datetime.utcnow()
            
        # Fetch data from DynamoDB with selected variables
        items = fetch_data_in_chunks(client_id, start_time, end_time, selected_variables)
        
        if not items:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'data': [],
                    'summary': {
                        'message': 'No data available for the selected time range',
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat()
                    }
                })
            }
            
        # Aggregate data to achieve consistent number of points
        aggregated_data = aggregate_data(items, target_points, selected_variables)
        
        # Calculate summary statistics
        metrics_to_summarize = selected_variables if selected_variables else [key for key in aggregated_data[0].keys() if key != 'timestamp']
        summary = calculate_summary_statistics(aggregated_data, metrics_to_summarize)
        
        # Return response with CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'data': aggregated_data,
                'summary': summary
            })
        }
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        } 