# WebSocket Real-Time Updates Setup

This guide explains how to set up WebSocket for real-time device state updates.

## Architecture

```
Device (SIM7080G)
    │
    ▼ (publishes shadow update)
AWS IoT Core Shadow
    │
    ▼ (IoT Rule triggers on shadow update)
Lambda: websocket-broadcast
    │
    ▼ (sends to all connected clients)
API Gateway WebSocket
    │
    ▼
Frontend (React)
```

## AWS Resources to Create

### 1. DynamoDB Table for WebSocket Connections

```bash
aws dynamodb create-table \
    --table-name WebSocketConnections \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region eu-central-1
```

### 2. API Gateway WebSocket API

1. Go to **API Gateway** → **Create API** → **WebSocket API**
2. Configure:
   - **API name**: `DeviceShadowWebSocket`
   - **Route selection expression**: `$request.body.action`
3. Create routes:
   - `$connect` → Lambda: `websocket-connect`
   - `$disconnect` → Lambda: `websocket-disconnect`
   - `$default` → Lambda: `websocket-broadcast` (optional)
4. Deploy to a stage (e.g., `production`)
5. Note the **WebSocket URL**: `wss://xxxxxx.execute-api.eu-central-1.amazonaws.com/production`

### 3. Lambda Functions

Deploy the three Lambda functions:

#### websocket-connect.py
- **Runtime**: Python 3.9+
- **Environment Variables**:
  - `CONNECTIONS_TABLE`: `WebSocketConnections`
- **IAM Permissions**: `dynamodb:PutItem` on `WebSocketConnections`

#### websocket-disconnect.py
- **Runtime**: Python 3.9+
- **Environment Variables**:
  - `CONNECTIONS_TABLE`: `WebSocketConnections`
- **IAM Permissions**: `dynamodb:DeleteItem` on `WebSocketConnections`

#### websocket-broadcast.py
- **Runtime**: Python 3.9+
- **Environment Variables**:
  - `CONNECTIONS_TABLE`: `WebSocketConnections`
  - `WEBSOCKET_ENDPOINT`: `https://xxxxxx.execute-api.eu-central-1.amazonaws.com/production`
- **IAM Permissions**:
  - `dynamodb:Scan`, `dynamodb:DeleteItem` on `WebSocketConnections`
  - `execute-api:ManageConnections` on the WebSocket API

### 4. AWS IoT Rule

Create an IoT Rule to trigger the broadcast Lambda when shadow updates:

1. Go to **AWS IoT Core** → **Message routing** → **Rules**
2. Create rule:
   - **Name**: `ShadowUpdateBroadcast`
   - **SQL**: 
     ```sql
     SELECT *, topic(3) as thingName 
     FROM '$aws/things/+/shadow/update/documents'
     ```
   - **Action**: Lambda → `websocket-broadcast`

### 5. IAM Policy for websocket-broadcast Lambda

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:Scan",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:eu-central-1:*:table/WebSocketConnections"
        },
        {
            "Effect": "Allow",
            "Action": "execute-api:ManageConnections",
            "Resource": "arn:aws:execute-api:eu-central-1:*:*/production/POST/@connections/*"
        }
    ]
}
```

## Frontend Integration

### 1. Add WebSocket URL to Environment

```typescript
// In your config or .env
const WEBSOCKET_URL = 'wss://xxxxxx.execute-api.eu-central-1.amazonaws.com/production';
```

### 2. Use the Hook in DashboardCommands.tsx

```typescript
import { useDeviceShadowWebSocket } from '../../../hooks/useDeviceShadowWebSocket';

// Inside component:
const { isConnected, lastUpdate } = useDeviceShadowWebSocket({
  clientId: device.client_id,
  websocketUrl: WEBSOCKET_URL,
  onStateUpdate: (state) => {
    // Real-time update!
    setOutput1State(state.out1_state === 1);
    setOutput2State(state.out2_state === 1);
    setMotorSpeed(state.motor_speed?.toString() || '0');
    setPowerSavingMode(state.power_saving === 1);
    
    // Clear pending states
    setOutput1Pending(false);
    setOutput2Pending(false);
  },
  enabled: true
});
```

### 3. Update handleSwitchChange

With WebSocket, you can simplify the verification:

```typescript
const handleSwitchChange = async (led: number, isOn: boolean) => {
  // Set pending state
  if (led === 1) {
    setOutput1Pending(true);
    setOutput1State(isOn); // Optimistic
  } else {
    setOutput2Pending(true);
    setOutput2State(isOn); // Optimistic
  }

  try {
    await sendCommand(isOn ? `TOGGLE_${led}_ON` : `TOGGLE_${led}_OFF`);
    // WebSocket will handle the state update automatically!
    // No need for polling/verification
  } catch (error) {
    // Rollback on error
    if (led === 1) {
      setOutput1State(!isOn);
      setOutput1Pending(false);
    } else {
      setOutput2State(!isOn);
      setOutput2Pending(false);
    }
  }
  
  // Timeout fallback if WebSocket doesn't update in 15 seconds
  setTimeout(() => {
    setOutput1Pending(false);
    setOutput2Pending(false);
  }, 15000);
};
```

## Testing

1. **Connect to WebSocket**:
   ```bash
   wscat -c "wss://xxxxxx.execute-api.eu-central-1.amazonaws.com/production?client_id=sim7080_updated"
   ```

2. **Trigger a shadow update** from the device or AWS Console

3. **Verify message received** in wscat

## Benefits

- **Real-time updates**: No polling, instant state changes
- **Reduced API calls**: No need for periodic fetch
- **Better UX**: Immediate feedback when device state changes
- **Efficient**: Only sends updates when state actually changes

## Cost Considerations

- WebSocket connections: ~$1 per million connection minutes
- API Gateway messages: ~$1 per million messages
- Lambda invocations: Standard Lambda pricing
- DynamoDB: Pay per request (very low for connection tracking)

For a typical IoT dashboard with a few active users, expect < $5/month.

