import json
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
device_data_table = dynamodb.Table('IoT_DeviceData')
devices_table = dynamodb.Table('Devices')

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
        'body': json.dumps(body)
    }

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [decimal_to_float(x) for x in obj]
    return obj

def lambda_handler(event, context):
    debug_logs = []
    debug_logs.append(f"Received event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})
    
    try:
        # Parse body
        body = event.get('body')
        if body is None:
            body = event
        elif isinstance(body, str):
            body = json.loads(body)
        
        debug_logs.append(f"Parsed body: {json.dumps(body)}")
        
        # Get action from body
        action = body.get('action')
        debug_logs.append(f"Action: {action}")
        
        if not action:
            return cors_response(400, {
                'error': 'Missing action in request body',
                'debug_logs': debug_logs
            })
        
        if action == 'get_devices':
            # Validate required fields
            if 'user_email' not in body:
                return cors_response(400, {
                    'error': 'Missing required field: user_email',
                    'debug_logs': debug_logs
                })
            
            try:
                # Query the Devices table for user's devices
                response = devices_table.scan(
                    FilterExpression='user_email = :user_email',
                    ExpressionAttributeValues={
                        ':user_email': body['user_email']
                    }
                )
                
                # Convert all Decimal values to float in the response
                processed_response = decimal_to_float(response)
                debug_logs.append(f"Devices table scan response: {json.dumps(processed_response)}")
                
                devices = []
                for item in response.get('Items', []):
                    # Get the latest data for each device
                    device_data_response = device_data_table.query(
                        KeyConditionExpression='device_id = :device_id',
                        ExpressionAttributeValues={
                            ':device_id': item['client_id']
                        },
                        Limit=1,
                        ScanIndexForward=False
                    )
                    
                    # Convert Decimal to float in the latest data
                    latest_data = {}
                    if device_data_response.get('Items'):
                        latest_data = decimal_to_float(device_data_response['Items'][0])
                    
                    # Process the device data
                    device = {
                        'client_id': item['client_id'],
                        'device_name': item.get('device_name'),
                        'status': item.get('status', 'Inactive'),
                        'last_seen': item.get('last_seen'),
                        'created_at': item.get('created_at'),
                        'device_type': decimal_to_float(item.get('device_info', {})).get('type', 'Unknown'),
                        'location': decimal_to_float(item.get('location', {})),
                        'metrics': decimal_to_float(item.get('metrics', {})),
                        'display': decimal_to_float(item.get('display', {})),
                        'alerts': {
                            'enabled': item.get('alerts', {}).get('enabled', True),
                            'active': []  # Populate with active alerts if any
                        },
                        'tags': item.get('tags', []),
                        'latest_data': latest_data
                    }
                    devices.append(device)
                
                debug_logs.append(f"Final devices list: {json.dumps(devices)}")
                
                return cors_response(200, {
                    'devices': devices,
                    'debug_logs': debug_logs
                })
                
            except Exception as e:
                debug_logs.append(f"Error during device lookup: {str(e)}")
                return cors_response(500, {
                    'error': f"Error during device lookup: {str(e)}",
                    'debug_logs': debug_logs
                })
        
        elif action == 'get_device_data':
            # Validate required fields
            required_fields = ['client_id', 'user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Get device data - most recent first
            response = device_data_table.query(
                KeyConditionExpression='device_id = :device_id',
                ExpressionAttributeValues={
                    ':device_id': body['client_id']
                },
                Limit=1,  # Get only the most recent data
                ScanIndexForward=False  # Get in descending order (newest first)
            )
            
            # Convert all Decimal values to float
            processed_response = decimal_to_float(response)
            debug_logs.append(f"DynamoDB response: {json.dumps(processed_response)}")
            
            if not response.get('Items'):
                debug_logs.append("No data found for device")
                return cors_response(200, {
                    'device_data': {}  # Return empty object if no data found
                })
            
            # Get the most recent data and convert all Decimal types to float
            device_data = decimal_to_float(response['Items'][0])
            debug_logs.append(f"Most recent data: {json.dumps(device_data)}")
            
            # Process the data excluding specific fields
            processed_data = {}
            excluded_fields = ['ClientID', 'device_id']
            for key, value in device_data.items():
                if key not in excluded_fields:
                    processed_data[key] = value
            
            return cors_response(200, {
                'device_data': processed_data
            })
            
        elif action == 'update_device_data':
            # Validate minimum required fields
            required_fields = ['client_id', 'user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Create new device data entry dynamically
            new_data = {
                'device_id': body['client_id'],
                'ClientID': body['client_id'],
                'timestamp': datetime.utcnow().isoformat(),
                'user_email': body['user_email']
            }
            
            # Dynamically add all other fields from the request body
            for key, value in body.items():
                if key not in ['action', 'client_id', 'user_email', 'device_id', 'ClientID', 'timestamp']:
                    # Convert numeric values to float
                    if isinstance(value, (int, float, Decimal)):
                        new_data[key] = float(value)
                    else:
                        new_data[key] = value
            
            debug_logs.append(f"Storing new data: {json.dumps(new_data)}")
            
            # Save to DynamoDB
            device_data_table.put_item(Item=new_data)
            
            return cors_response(200, {
                'message': 'Device data updated successfully',
                'device_data': new_data
            })
            
        elif action == 'add_device':
            required_fields = ['client_id', 'user_email', 'device_name']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            device_item = create_device_item(body)
            devices_table.put_item(Item=device_item)
            
            return cors_response(200, {
                'message': 'Device added successfully',
                'device': device_item
            })
        
        elif action == 'delete_device':
            required_fields = ['client_id', 'user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            try:
                # Delete from Devices table
                devices_table.delete_item(
                    Key={
                        'client_id': body['client_id'],
                        'user_email': body['user_email']  # Assuming user_email is part of the key schema
                    }
                )
                
                return cors_response(200, {
                    'message': 'Device deleted successfully'
                })
            except Exception as e:
                debug_logs.append(f"Error during device deletion: {str(e)}")
                return cors_response(500, {
                    'error': f"Error during device deletion: {str(e)}",
                    'debug_logs': debug_logs
                })
        
        elif action == 'update_device':
            required_fields = ['client_id', 'user_email']
            for field in required_fields:
                if field not in body:
                    return cors_response(400, {
                        'error': f'Missing required field: {field}',
                        'debug_logs': debug_logs
                    })
            
            # Build update expression dynamically
            update_parts = []
            expr_values = {}
            expr_names = {}
            
            # Map of fields that can be updated
            updateable_fields = {
                'device_name': 'device_name',
                'display_order': 'display_order',
                'device_type': 'device_type',
                'location': 'location',
                'description': 'description',
                'tags': 'tags',
                'settings': 'settings',
                'metrics_visibility': 'metrics_visibility',
                'notifications': 'notifications',
                'maintenance': 'maintenance'
            }
            
            for key, attr_name in updateable_fields.items():
                if key in body:
                    update_parts.append(f'#{attr_name} = :{attr_name}')
                    expr_names[f'#{attr_name}'] = attr_name
                    expr_values[f':{attr_name}'] = body[key]
            
            if update_parts:
                update_expr = 'SET ' + ', '.join(update_parts)
                
                # Update the Key to include both client_id and user_email
                devices_table.update_item(
                    Key={
                        'client_id': body['client_id'],
                        'user_email': body['user_email']  # Add user_email to the key
                    },
                    UpdateExpression=update_expr,
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_values
                )
            
            return cors_response(200, {
                'message': 'Device updated successfully'
            })
        
        else:
            return cors_response(400, {
                'error': f'Invalid action: {action}',
                'debug_logs': debug_logs
            })
        
    except Exception as e:
        debug_logs.append(f"Error: {str(e)}")
        return cors_response(500, {
            'error': str(e),
            'debug_logs': debug_logs
        })

def create_device_item(body):
    """Helper function to create a standardized device item"""
    current_time = datetime.utcnow().isoformat()
    
    return {
        # Core Identity (Required)
        'client_id': body['client_id'],          # Primary key
        'user_email': body['user_email'],        # For user association
        'device_name': body['device_name'],      # Display name
        
        # Timestamps and Status
        'created_at': current_time,
        'last_seen': current_time,
        'status': 'Active',
        'last_updated': current_time,
        
        # Device Information
        'device_info': {
            'type': body.get('device_type', 'Unknown'),
            'model': body.get('model', 'Unknown'),
            'manufacturer': body.get('manufacturer', 'Unknown'),
            'firmware_version': body.get('firmware_version', '1.0.0'),
            'hardware_version': body.get('hardware_version', '1.0.0')
        },
        
        # Location Information
        'location': body.get('location', {
            'name': 'Unknown Location',
            'latitude': None,
            'longitude': None,
            'altitude': None,
            'indoor': False,
            'address': {},
            'zone': None
        }),
        
        # Device Configuration
        'config': {
            'sampling_rate': body.get('sampling_rate', 300),  # seconds
            'transmission_interval': body.get('transmission_interval', 300),
            'power_mode': body.get('power_mode', 'normal'),
            'cellular_config': {
                'apn': body.get('apn', 'default'),
                'network_preference': body.get('network_preference', '4G')
            }
        },
        
        # Metrics Configuration
        'metrics': {
            'supported': body.get('supported_metrics', ['temperature', 'humidity']),
            'visibility': body.get('metrics_visibility', {}),
            'thresholds': body.get('thresholds', {
                'temperature': {'min': -40, 'max': 85},
                'humidity': {'min': 0, 'max': 100},
                'battery': {'min': 10, 'max': 100}
            }),
            'calibration': body.get('calibration', {})
        },
        
        # Alert Configuration
        'alerts': {
            'enabled': body.get('alerts_enabled', True),
            'channels': body.get('alert_channels', {
                'email': {'enabled': True, 'recipients': [body['user_email']]},
                'sms': {'enabled': False, 'recipients': []},
                'webhook': {'enabled': False, 'urls': []}
            }),
            'conditions': body.get('alert_conditions', {
                'battery_low': {'threshold': 20, 'enabled': True},
                'signal_low': {'threshold': 20, 'enabled': True},
                'offline_duration': {'threshold': 3600, 'enabled': True}
            })
        },
        
        # UI/Display Configuration
        'display': {
            'order': body.get('display_order', 0),
            'group': body.get('group', 'default'),
            'color': body.get('color', '#000000'),
            'icon': body.get('icon', 'default'),
            'dashboard_widgets': body.get('dashboard_widgets', ['status', 'metrics'])
        },
        
        # Maintenance Information
        'maintenance': {
            'schedule': {
                'last': current_time,
                'next': None,
                'interval_days': 180
            },
            'history': [],
            'notes': ''
        },
        
        # Tags for Grouping/Filtering
        'tags': body.get('tags', []),
        
        # Custom Fields (for future extensibility)
        'custom_fields': body.get('custom_fields', {}),
        
        # Integration Settings
        'integrations': body.get('integrations', {
            'mqtt': {'enabled': False, 'config': {}},
            'http': {'enabled': True, 'config': {}},
            'third_party': {}
        }),
        
        # Access Control
        'access_control': {
            'owner': body['user_email'],
            'shared_with': [],
            'permissions': body.get('permissions', {
                'read': [body['user_email']],
                'write': [body['user_email']],
                'admin': [body['user_email']]
            })
        }
    } 