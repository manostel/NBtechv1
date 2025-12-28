# 🗺️ Device Location Feature - Deployment Guide

## ✅ What's Been Implemented

### **Frontend:**
- ✅ **LocationPicker Component** - Interactive map with click-to-set location
- ✅ **Manual Coordinate Entry** - Type latitude/longitude directly  
- ✅ **Use Current Location** - Button to use browser's geolocation
- ✅ **Set Location Button** - Added to each device card (pin icon)
- ✅ **Visual Feedback** - Tooltips, markers, and save confirmation

### **Backend:**
- ✅ **`set_device_location` Action** - New Lambda handler in `fetch-devices.py`
- ✅ **DynamoDB Storage** - Stores `fixed_latitude`, `fixed_longitude`, and `location_set_at`
- ✅ **CORS Support** - Properly configured for web requests

---

## 📦 **Step 1: Deploy Backend (Lambda)**

### **Upload Updated Lambda:**

1. Go to **AWS Console** → **Lambda**
2. Find the function: `fetch-devices` (or whatever name handles `/default/fetch/devices`)
3. Click **Upload from** → **.zip file**
4. Upload: `/home/telectronio/dev/NBtechv1/iot-dashboard/src/lambda/fetch-devices.zip`
5. Click **Save**

### **Verify Deployment:**

Test the Lambda with this payload:
```json
{
  "action": "set_device_location",
  "user_email": "your@email.com",
  "client_id": "your_device_id",
  "latitude": 37.9838,
  "longitude": 23.7275
}
```

Expected response:
```json
{
  "success": true,
  "message": "Device location set successfully"
}
```

---

## 🚀 **Step 2: Deploy Frontend**

The frontend is already updated! Just **refresh your browser** or **restart the dev server**:

```bash
cd /home/telectronio/dev/NBtechv1/iot-dashboard
npm start
```

---

## 📖 **How to Use**

### **Setting a Device Location:**

1. **Open Devices Page**
2. **Find your device card**
3. **Click the 📍 (Location) icon** (next to Bluetooth icon)
4. **In the Location Picker dialog:**
   - **Click on the map** to set location
   - **OR type coordinates** in the Latitude/Longitude fields
   - **OR click the "Current Location" button** to use your browser's location
5. **Click "Save Location"**

### **Viewing the Location:**

Once set, the device will show its fixed location on:
- ✅ The **Map View** tab (if you have one)
- ✅ The device's **info/details**
- ✅ **GPS data fallback** - if device has no real GPS, uses the fixed location

---

## 🗃️ **Database Schema**

The `Devices` table now stores:

| Field | Type | Description |
|-------|------|-------------|
| `fixed_latitude` | Decimal | Manually set latitude |
| `fixed_longitude` | Decimal | Manually set longitude |
| `location_set_at` | String | ISO timestamp of when location was set |

---

## 🎨 **UI Features**

### **LocationPicker Component:**
- 🗺️ **Interactive OpenStreetMap**
- 📍 **Click anywhere to set location**
- 🎯 **Manual coordinate entry** with validation
- 📱 **"Use my location"** button for quick setup
- ✅ **Real-time preview** of selected coordinates
- ⚠️ **Error handling** for invalid coordinates

### **Device Card Integration:**
- 📍 **Location icon button** with tooltip
- 🎨 **Consistent with existing UI** (matches Bluetooth button style)
- ⚡ **One-click access** to location picker

---

## 🔧 **Configuration**

### **Default Map Center:**
Currently set to **Athens, Greece** (37.9838, 23.7275)

To change, edit `/home/telectronio/dev/NBtechv1/iot-dashboard/src/features/devices/components/LocationPicker.tsx`:

```typescript
const defaultCenter: [number, number] = position || [YOUR_LAT, YOUR_LNG];
```

### **Map Tile Provider:**
Currently using **OpenStreetMap** (free, no API key needed)

To use Google Maps or Mapbox, modify the `<TileLayer>` in `LocationPicker.tsx`.

---

## 🚨 **Troubleshooting**

### **"Cannot read property 'map' of undefined"**
- Make sure Leaflet CSS is imported: `import 'leaflet/dist/leaflet.css';`
- Clear browser cache and restart dev server

### **Map not showing:**
- Check browser console for errors
- Verify Leaflet is installed: `npm list leaflet`
- Make sure map container has a height

### **Location not saving:**
- Check Lambda logs in CloudWatch
- Verify `user_email` and `client_id` match the device
- Check DynamoDB permissions for the Lambda role

### **"Geolocation not supported":**
- This is a browser limitation (old browsers)
- Use manual coordinate entry or click on map instead

---

## 📝 **Next Steps / Enhancements**

Potential improvements:
- [ ] Display fixed location as a badge on device card
- [ ] Add "Remove Location" button
- [ ] Search by address (geocoding API)
- [ ] Draw radius/geofence around location
- [ ] Show distance between device GPS and fixed location
- [ ] Bulk set location for multiple devices

---

## 🎉 **That's It!**

You can now set fixed locations for your devices! This is useful for:
- 📍 Devices without GPS hardware
- 🏢 Stationary installations
- 🗺️ Organizing devices by physical location
- 📊 Location-based analytics

**Enjoy your new location feature!** 🚀

