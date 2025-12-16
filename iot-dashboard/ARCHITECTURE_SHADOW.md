# Device Shadow Architecture - Frontend & Backend Integration

## Overview

This document describes the architecture for using AWS IoT Device Shadow as the **source of truth** for device state, replacing DynamoDB-based state fetching after commands.

## Architecture Decision

### **Source of Truth: Device Shadow (Exclusive)**
- **Device Shadow** is the **ONLY** source for device state
- **No fallback** to DynamoDB - Shadow is the single source of truth
- Commands are sent via Device Shadow, and state is fetched from Shadow immediately after
- DynamoDB is only used for historical telemetry data (sensor readings), not for device state

## Backend Changes

### 1. **update-device-shadow.py** (New - Professional Approach)
- ✅ **Direct Shadow Updates**: Frontend directly updates Device Shadow desired state
- ✅ **Immediate Processing**: Device is subscribed to delta topics, processes immediately
- ✅ Returns current shadow state in response for immediate UI update
- ✅ **No Command Mapping**: Frontend maps commands to desired state directly

### 2. **send-command.py** (Legacy - For Special Commands)
- ✅ Used only for action commands (e.g., RESTART) that aren't state changes
- ✅ State-changing commands now use `update-device-shadow.py` directly

**Response Format:**
```json
{
  "message": "Command sent successfully via Device Shadow",
  "thingName": "sim7080_updated",
  "desiredState": {"OUT1": 1},
  "currentState": {
    "out1_state": 0,
    "out2_state": 0,
    "motor_speed": 100,
    "power_saving": 0,
    "in1_state": 0,
    "in2_state": 0,
    "charging": 0,
    "connection_status": "connected"
  },
  "method": "shadow"
}
```

### 3. **fetch-device-shadow-state.py** (Read-Only)
- Fetches device state directly from Device Shadow
- Maps shadow format to frontend format
- Returns state with metadata (version, timestamp, desired state)
- Used for reading current state, not for updates

**Request:**
```json
{
  "client_id": "sim7080_updated"
}
```

**Response:**
```json
{
  "message": "Device shadow state retrieved successfully",
  "state": {
    "client_id": "sim7080_updated",
    "timestamp": 1234567890,
    "version": 42,
    "out1_state": 1,
    "out2_state": 0,
    "motor_speed": 150,
    "power_saving": 0,
    "in1_state": 0,
    "in2_state": 1,
    "charging": 1,
    "connection_status": "connected",
    "desired": {
      "out1_state": 1,
      "motor_speed": 150
    }
  },
  "source": "shadow"
}
```

## Frontend Changes

### 1. **Dashboard.tsx** (Updated)
- ✅ **NEW**: `fetchDeviceStateFromShadow()` function
- ✅ **UPDATED**: `onCommandSend()` now uses shadow state after commands
- ✅ Falls back to DynamoDB if Shadow fails

**Flow:**
1. Send command via `send-command` API
2. If response includes `currentState`, use it immediately
3. Otherwise, fetch from Shadow API
4. If Shadow fails, show error (no fallback)

### 2. **DashboardCommands.tsx** (Updated)
- ✅ **NEW**: `fetchDeviceStateFromShadow()` function
- ✅ **UPDATED**: `handleSwitchChange()` and `handlePowerSavingChange()` use Shadow
- ✅ Reduced wait times (2s + 5s instead of 5s + 10s) since Shadow is faster

## State Mapping

### Frontend → Device Shadow (Desired State)

| Frontend Command | Shadow Desired State | Notes |
|-----------------|---------------------|-------|
| `TOGGLE_1_ON` | `{ "OUT1": 1 }` | Direct update |
| `TOGGLE_1_OFF` | `{ "OUT1": 0 }` | Direct update |
| `TOGGLE_2_ON` | `{ "OUT2": 1 }` | Direct update |
| `TOGGLE_2_OFF` | `{ "OUT2": 0 }` | Direct update |
| `SET_SPEED` | `{ "motor_speed": 150 }` | Direct update |
| `POWER_SAVING_ON` | `{ "power_saving": 1 }` | Direct update |
| `POWER_SAVING_OFF` | `{ "power_saving": 0 }` | Direct update |

