# IoT Dashboard - Quick Start Guide

## 🚀 What is This?

A **React-based IoT Dashboard** that runs as both a **web app** and **Android native app**, allowing you to monitor and control IoT devices via:
- **Cloud (AWS IoT)** - Real-time data from devices
- **Bluetooth** - Direct local control when device is nearby

---

## 📱 Platforms

### Web Application
- Runs in any modern browser
- URL: `http://localhost:3000` (dev) or deployed URL
- Full feature set available

### Android Application
- Native Android app via Capacitor
- Requires Android 5.0+ (API 21+)
- Same codebase as web, with native features:
  - Bluetooth LE scanning/connection
  - Push notifications
  - Haptic feedback
  - Status bar control

---

## 🏗️ Technology Stack (Summary)

| Category | Technology |
|----------|-----------|
| **Framework** | React 18.2 |
| **UI Library** | Material-UI (MUI) 5 |
| **Routing** | React Router 6 |
| **Mobile** | Capacitor 7 |
| **Charts** | Chart.js + react-chartjs-2 |
| **Maps** | Leaflet / Google Maps |
| **HTTP** | Axios / Fetch API |
| **Backend** | AWS Lambda + DynamoDB |
| **IoT** | AWS IoT Core (MQTT) |
| **BLE** | Capacitor Bluetooth LE Plugin |

---

## 📂 Key Directories

```
src/
├── components/        # All React components
│   ├── Dashboard.js  # Main dashboard (most important)
│   ├── DevicesPage.js
│   └── dashboard2/   # Dashboard sub-components
├── context/          # React Context providers
├── hooks/           # Custom React hooks
├── services/        # Business logic services
├── utils/           # Utility functions
└── lambda/          # AWS Lambda function code (Python)
```

---

## 🔑 Key Concepts

### 1. **Component Hierarchy**
```
App.js (Root)
  ├── Router
  │   ├── LoginPage
  │   ├── DevicesPage (List devices)
  │   └── Dashboard (Device detail view)
  │       ├── DashboardHeader
  │       ├── DashboardContent
  │       ├── DashboardCharts
  │       └── DashboardCommands
```

### 2. **Data Flow**
```
Device (ESP32)
  │
  ├─> Publishes to AWS IoT Core (MQTT)
  │       │
  │       └─> Lambda stores in DynamoDB
  │
  └─> Dashboard fetches from Lambda API
          │
          └─> Updates React state
              └─> UI renders
```

### 3. **State Management**
- **Local State**: `useState` hooks in components
- **Global State**: React Context (Theme, Loading)
- **Service State**: GlobalTimerService (EventEmitter pattern)

---

## 🛠️ Common Tasks

### Starting Development

```bash
cd iot-dashboard
npm install
npm start
# Opens http://localhost:3000
```

### Building for Production

```bash
npm run build
# Creates optimized build in build/ folder
```

### Building Android App

```bash
npm run build
npx cap sync android
npx cap open android
# Then build in Android Studio
```

### Testing Bluetooth (Android only)

```bash
# Deploy to Android device
# Navigate to /bluetooth route
# Scan and connect to ESP32 device
```

---

## 📊 Main Features Explained

### 1. **Device Monitoring**
- Real-time sensor data (temperature, humidity, pressure)
- Battery level monitoring
- Signal strength indicators
- Device online/offline status

### 2. **Device Control**
- Toggle outputs (LED1, LED2)
- Set motor speed
- Restart device
- Power saving mode toggle

### 3. **Data Visualization**
- Line charts for historical data
- Time range selection (1h, 6h, 24h, 7d, 30d)
- Zoom and pan capabilities
- Multiple variable overlays

### 4. **Alarms**
- Configure threshold-based alarms
- Variable selection (temperature, battery, etc.)
- Condition operators (>, <, ==)
- Enable/disable alarms

### 5. **Subscriptions**
- Real-time variable monitoring
- Automatic notifications on threshold crossing
- WebSocket/SSE for live updates

### 6. **Bluetooth Control**
- Direct BLE connection to ESP32
- Local device control (no internet needed)
- Real-time status reading
- Command execution

---

## 🔌 API Integration

### Endpoint Structure
All APIs go through AWS API Gateway → Lambda Functions

### Common API Calls

**Login**:
```javascript
POST /api/auth-login
Body: { email, password, action: 'login' }
```

**Get Devices**:
```javascript
POST /api/fetch-devices
Body: { action: 'get_devices', user_email }
```

**Get Device Data**:
```javascript
POST /api/fetch-devices-data
Body: { action: 'get_device_data', client_id, user_email }
```

**Send Command**:
```javascript
POST /api/send-command
Body: { client_id, command: 'TOGGLE_1_ON' }
```

---

## 📱 Mobile Features (Android)

### Permissions Required
- Bluetooth (scan, connect)
- Location (for BLE scanning)
- Notifications

### Native Features
- **Bluetooth LE**: Direct ESP32 connection
- **Local Notifications**: Push alerts
- **Status Bar**: Custom styling
- **Haptics**: Touch feedback
- **App Lifecycle**: Background handling

---

## 🐛 Troubleshooting

### Web App Not Loading
- Check `npm start` is running
- Check browser console for errors
- Verify API endpoints are configured

### Android Build Fails
- Run `npx cap sync android`
- Check Android Studio Gradle sync
- Verify Capacitor dependencies installed

### API Calls Failing
- Check CORS configuration in Lambda
- Verify API Gateway is deployed
- Check network tab in DevTools

### Bluetooth Not Working
- Only works on Android (not web)
- Requires location permission
- Device must be in pairing mode

---

## 📚 Next Steps

1. **Read ARCHITECTURE.md** for detailed architecture
2. **Explore components/** to understand UI structure
3. **Check lambda/** for backend logic
4. **Review services/** for business logic patterns

---

## 🤝 Contributing

### Code Style
- Use functional components with hooks
- Follow React best practices
- Use Material-UI components
- Maintain component separation

### Adding Features
1. Create component in `components/`
2. Add route in `App.js` if needed
3. Add Lambda function in `lambda/` if API needed
4. Test on web and Android

---

## 📞 Support

For detailed information, see:
- **ARCHITECTURE.md** - Complete architecture documentation
- **README.md** - Setup and build instructions
- Code comments in components for inline documentation

