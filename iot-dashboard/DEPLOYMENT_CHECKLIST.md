# Device Shadow Integration - Deployment Checklist

## ✅ Completed Changes

### Backend (Lambda Functions)
- [x] **send-command.py**: Updated to return current shadow state after command
- [x] **fetch-device-shadow-state.py**: New Lambda function to fetch from Device Shadow

### Frontend (React Components)
- [x] **Dashboard.tsx**: Added `fetchDeviceStateFromShadow()` with fallback
- [x] **Dashboard.tsx**: Updated `onCommandSend()` to use shadow state
- [x] **DashboardCommands.tsx**: Added `fetchDeviceStateFromShadow()` function
- [x] **DashboardCommands.tsx**: Updated `handleSwitchChange()` to use shadow state
- [x] **DashboardCommands.tsx**: Updated `handlePowerSavingChange()` to use shadow state

## 🔧 Deployment Steps

### 1. Deploy New Lambda Function

```bash
# Create Lambda function: fetch-device-shadow-state
# Runtime: Python 3.9+
# Handler: lambda_function.lambda_handler
# Timeout: 10 seconds
# Memory: 128 MB
```

**IAM Policy Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:GetThingShadow"
      ],
      "Resource": [
        "arn:aws:iot:eu-central-1:*:thing/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### 2. Create API Gateway Endpoint

1. Create new API Gateway REST API endpoint
2. Create POST method pointing to `fetch-device-shadow-state` Lambda
3. Enable CORS
4. Deploy to stage (e.g., `default`)
5. **Copy the API Gateway URL** and update frontend code

### 3. Update Frontend Configuration

**File: `Dashboard.tsx`**
```typescript
// Replace YOUR_API_GATEWAY_ID with actual API Gateway ID
const SHADOW_STATE_API_URL = "https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state";
```

**File: `DashboardCommands.tsx`**
```typescript
// Replace YOUR_API_GATEWAY_ID with actual API Gateway ID
const SHADOW_STATE_API_URL = 'https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state';
```

### 4. Test the Integration

1. **Test Command Flow:**
   - Send a command (e.g., TOGGLE_1_ON)
   - Verify state updates immediately from command response
   - Verify UI reflects the change

2. **Test Shadow API:**
   - Call `fetchDeviceStateFromShadow()` directly
   - Verify it returns correct state format
   - Verify fallback to DynamoDB if Shadow fails

3. **Test Fallback:**
   - Temporarily break Shadow API
   - Verify fallback to DynamoDB works
   - Verify UI still updates correctly

## 📋 Configuration Checklist

- [ ] Lambda function `fetch-device-shadow-state` deployed
- [ ] IAM policy attached to Lambda execution role
- [ ] API Gateway endpoint created and deployed
- [ ] CORS enabled on API Gateway
- [ ] Frontend `SHADOW_STATE_API_URL` updated with actual API Gateway URL
- [ ] Frontend code deployed/updated
- [ ] Tested command flow with shadow state
- [ ] Tested fallback to DynamoDB

## 🐛 Troubleshooting

### Issue: Shadow API returns 404
- **Check**: Thing name matches `client_id`
- **Check**: IAM policy allows `iot:GetThingShadow`
- **Check**: Thing exists in AWS IoT Core

### Issue: State not updating after command
- **Check**: Command response includes `currentState`
- **Check**: Frontend is parsing `currentState` correctly
- **Check**: Device is actually updating shadow

### Issue: Fallback not working
- **Check**: DynamoDB API URL is correct
- **Check**: Error handling in `fetchDeviceStateFromShadow()`
- **Check**: Console logs for error messages

## 📊 Expected Behavior

1. **Command Sent** → Shadow updated with desired state
2. **Command Response** → Includes current state (immediate UI update)
3. **If no currentState** → Fetch from Shadow API (2s delay)
4. **If Shadow fails** → Fallback to DynamoDB (historical data)

## 🎯 Success Criteria

- ✅ Commands update device state via Shadow
- ✅ UI updates immediately after command (from response)
- ✅ Shadow API returns correct state format
- ✅ Fallback to DynamoDB works if Shadow unavailable
- ✅ All device states (OUT1, OUT2, motor_speed, etc.) are correct