### Device Shadow Format → Frontend Format (Reported State)

| Shadow Field | Frontend Field | Notes |
|-------------|----------------|-------|
| `OUT1` | `out1_state` | 0 or 1 |
| `OUT2` | `out2_state` | 0 or 1 |
| `motor_speed` | `motor_speed` | 0-255 |
| `power_saving` | `power_saving` | 0 or 1 |
| `IN1` | `in1_state` | 0 or 1 |
| `IN2` | `in2_state` | 0 or 1 |
| `charging` | `charging` | 0 or 1 |
| `connection_status` | `connection_status` | "connected" or "disconnected" |

## API Endpoints

### Shadow Update API (Professional - Direct Updates)
- **URL**: `https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow`
- **Method**: POST
- **Purpose**: Directly update Device Shadow desired state
- **Request**: `{ "client_id": "...", "desired_state": { "OUT1": 1 } }`
- **Returns**: Update result + current state

### Shadow State API (Read-Only)
- **URL**: `https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state`
- **Method**: POST
- **Purpose**: Read current device state from Shadow
- **Returns**: Current device state from Shadow

### Command API (Legacy - For Special Commands)
- **URL**: `https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command`
- **Method**: POST
- **Purpose**: Only for action commands (e.g., RESTART) that aren't state changes
- **Returns**: Command result

### DynamoDB State API (Deprecated for State)
- **Note**: DynamoDB is no longer used for device state
- DynamoDB is only used for historical telemetry data (sensor readings)
- All device state comes exclusively from Device Shadow

## Deployment Steps

1. **Deploy new Lambda functions:**
   ```bash
   # Create Lambda function: update-device-shadow
   # Attach IAM policy with iot:UpdateThingShadow and iot:GetThingShadow permissions
   
   # Create Lambda function: fetch-device-shadow-state
   # Attach IAM policy with iot:GetThingShadow permission
   ```

2. **Create API Gateway endpoints:**
   - Create API Gateway endpoint for `update-device-shadow`
   - Create API Gateway endpoint for `fetch-device-shadow-state`
   - Update `SHADOW_UPDATE_API_URL` and `SHADOW_STATE_API_URL` in frontend code

3. **Update frontend:**
   - Deploy updated `Dashboard.tsx` and `DashboardCommands.tsx`
   - Test command flow with direct Shadow updates
   - Verify device processes deltas immediately

## Benefits

1. **Immediate Processing**: Device is subscribed to delta topics, processes changes instantly
2. **Direct Updates**: Frontend directly updates Shadow, no intermediate command mapping
3. **Real-time State**: Shadow reflects device state immediately after commands
4. **No Stale Data**: Shadow is always current, single source of truth
5. **Offline Support**: Shadow persists desired state even when device is offline
6. **Version Control**: Shadow includes version numbers for conflict resolution
7. **Faster Updates**: Reduced wait times (2s + 5s vs 5s + 10s)
8. **Professional Architecture**: Follows AWS IoT Core best practices

## State Fetching Strategy

```
Command Sent
    ↓
Try Shadow State (immediate from command response)
    ↓ (if not available)
Fetch from Shadow API (2s delay)
    ↓ (if fails)
Show error to user (no fallback)
```

## Testing Checklist

- [ ] Shadow update API works correctly
- [ ] Frontend directly updates Shadow desired state
- [ ] Device receives delta and processes immediately
- [ ] State updates immediately after command
- [ ] Shadow state API returns correct state format
- [ ] Error handling works correctly if Shadow fails
- [ ] UI updates correctly with shadow state
- [ ] All device states (OUT1, OUT2, motor_speed, etc.) are correct
- [ ] No DynamoDB fallback is used (Shadow only)
- [ ] Device delta subscription works correctly

