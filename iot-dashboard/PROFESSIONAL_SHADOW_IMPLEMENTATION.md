# Professional Device Shadow Implementation

## 🎯 Architecture Overview

This implementation uses **AWS IoT Device Shadow** as the **exclusive** source of truth for device state, following AWS best practices for professional IoT applications.

## Key Principle

**Frontend → Backend API (Lambda) → Device Shadow desired state → Device processes delta immediately → Device reports back → Frontend reads from Shadow**

## Architecture Clarification

**"Direct Shadow Updates"** means:
- Frontend **directly specifies desired state** (e.g., `{OUT1: 1}`) instead of commands (e.g., `"TOGGLE_1_ON"`)
- Frontend calls **backend API** (`update-device-shadow` Lambda) which updates Shadow
- **No command abstraction layer** - frontend maps UI actions to desired state directly
- Backend Lambda is a **thin layer** that validates and updates Shadow (not a command processor)

**Flow:**
```
Frontend (React)
    ↓ HTTP POST
API Gateway
    ↓ Invoke
Lambda (update-device-shadow.py)
    ↓ boto3.update_thing_shadow()
AWS IoT Core Device Shadow
    ↓ MQTT Delta Topic (QoS 1)
Device (ESP32 + SIM7080G)
    ↓ Process & Apply
Device reports back to Shadow
```

## Why This is Professional

1. **Direct State Specification**: Frontend directly specifies desired state (no command mapping in backend)
2. **Thin Backend Layer**: Lambda is just a validation/update layer, not a command processor
3. **Immediate Processing**: Device is subscribed to delta topics, processes changes instantly
4. **Single Source of Truth**: Shadow is the only source for state (no DynamoDB fallback)
5. **AWS Best Practice**: Uses Shadow as intended by AWS IoT Core
6. **Real-time Sync**: Device processes deltas as soon as they arrive

## Data Flow

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ 1. User clicks "Toggle 1 ON"
       │    Frontend maps to: {OUT1: 1}
       │    HTTP POST to: update-device-shadow API
       ▼
┌─────────────────┐
│  API Gateway    │
│  (HTTP Endpoint)│
└──────┬──────────┘
       │ 2. Invokes Lambda function
       ▼
┌─────────────────┐
│  update-device  │
│  -shadow Lambda  │
│  (Python/boto3) │
└──────┬──────────┘
       │ 3. Validates desired_state
       │    Calls: iot_client.update_thing_shadow()
       │    Updates: {"state":{"desired":{"OUT1":1}}}
       ▼
┌─────────────────┐
│  AWS IoT Core   │
│  Device Shadow  │
└──────┬──────────┘
       │ 4. Generates delta (desired ≠ reported)
       │    Publishes to: $aws/things/{thing}/shadow/update/delta
       │    (MQTT QoS 1 - guaranteed delivery)
       ▼
┌─────────────┐
│   Device    │
│  (SIM7080G) │
│ Subscribed  │
│ to delta    │
│ topic (QoS1)│
└──────┬──────┘
       │ 5. Receives delta immediately
       │    Processes: handleShadowDelta()
       │    Validates: OUT1 must be 0 or 1
       │    Applies: digitalWrite(OUT1_PIN, HIGH)
       │ 6. Updates reported state
       │    {"state":{"reported":{"OUT1":1}}}
       ▼
┌─────────────────┐
│  AWS IoT Core   │
│  Device Shadow  │
└──────┬──────────┘
       │ 7. Shadow syncs (desired = reported)
       │    Delta cleared
       │ 8. Lambda returns current state to frontend
       ▼
┌─────────────┐
│  Frontend   │
│  Updates UI │
│  immediately│
└─────────────┘
```

## Implementation Details

### Backend (Lambda Functions)

#### 1. **update-device-shadow.py** (Primary - Direct Updates)
- **Purpose**: Directly update Device Shadow desired state
- **Input**: `{ "client_id": "...", "desired_state": { "OUT1": 1 } }`
- **Action**: Updates shadow desired state
- **Output**: Returns current state for immediate UI update
- **IAM**: `iot:UpdateThingShadow`, `iot:GetThingShadow`

#### 2. **fetch-device-shadow-state.py** (Read-Only)
- **Purpose**: Read current device state from Shadow
- **Input**: `{ "client_id": "..." }`
- **Action**: Fetches shadow document
- **Output**: Current reported + desired state
- **IAM**: `iot:GetThingShadow`

#### 3. **send-command.py** (Legacy - Special Commands Only)
- **Purpose**: Only for action commands (RESTART) that aren't state changes
- **State commands**: Use `update-device-shadow.py` instead

### Frontend (React Components)

#### **Dashboard.tsx** & **DashboardCommands.tsx**

**New Functions:**
- `updateShadowDesiredState(desiredState)` - Calls backend API to update Shadow
- `fetchDeviceStateFromShadow()` - Calls backend API to read current state from Shadow

**Command Mapping (Frontend - No Backend Mapping):**
```typescript
// Frontend maps UI actions directly to desired state
TOGGLE_1_ON  → {OUT1: 1} → HTTP POST to update-device-shadow API
TOGGLE_1_OFF → {OUT1: 0} → HTTP POST to update-device-shadow API
TOGGLE_2_ON  → {OUT2: 1} → HTTP POST to update-device-shadow API
TOGGLE_2_OFF → {OUT2: 0} → HTTP POST to update-device-shadow API
SET_SPEED    → {motor_speed: 150} → HTTP POST to update-device-shadow API
POWER_SAVING_ON  → {power_saving: 1} → HTTP POST to update-device-shadow API
POWER_SAVING_OFF → {power_saving: 0} → HTTP POST to update-device-shadow API
```

**Flow:**
1. User action → Frontend maps to desired state (e.g., `{OUT1: 1}`)
2. Frontend calls `updateShadowDesiredState({OUT1: 1})`
3. Frontend makes HTTP POST to `update-device-shadow` API (via API Gateway)
4. Lambda validates and calls `iot_client.update_thing_shadow()`
5. AWS IoT Core updates Shadow → Generates delta
6. Device receives delta (already subscribed) → Processes immediately
7. Device updates reported state → Shadow syncs
8. Lambda returns current state → Frontend updates UI immediately

### Device (ESP32 + SIM7080G)

**Already Implemented:**
- ✅ Subscribed to `$aws/things/{thing}/shadow/update/delta`
- ✅ Processes delta in `handleShadowDelta()`
- ✅ Updates reported state in `publishShadowUpdate()`
- ✅ Uses QoS 1 for reliable delivery

**Delta Processing:**
```cpp
// Device receives delta
{"state":{"OUT1":1}}  // Delta format from AWS

