# AWS IoT Rules Update for Flattened Telemetry Data

This document contains the SQL statements needed to update AWS IoT Core Rules after flattening the telemetry payload structure.

## Field Mapping
- `timestamp` → `ts`
- `data.temperature` → `t`
- `data.humidity` → `h`
- `data.pressure` → `p`
- `data.battery` → `b`
- `data.signal_quality` → `s`

## Rule Updates

### 1. StoreIoTData Rule

**Location**: AWS IoT Core Console → Rules → StoreIoTData

**Current SQL**:
```sql
SELECT client_id, device, timestamp, data.temperature AS temperature, 
       data.thermistor_temp AS thermistor_temp, data.humidity AS humidity, 
       data.battery AS battery, data.signal_quality AS signal_quality, 
       data.motor_speed AS motor_speed, data.pressure AS pressure 
FROM 'NBtechv1/+/data'
```

**New SQL**:
```sql
SELECT
    topic(2)                    AS client_id,
    ts                           AS timestamp,
    floor(timestamp() / 1000)   AS epoch,
    floor(timestamp() / 1000) + 2592000 AS ttl,
    t                            AS temperature,
    h                            AS humidity,
    b                            AS battery,
    s                            AS signal_quality
FROM 'NBtechv1/+/data'
```

**Action**: 
1. Go to AWS IoT Core Console → Rules → StoreIoTData
2. Click "Edit"
3. Replace the SQL statement with the new SQL above
4. Save the rule

**Note**: The rule now extracts `client_id` from the topic using `topic(2)` instead of from the payload. The `epoch` and `ttl` fields are added for DynamoDB TTL support.

---

### 2. SubscriptionDataTriggerRule

**Location**: AWS IoT Core Console → Rules → SubscriptionDataTriggerRule

**Current SQL**:
```sql
SELECT *, topic() as topic FROM 'NBtechv1/+/data'
```

**New SQL**:
```sql
SELECT
    topic(2)                  AS client_id,
    topic()                   AS topic,
    ts                         AS timestamp,
    floor(timestamp() / 1000) AS epoch,
    t                          AS temperature,
    h                          AS humidity,
    b                          AS battery,
    s                          AS signal_quality
FROM 'NBtechv1/+/data'
```

**Note**: TTL is not needed since this rule only triggers the Lambda and doesn't write to DynamoDB. The full `topic()` is included for debugging and logging purposes.

**Action**:
1. Go to AWS IoT Core Console → Rules → SubscriptionDataTriggerRule
2. Click "Edit"
3. Replace the SQL statement with the new SQL above
4. Save the rule

**Note**: The rule now explicitly selects flattened fields and maps them to full names for the Lambda function. The Lambda will normalize these fields internally.

---

## Deployment Order

1. **Deploy firmware update** - Devices will start sending flattened payloads
2. **Update AWS IoT Rules** - Rules will start processing flattened fields
3. **Deploy Lambda update** - Lambda will normalize fields for subscriptions/alarms

**Important**: There may be a brief period where old firmware sends nested data while new rules expect flattened data, or vice versa. Consider deploying during a low-traffic period or with device-by-device rollout.

---

## Verification

After updating the rules, verify:

1. **StoreIoTData Rule**: Check that data is being written to DynamoDB `IoT_DeviceData` table with correct field names
2. **SubscriptionDataTriggerRule**: Check CloudWatch logs for the `iot-subscription-trigger` Lambda to ensure it receives flattened fields and normalizes them correctly
3. **Subscriptions/Alarms**: Verify that existing subscriptions and alarms continue to work with the normalized field names

