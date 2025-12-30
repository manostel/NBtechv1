# Device Shadow Only Architecture

## Overview

This system uses **AWS IoT Device Shadow exclusively** as the source of truth for device state. There is **no fallback** to DynamoDB for state management.

## Architecture Principles

1. **Device Shadow is the ONLY source** for device state
2. **No DynamoDB fallback** - if Shadow fails, show error to user
3. **DynamoDB is only used** for historical telemetry data (sensor readings)
4. **Commands update Shadow** → Device processes → Shadow reports → Frontend reads from Shadow

## Data Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 1. Send Command
       ▼
┌─────────────────┐
│  send-command   │
│     Lambda      │
└──────┬──────────┘
       │ 2. Update Shadow (desired state)
       ▼
┌─────────────────┐
│  AWS IoT Core   │
│  Device Shadow  │
└──────┬──────────┘
       │ 3. Generate Delta
       ▼
┌─────────────┐
│   Device    │
│  (SIM7080G) │
└──────┬──────┘
       │ 4. Process Delta, Apply Changes
       │ 5. Update Shadow (reported state)
       ▼
┌─────────────────┐
│  AWS IoT Core   │
│  Device Shadow  │
└──────┬──────────┘
       │ 6. Frontend fetches from Shadow
       ▼
┌─────────────┐
│  Frontend   │
│  (UI Update)│
└─────────────┘
```

## State Management

### Device State (Shadow Only)
- `OUT1`, `OUT2` - Output states
- `motor_speed` - Motor speed (0-255)
- `power_saving` - Power saving mode
- `IN1`, `IN2` - Input states
- `charging` - Charging status
- `connection_status` - Connection status

### Telemetry Data (DynamoDB)
- `temperature` - Sensor readings
- `humidity` - Sensor readings
- `pressure` - Sensor readings
- `battery` - Battery level
- `signal_quality` - Signal quality

## API Endpoints

### 1. Command API
- **URL**: `https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command`
- **Purpose**: Send commands to device via Shadow
- **Returns**: Command result + current shadow state

### 2. Shadow State API
- **URL**: `https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state`
- **Purpose**: Fetch current device state from Shadow
- **Returns**: Current shadow state (reported + desired)

## Error Handling

### If Shadow API Fails:
1. Show error message to user
2. Log error for debugging
3. **Do NOT** fallback to DynamoDB
4. User can retry manually

### If Command Fails:
1. Show error message to user
2. State remains unchanged
3. User can retry command

## Benefits of Shadow-Only Architecture

1. **Single Source of Truth**: No confusion about which data is current
2. **Real-time State**: Shadow reflects device state immediately
3. **Offline Support**: Desired state persists even when device is offline
4. **Version Control**: Shadow includes version numbers for conflict resolution
5. **Simpler Architecture**: No need to sync between Shadow and DynamoDB
6. **AWS Best Practice**: Using Shadow as intended by AWS

## Migration Notes

- ✅ All `fetchDeviceState()` calls now use `fetchDeviceStateFromShadow()`
- ✅ Removed all DynamoDB fallback logic
- ✅ Removed `STATUS_API_URL` references for state fetching
- ✅ Error handling updated to show errors instead of falling back

## Testing

1. **Test Command Flow:**
   - Send command → Verify Shadow updates
   - Verify UI updates from command response
   - Verify Shadow API returns correct state

2. **Test Error Handling:**
   - Break Shadow API → Verify error shown (no fallback)
   - Verify user can retry

3. **Test State Sync:**
   - Verify device state matches Shadow
   - Verify UI reflects Shadow state