// Device processes
handleShadowDelta() → digitalWrite(OUT1_PIN, HIGH)

// Device reports back
publishShadowUpdate({"OUT1":1, ...})
```

## API Endpoints

### Shadow Update API (Primary)
- **URL**: `https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/update-device-shadow`
- **Method**: POST
- **Request**:
  ```json
  {
    "client_id": "sim7080_updated",
    "desired_state": {
      "OUT1": 1,
      "motor_speed": 150
    }
  }
  ```
- **Response**:
  ```json
  {
    "message": "Shadow desired state updated successfully",
    "thingName": "sim7080_updated",
    "desiredState": {"OUT1": 1, "motor_speed": 150},
    "currentState": {
      "out1_state": 0,
      "out2_state": 0,
      "motor_speed": 100,
      ...
    },
    "method": "shadow"
  }
  ```

### Shadow State API (Read-Only)
- **URL**: `https://YOUR_API_GATEWAY_ID.execute-api.eu-central-1.amazonaws.com/default/fetch-device-shadow-state`
- **Method**: POST
- **Request**: `{ "client_id": "sim7080_updated" }`
- **Response**: Current shadow state (reported + desired)

## Benefits

1. **Immediate Processing**: Device processes deltas as soon as they arrive (already subscribed)
2. **No Command Mapping in Backend**: Frontend maps UI actions to desired state directly (backend is thin validation layer)
3. **Real-time Sync**: State syncs immediately between frontend and device
4. **Single Source of Truth**: Shadow is the only source (no confusion)
5. **Offline Support**: Desired state persists even when device is offline
6. **Version Control**: Shadow includes version numbers for conflict resolution
7. **Professional**: Follows AWS IoT Core best practices exactly
8. **Separation of Concerns**: Frontend handles UI logic, Lambda handles validation/Shadow updates, Device handles hardware

## Deployment Checklist

- [ ] Deploy `update-device-shadow.py` Lambda function
- [ ] Attach IAM policy (`update-device-shadow-iam-policy.json`)
- [ ] Create API Gateway endpoint for `update-device-shadow`
- [ ] Update `SHADOW_UPDATE_API_URL` in frontend code
- [ ] Deploy `fetch-device-shadow-state.py` Lambda function
- [ ] Create API Gateway endpoint for `fetch-device-shadow-state`
- [ ] Update `SHADOW_STATE_API_URL` in frontend code
- [ ] Verify device is subscribed to delta topics (already done)
- [ ] Test command flow end-to-end

## Testing

1. **Test Direct Shadow Update:**
   - Frontend updates `{OUT1: 1}`
   - Verify Shadow desired state updates
   - Verify device receives delta
   - Verify device processes and reports back

2. **Test State Fetching:**
   - Fetch state from Shadow
   - Verify correct format
   - Verify UI updates correctly

3. **Test Error Handling:**
   - Break Shadow API
   - Verify error shown (no fallback)
   - Verify user can retry

## Comparison: Old vs New

### Old Architecture (Command-Based)
```
Frontend → send-command Lambda → Maps command → Updates Shadow
```
- Extra layer (command mapping)
- Slower (extra Lambda call)
- Less direct

### New Architecture (Direct Shadow Updates)
```
Frontend → update-device-shadow Lambda → Updates Shadow
```
- Direct updates
- Faster (one Lambda call)
- More professional
- Device processes immediately (already subscribed)

## Summary

This implementation is **professional** because:
- ✅ **Frontend maps UI actions to desired state** (no command abstraction in frontend)
- ✅ **Backend is thin validation layer** (just validates and updates Shadow, doesn't map commands)
- ✅ **Device processes deltas immediately** (already subscribed to delta topics)
- ✅ **Single source of truth** (Shadow only, no DynamoDB fallback)
- ✅ **Follows AWS IoT Core best practices** (uses Shadow as intended)
- ✅ **Real-time synchronization** (device processes deltas as soon as they arrive)
- ✅ **Clean, maintainable architecture** (separation of concerns: UI logic in frontend, validation in Lambda, hardware control in device)

**Architecture Pattern:**
- **Frontend**: UI logic + state mapping (what the user wants)
- **Backend (Lambda)**: Thin validation layer (validates and updates Shadow)
- **AWS IoT Core**: State management (Shadow)
- **Device**: Hardware control (processes deltas, applies changes)

