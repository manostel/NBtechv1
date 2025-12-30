# 🛰️ GPS Data Troubleshooting Guide

## 🔍 **Current Issue:**
GPS Lambda returns `null` for all GPS fields, meaning no GPS data is found in the `IoT_DeviceGPS` DynamoDB table.

---

## ✅ **What I Fixed:**

1. **Enhanced Field Name Support** - Lambda now checks multiple field name variations:
   - `lat` / `latitude` / `Lat` / `Latitude`
   - `lon` / `longitude` / `Lon` / `Longitude`
   - `alt` / `altitude` / `Alt` / `Altitude`
   - `sats` / `satellites` / `Sats` / `Satellites`

2. **Better Error Handling** - Falls back to `scan` if `query` fails (in case table structure is different)

3. **Enhanced Logging** - Lambda now logs:
   - When querying each device
   - How many items found
   - Field names in the data
   - Any errors encountered

---

## 🔍 **Diagnosis Steps:**

### **Step 1: Check if Device is Publishing GPS**

Check your device logs (PlatformIO Monitor) for:
```
📤 Publishing GPS with timestamp...
✅ GPS published
```

**If you don't see this:**
- GPS might be disabled on device
- Device might not have GPS signal
- GPS publishing interval might be too long

---

### **Step 2: Check IoT Rule Configuration**

The device publishes GPS to MQTT topic (likely `/gps` or similar). You need an **IoT Rule** that:
1. Listens to the GPS topic
2. Writes data to `IoT_DeviceGPS` DynamoDB table

**Check AWS Console:**
1. Go to **IoT Core** → **Rules**
2. Look for a rule that handles GPS data
3. Check if it writes to `IoT_DeviceGPS` table

**If no rule exists**, you need to create one. Example SQL:
```sql
SELECT 
  client_id() as client_id,
  timestamp() as timestamp,
  lat,
  lon,
  alt,
  sats
FROM 'gps/+/data'
```

**Action:** Write to DynamoDB table `IoT_DeviceGPS` with:
- **Partition key:** `client_id`
- **Sort key:** `timestamp` (if table has one)

---

### **Step 3: Check Table Structure**

**In AWS Console → DynamoDB → Tables → IoT_DeviceGPS:**

Check:
1. **Partition Key:** Should be `client_id` (String)
2. **Sort Key:** Might be `timestamp` (String/Number) - check this!
3. **Field Names:** Check what fields actually exist in the table

**If table structure is different:**
- Update the Lambda query to match your table structure
- Or update the IoT Rule to write with correct field names

---

### **Step 4: Check CloudWatch Logs**

After deploying the updated Lambda, check CloudWatch logs:

1. Go to **CloudWatch** → **Log Groups** → Find your GPS Lambda
2. Look for logs like:
   ```
   Querying GPS data for client_id: sim7080_updated
   Query response for sim7080_updated: 0 items found
   ℹ️ No GPS data found in IoT_DeviceGPS table for sim7080_updated
   ```

**This will tell you:**
- ✅ If query is working
- ✅ If data exists but field names are wrong
- ✅ If no data exists at all

---

## 🛠️ **Quick Fixes:**

### **Fix 1: If Table Has Sort Key**

If `IoT_DeviceGPS` has a sort key (like `timestamp`), the query needs to be different:

```python
# Current (no sort key):
KeyConditionExpression='client_id = :client_id'

# If sort key exists (timestamp):
KeyConditionExpression='client_id = :client_id AND #ts <= :now'
ExpressionAttributeNames={'#ts': 'timestamp'}
ExpressionAttributeValues={':client_id': client_id, ':now': datetime.utcnow().isoformat()}
```

### **Fix 2: If Field Names Are Different**

Check what fields are actually in the table, then update the Lambda to match.

### **Fix 3: Create IoT Rule (If Missing)**

If no IoT Rule exists to write GPS data:

1. **IoT Core** → **Rules** → **Create**
2. **SQL Query:**
   ```sql
   SELECT 
     client_id() as client_id,
     timestamp() as timestamp,
     lat, lon, alt, sats
   FROM 'your/gps/topic'
   ```
3. **Action:** DynamoDB → `IoT_DeviceGPS`
4. **Partition Key:** `client_id`
5. **Sort Key:** `timestamp` (if table has one)

---

## 📊 **Expected Data Flow:**

```
Device (SIM7080G)
  ↓ (Publishes GPS via MQTT)
MQTT Topic: /gps or /device/gps
  ↓ (IoT Rule processes)
IoT Rule writes to DynamoDB
  ↓ (Stored in table)
IoT_DeviceGPS Table
  ↓ (Lambda queries)
fetch-devices-gps Lambda
  ↓ (Returns to frontend)
Devices Page Map View
```

---

## 🧪 **Test After Fixes:**

1. **Deploy updated Lambda:**
   ```bash
   # Upload: fetch-devices-gps.zip to AWS Lambda
   ```

2. **Check CloudWatch Logs:**
   - Should see detailed logging about queries
   - Will show if data exists or not

3. **Test from Frontend:**
   - Open Devices page
   - Check browser console for GPS fetch
   - Check if map shows device location

---

## 💡 **Alternative: Use Fixed Location**

If GPS isn't working, you can still use the **Fixed Location** feature:
- Click 📍 icon on device card
- Set location manually on map
- Device will show on map with orange "Fixed" marker

---

## 📝 **Next Steps:**

1. ✅ Deploy updated `fetch-devices-gps.zip` Lambda
2. 🔍 Check CloudWatch logs for detailed diagnostics
3. 🔧 Verify IoT Rule exists and is configured correctly
4. 📊 Check DynamoDB table structure
5. 🧪 Test GPS data flow end-to-end

**Let me know what the CloudWatch logs show after deploying!** 🚀

