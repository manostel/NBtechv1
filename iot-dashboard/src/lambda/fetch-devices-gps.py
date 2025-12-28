import json
import boto3
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
device_preferences_table = dynamodb.Table('IoT_DevicePreferences')
gps_data_table = dynamodb.Table('IoT_DeviceGPS')

def cors_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body, default=decimal_to_float)
    }

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    try:
        # Log the received event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Handle both direct events and API Gateway events
        if 'body' in event:
            # API Gateway event - parse the body
            body = json.loads(event['body'])
        else:
            # Direct event - use the event itself
            body = event
        
        logger.info(f"Parsed body: {json.dumps(body)}")
        
        # Get client_ids from the request body
        client_ids = body.get('client_ids', [])
        
        if not client_ids:
            return cors_response(400, {
                'error': 'Missing client_ids parameter',
                'message': 'Please provide client_ids array'
            })
        
        try:
            # Get GPS data for the specified client IDs
            gps_locations = []
            
            for client_id in client_ids:
                logger.info(f"Querying GPS data for client_id: {client_id}")
                # Query GPS data for each client_id
                # Note: If table has a sort key (timestamp), we need to query differently
                try:
                    response = gps_data_table.query(
                        KeyConditionExpression='client_id = :client_id',
                        ExpressionAttributeValues={
                            ':client_id': client_id
                        },
                        ScanIndexForward=False,  # Get latest first
                        Limit=1  # Only get the most recent entry
                    )
                    logger.info(f"Query response for {client_id}: {len(response.get('Items', []))} items found")
                except Exception as query_error:
                    logger.error(f"Query error for {client_id}: {str(query_error)}")
                    # Try scan as fallback if query fails (table might not have sort key)
                    logger.info(f"Trying scan as fallback for {client_id}")
                    scan_response = gps_data_table.scan(
                        FilterExpression='client_id = :client_id',
                        ExpressionAttributeValues={
                            ':client_id': client_id
                        },
                        Limit=1
                    )
                    response = scan_response
                    logger.info(f"Scan response for {client_id}: {len(response.get('Items', []))} items found")
                
                if response.get('Items'):
                    item = response['Items'][0]  # Get the latest entry
                    logger.info(f"GPS item for {client_id}: {json.dumps(item, default=str)}")
                    
                    # Try multiple field name variations (device might use different names)
                    lat = item.get('lat') or item.get('latitude') or item.get('Lat') or item.get('Latitude')
                    lon = item.get('lon') or item.get('longitude') or item.get('Lon') or item.get('Longitude')
                    alt = item.get('alt') or item.get('altitude') or item.get('Alt') or item.get('Altitude')
                    sats = item.get('sats') or item.get('satellites') or item.get('Sats') or item.get('Satellites')
                    ts = item.get('timestamp') or item.get('Timestamp') or item.get('time') or item.get('Time')
                    
                    # Only add GPS data if we have valid lat/lon
                    if lat is not None and lon is not None:
                        try:
                            gps_data = {
                                'client_id': client_id,
                                'latitude': float(lat),
                                'longitude': float(lon),
                                'timestamp': str(ts) if ts else '',
                                'altitude': float(alt) if alt is not None else None,
                                'satellites': int(sats) if sats is not None else None
                            }
                            gps_locations.append(gps_data)
                            logger.info(f"✅ GPS data found for {client_id}: lat={lat}, lon={lon}")
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Invalid GPS data format for {client_id}: {str(e)}")
                            gps_locations.append({
                                'client_id': client_id,
                                'latitude': None,
                                'longitude': None,
                                'timestamp': None,
                                'altitude': None,
                                'satellites': None
                            })
                    else:
                        logger.info(f"⚠️ GPS item found for {client_id} but lat/lon are missing")
                        gps_locations.append({
                            'client_id': client_id,
                            'latitude': None,
                            'longitude': None,
                            'timestamp': None,
                            'altitude': None,
                            'satellites': None
                        })
                else:
                    # No GPS data found in table
                    logger.info(f"ℹ️ No GPS data found in IoT_DeviceGPS table for {client_id}")
                    gps_locations.append({
                        'client_id': client_id,
                        'latitude': None,
                        'longitude': None,
                        'timestamp': None,
                        'altitude': None,
                        'satellites': None
                    })
            
            return cors_response(200, {
                'gps_locations': gps_locations
            })
            
        except Exception as e:
            logger.error(f"DynamoDB query error: {str(e)}")
            return cors_response(500, {
                'error': f'Error querying GPS data: {str(e)}'
            })
        
    except json.JSONDecodeError:
        return cors_response(400, {
            'error': 'Invalid JSON in request body'
        })
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return cors_response(500, {
            'error': f'Internal server error: {str(e)}'
        })

