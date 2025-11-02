# IoT Dashboard - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Data Flow](#data-flow)
7. [AWS Integration](#aws-integration)
8. [Mobile & Android Support](#mobile--android-support)
9. [Bluetooth Integration](#bluetooth-integration)
10. [State Management](#state-management)
11. [Services & Utilities](#services--utilities)
12. [API Integration](#api-integration)
13. [Build & Deployment](#build--deployment)
14. [Development Guide](#development-guide)

---

## Overview

The IoT Dashboard is a **cross-platform web and mobile application** built with React that provides real-time monitoring and control for IoT devices. The application runs both as a **web application** and as a **native Android app** using Capacitor, enabling seamless device management through cloud (AWS IoT) and direct Bluetooth Low Energy (BLE) connections.

### Key Features
- **Real-time device monitoring** via AWS IoT Core
- **Direct Bluetooth control** for local device management
- **Multi-device management** with device status tracking
- **Data visualization** with charts and historical data
- **Alarm and subscription management** for automated notifications
- **Command execution** to control IoT devices remotely
- **Cross-platform support** (Web + Android native)

---

## Technology Stack

### Frontend Framework
- **React 18.2.0** - UI framework
- **React Router DOM 6.22.1** - Client-side routing
- **Material-UI (MUI) 5.15.10** - Component library and theming
- **Create React App** - Build tooling

### Charts & Visualization
- **Chart.js 4.4.1** - Chart library
- **react-chartjs-2 5.2.0** - React wrapper for Chart.js
- **chartjs-adapter-date-fns 3.0.0** - Date axis support
- **chartjs-plugin-zoom 2.2.0** - Chart zooming functionality

### Maps & Location
- **react-leaflet 4.2.1** - React wrapper for Leaflet maps
- **leaflet 1.9.4** - Interactive maps library
- **@react-google-maps/api 2.19.3** - Google Maps integration

### Mobile/Cross-Platform
- **Capacitor 7.x** - Native runtime framework
  - `@capacitor/core` - Core framework
  - `@capacitor/android` - Android platform support
  - `@capacitor/app` - App lifecycle management
  - `@capacitor/haptics` - Haptic feedback
  - `@capacitor/keyboard` - Keyboard handling
  - `@capacitor/local-notifications` - Push notifications
  - `@capacitor/status-bar` - Status bar control
  - `@capacitor-community/bluetooth-le` - BLE integration

### Authentication & Security
- **AWS Amplify 6.0.19** - AWS service integration
- **jwt-decode 4.0.0** - JWT token parsing
- **react-oidc-context 3.2.0** - OpenID Connect support
- **oidc-client-ts 3.2.0** - OIDC client library

### HTTP & API
- **Axios 1.6.7** - HTTP client
- **date-fns 3.3.1** - Date manipulation

### Utilities
- **react-helmet 6.1.0** - Document head management
- **react-icons 5.0.1** - Icon library
- **react-horizontal-scrolling-menu 8.2.0** - Horizontal scrolling

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     IoT Dashboard Application                  │
│  ┌─────────────────┐          ┌──────────────────────────┐  │
│  │   Web Browser    │          │   Android Native App     │  │
│  │   (React App)    │          │   (Capacitor Wrapper)    │  │
│  └────────┬────────┘          └───────────┬──────────────┘  │
│           │                                │                 │
│           └────────────────┬───────────────┘                 │
│                            │                                 │
│                   ┌────────▼─────────┐                       │
│                   │  React Components │                       │
│                   │  & State Mgmt     │                       │
│                   └────────┬──────────┘                       │
│                            │                                 │
│        ┌───────────────────┼───────────────────┐            │
│        │                   │                    │            │
│  ┌─────▼──────┐    ┌───────▼────────┐  ┌───────▼──────┐    │
│  │ AWS Lambda │    │  AWS IoT Core   │  │  BLE Direct  │    │
│  │  Functions │    │   (MQTT)        │  │  Connection  │    │
│  └─────┬──────┘    └───────┬────────┘  └───────┬──────┘    │
│        │                   │                    │            │
└────────┼───────────────────┼────────────────────┼──────────┘
         │                   │                    │
    ┌────▼──────────┐  ┌────▼────────┐    ┌────▼────────┐
    │  DynamoDB     │  │  IoT Devices │    │  ESP32      │
    │  (Data Store) │  │  (Edge)      │    │  (Local)    │
    └───────────────┘  └──────────────┘    └─────────────┘
```

### Architecture Patterns

1. **Component-Based Architecture**
   - React functional components with hooks
   - Separation of concerns (presentation, logic, data)
   - Reusable component library

2. **Service Layer Pattern**
   - Centralized services for business logic
   - Event-driven communication (EventEmitter)
   - Singleton services for global state

3. **Context API for State Management**
   - Theme management (ThemeContext)
   - Loading state (LoadingContext)
   - User session management

4. **API Gateway + Lambda Pattern**
   - RESTful API through AWS API Gateway
   - Serverless Lambda functions for backend logic
   - DynamoDB for data persistence

5. **Hybrid Mobile Architecture**
   - Single codebase for web and mobile
   - Capacitor for native bridge
   - Platform-specific features when needed

---

## Project Structure

```
iot-dashboard/
├── public/                    # Static assets
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/            # React components
│   │   ├── Dashboard.js      # Main dashboard component
│   │   ├── DevicesPage.js     # Device list page
│   │   ├── LoginPage.js       # Authentication
│   │   ├── RegisterPage.js    # User registration
│   │   ├── dashboard2/       # Dashboard sub-components
│   │   │   ├── DashboardHeader.js
│   │   │   ├── DashboardContent.js
│   │   │   ├── DashboardCharts.js
│   │   │   ├── DashboardCommands.js
│   │   │   ├── DashboardAlarmsTab.js
│   │   │   └── ...
│   │   ├── BluetoothControl.js # BLE integration
│   │   ├── SettingsPage.js
│   │   └── ...
│   ├── context/              # React Context providers
│   │   └── LoadingContext.js
│   ├── hooks/                 # Custom React hooks
│   │   └── useGlobalTimer.js
│   ├── services/             # Business logic services
│   │   └── GlobalTimerService.js
│   ├── utils/                 # Utility functions
│   │   ├── NotificationService.js
│   │   ├── DeviceNotificationService.js
│   │   ├── SubscriptionNotificationService.js
│   │   └── RealTimeSubscriptionDetector.js
│   ├── lambda/               # AWS Lambda function code
│   │   ├── auth-login.py
│   │   ├── auth-register.py
│   │   ├── fetch-devices.py
│   │   ├── fetch-devices-data.py
│   │   ├── send-command.py
│   │   ├── manage-subscriptions.py
│   │   └── ...
│   ├── App.js                # Root component
│   ├── App.css
│   ├── index.js              # Entry point
│   └── index.css
├── android/                  # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/
│   │   └── build.gradle
│   ├── build.gradle
│   └── ...
├── build/                     # Production build output
├── capacitor.config.json      # Capacitor configuration
├── package.json
└── README.md
```

---

## Core Components

### App.js (Root Component)
- **Purpose**: Application entry point and routing
- **Responsibilities**:
  - Route configuration (React Router)
  - User session management (localStorage)
  - Global context providers (Theme, Loading)
  - Navigation guards

**Key Routes**:
- `/` - Login page
- `/register` - Registration
- `/devices` - Device list
- `/dashboard` - Device dashboard
- `/settings` - Settings page
- `/bluetooth` - BLE control

### Dashboard.js
- **Purpose**: Main device monitoring interface
- **Features**:
  - Real-time data display
  - Chart visualization
  - Device control commands
  - Alarm management
  - Subscription management
  - Historical data viewing

**Sub-components**:
- `DashboardHeader` - Device info and navigation
- `DashboardContent` - Main content area
- `DashboardCharts` - Data visualization
- `DashboardCommands` - Device control
- `DashboardAlarmsTab` - Alarm configuration
- `DashboardSubscriptionsTab` - Subscription management

### DevicesPage.js
- **Purpose**: Device list and selection
- **Features**:
  - List all user devices
  - Device status indicators
  - Battery level display
  - Signal strength indicators
  - Device selection and navigation

### BluetoothControl.js
- **Purpose**: Direct BLE device control
- **Features**:
  - Device scanning and discovery
  - BLE connection management
  - Real-time status monitoring
  - Command execution via BLE
  - Local notifications

---

## Data Flow

### 1. Authentication Flow

```
User Login
    │
    ├─> LoginPage.js
    │       │
    │       ├─> POST /api/auth-login (Lambda)
    │       │       │
    │       │       ├─> DynamoDB (users table)
    │       │       │
    │       │       └─> Return user data + client_id
    │       │
    │       └─> Store in localStorage
    │           └─> Navigate to /devices
```

### 2. Device Data Flow

```
Dashboard Load
    │
    ├─> fetchLatestData()
    │       │
    │       ├─> POST /api/fetch-devices-data (Lambda)
    │       │       │
    │       │       ├─> Query DynamoDB (IoT_DeviceData)
    │       │       │
    │       │       └─> Return latest device data
    │       │
    │       ├─> fetchDeviceState()
    │       │       │
    │       │       └─> POST /api/fetch-device-states-bulk
    │       │               │
    │       │               └─> Query DynamoDB for status
    │       │
    │       └─> Update component state
    │           └─> Render UI
```

### 3. Real-time Updates Flow

```
GlobalTimerService
    │
    ├─> Emit 'statusUpdate' (every 60s)
    │       │
    │       └─> Dashboard listens
    │           └─> fetchLatestData()
    │
    ├─> Emit 'batteryUpdate' (every 15s)
    │       │
    │       └─> DevicesPage listens
    │           └─> Update battery indicators
    │
    └─> Emit 'dataUpdate' (every 120s)
            │
            └─> Dashboard listens
                └─> Refresh charts
```

### 4. Command Execution Flow

```
User Action (Button Click)
    │
    ├─> handleCommand() in Dashboard
    │       │
    │       ├─> POST /api/send-command (Lambda)
    │       │       │
    │       │       ├─> AWS IoT Core (publish to MQTT)
    │       │       │       │
    │       │       │       └─> Device receives command
    │       │       │
    │       │       └─> Return success
    │       │
    │       └─> Update UI state
    │           └─> Show confirmation
```

### 5. Bluetooth Direct Control Flow

```
User Opens Bluetooth Page
    │
    ├─> BluetoothControl.js
    │       │
    │       ├─> BleClient.scan() (Capacitor)
    │       │       │
    │       │       └─> Discover devices
    │       │
    │       ├─> BleClient.connect() (Capacitor)
    │       │       │
    │       │       └─> Establish BLE connection
    │       │
    │       ├─> BleClient.read() / write() (Capacitor)
    │       │       │
    │       │       └─> Direct ESP32 communication
    │       │
    │       └─> Update UI in real-time
```

---

## AWS Integration

### Architecture

```
React App
    │
    ├─> API Gateway
    │       │
    │       ├─> Lambda Functions
    │       │       │
    │       │       ├─> auth-login.py
    │       │       ├─> auth-register.py
    │       │       ├─> fetch-devices.py
    │       │       ├─> fetch-devices-data.py
    │       │       ├─> send-command.py
    │       │       ├─> manage-subscriptions.py
    │       │       └─> ...
    │       │
    │       └─> DynamoDB Tables
    │               │
    │               ├─> Users (authentication)
    │               ├─> IoT_DeviceData (sensor data)
    │               ├─> IoT_DevicePreferences (settings)
    │               ├─> IoT_Alarms (alarm configs)
    │               └─> IoT_Subscriptions (subscriptions)
    │
    └─> AWS IoT Core
            │
            ├─> MQTT Topics
            │       │
            │       ├─> NBtechv1/{device_id}/data
            │       ├─> NBtechv1/{device_id}/data/status
            │       ├─> NBtechv1/{device_id}/cmd
            │       └─> NBtechv1/{device_id}/data/gps
            │
            └─> IoT Rules
                    │
                    └─> Trigger Lambda on device events
```

### Lambda Functions

#### Authentication
- **auth-login.py**: User authentication
  - Validates credentials
  - Returns user data and client_id
  
- **auth-register.py**: User registration
  - Creates new user account
  - Stores in DynamoDB

#### Device Management
- **fetch-devices.py**: Get user's devices
  - Queries devices by user_email
  - Returns device list with metadata

- **fetch-devices-data.py**: Get device sensor data
  - Queries latest data from IoT_DeviceData
  - Returns temperature, humidity, pressure, battery, etc.

- **fetch-device-states-bulk.py**: Get device status
  - Returns current device state (outputs, inputs, charging)
  - Used for real-time status display

#### Device Control
- **send-command.py**: Send commands to devices
  - Publishes to AWS IoT Core MQTT topic
  - Commands: RESTART, TOGGLE_1_ON/OFF, SET_SPEED, etc.

#### Alarms & Subscriptions
- **manage-alarms.py**: Alarm CRUD operations
  - Create, read, update, delete alarms
  
- **manage-subscriptions.py**: Subscription management
  - Create/delete IoT Rules for subscriptions
  - Manage subscription lifecycle

- **iot-rules-subscription-trigger.py**: Subscription trigger
  - Triggered by IoT Rules when conditions met
  - Processes subscription notifications

### DynamoDB Tables

1. **Users Table**
   - Primary Key: `email`
   - Fields: password, client_id, auth_type

2. **IoT_DeviceData Table**
   - Primary Key: `client_id` (Partition Key)
   - Sort Key: `timestamp`
   - Fields: temperature, humidity, pressure, battery, signal_quality, motor_speed

3. **IoT_DevicePreferences Table**
   - Primary Key: `client_id`
   - Fields: user preferences, display settings

4. **IoT_Alarms Table**
   - Primary Key: `client_id` (Partition Key)
   - Sort Key: `alarm_id`
   - Fields: condition, threshold, enabled, actions

5. **IoT_Subscriptions Table**
   - Primary Key: `client_id` (Partition Key)
   - Sort Key: `subscription_id`
   - Fields: variable, condition, threshold, enabled

### AWS IoT Core Integration

#### MQTT Topics
- **Data Publishing**: `NBtechv1/{client_id}/data`
  - Device publishes sensor data every 60 seconds
  - Format: JSON with timestamp, temperature, humidity, pressure, battery, signal_quality

- **Status Publishing**: `NBtechv1/{client_id}/data/status`
  - Device publishes status every 10 minutes
  - Format: JSON with outputs, inputs, charging state

- **Command Topic**: `NBtechv1/{client_id}/cmd`
  - App publishes commands to this topic
  - Device subscribes and executes commands

- **GPS Topic**: `NBtechv1/{client_id}/data/gps`
  - Device publishes GPS coordinates periodically

#### IoT Rules
- Automatically trigger Lambda functions on device events
- Used for subscriptions and alarm triggers
- Dynamic rule creation based on user subscriptions

---

## Mobile & Android Support

### Capacitor Integration

**Capacitor** bridges the web app to native Android functionality:

#### Configuration (`capacitor.config.json`)
```json
{
  "appId": "com.telectronio.iotdashboard",
  "appName": "IoT Dashboard",
  "webDir": "build",
  "android": {
    "permissions": [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_SCAN",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.POST_NOTIFICATIONS"
    ]
  }
}
```

#### Native Features Used

1. **Bluetooth LE** (`@capacitor-community/bluetooth-le`)
   - Device scanning
   - Connection management
   - GATT characteristic read/write

2. **Local Notifications** (`@capacitor/local-notifications`)
   - Push notifications for device events
   - Alarm notifications
   - Status change alerts

3. **Status Bar** (`@capacitor/status-bar`)
   - Customize status bar appearance
   - Theme integration

4. **App Lifecycle** (`@capacitor/app`)
   - Handle app state changes
   - Background/foreground transitions

5. **Haptics** (`@capacitor/haptics`)
   - Tactile feedback for interactions

### Android Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml    # Permissions & config
│   │   └── java/
│   │       └── MainActivity.java   # Native entry point
│   └── build.gradle               # Dependencies
├── build.gradle                    # Project config
└── gradle.properties              # Gradle settings
```

### Build Process

1. **Web Build**: `npm run build`
   - Creates optimized production build in `build/` folder

2. **Sync Capacitor**: `npx cap sync android`
   - Copies web build to Android project
   - Updates native dependencies

3. **Android Build**: 
   - Open in Android Studio
   - Build APK or run on device/emulator

---

## Bluetooth Integration

### BLE Service Architecture

The app communicates directly with ESP32 devices via Bluetooth Low Energy:

#### Service UUIDs (from ESP32)
- **Main Service**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Restart Service**: `12345678-1234-5678-1234-56789abcdef0`

#### Characteristics
- **LED1 Control**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **LED2 Control**: `beb5483e-36e1-4688-b7f5-ea07361b26a9`
- **Speed Control**: `beb5483e-36e1-4688-b7f5-ea07361b26aa`
- **Status Read**: `beb5483e-36e1-4688-b7f5-ea07361b26ab`
- **Modem Issue**: `beb5483e-36e1-4688-b7f5-ea07361b26ac`
- **Offline Mode**: `beb5483e-36e1-4688-b7f5-ea07361b26ae`
- **Restart Control**: `cafebabe-1234-5678-9abc-def012345678`

### BLE Workflow

```
1. Initialize BLE
   └─> BleClient.initialize()

2. Request Permissions
   └─> Check and request BLUETOOTH_SCAN, BLUETOOTH_CONNECT

3. Scan for Devices
   └─> BleClient.scan({ services: [SERVICE_UUID] })
       └─> Display discovered devices

4. Connect to Device
   └─> BleClient.connect(deviceId)
       └─> Establish GATT connection

5. Read/Write Characteristics
   └─> BleClient.read({ service, characteristic })
   └─> BleClient.write({ service, characteristic, value })

6. Monitor Status
   └─> Periodic reads of STATUS_CHAR_UUID
       └─> Update UI in real-time

7. Send Commands
   └─> Write to LED1/LED2/SPEED characteristics
       └─> Immediate device response
```

### Use Cases

1. **Offline Mode**: When device has no internet, use BLE for direct control
2. **Local Testing**: Test device without cloud connectivity
3. **Real-time Control**: Lower latency than cloud commands
4. **Configuration**: Set device parameters directly

---

## State Management

### React Context API

#### ThemeContext
- **Purpose**: Global theme management (light/dark mode)
- **Provider**: `CustomThemeProvider`
- **Usage**: `const { theme, toggleTheme } = useTheme()`

#### LoadingContext
- **Purpose**: Global loading state
- **Provider**: `LoadingProvider`
- **Usage**: `const { isPageLoading, setIsPageLoading } = useLoading()`

### Component State

Components use React hooks for local state:
- `useState` for component-level state
- `useEffect` for side effects and subscriptions
- `useCallback` for memoized functions
- `useRef` for DOM references and persistent values

### Service-Based State

#### GlobalTimerService
- **Pattern**: Singleton EventEmitter
- **State**: Device statuses, timers, notification history
- **Communication**: Event-driven (emit/listen)

**Events**:
- `statusUpdate` - Emitted every 60 seconds
- `batteryUpdate` - Emitted every 15 seconds
- `dataUpdate` - Emitted every 120 seconds
- `statusChange` - Emitted when device status changes
- `deviceStatusUpdate` - Device-specific status update

#### RealTimeSubscriptionDetector
- **Pattern**: EventEmitter for subscription monitoring
- **State**: Active subscriptions, device changes
- **Features**: WebSocket/SSE connection, condition evaluation

### LocalStorage

Stored in browser/device localStorage:
- `user` - User object (email, client_id, auth_type)
- `loginTimestamp` - Session expiration tracking
- `selectedDevice` - Last selected device
- `savedUser` - Remember me credentials

---

## Services & Utilities

### GlobalTimerService.js

**Purpose**: Centralized timer management and device status tracking

**Features**:
- Periodic data refresh intervals
- Device status calculation (Online/Offline)
- Status change detection
- Notification cooldown management

**Intervals**:
- Status updates: 60 seconds
- Battery updates: 15 seconds
- Data updates: 120 seconds

**Methods**:
- `start()` - Start all timers
- `stop()` - Stop all timers
- `updateDeviceStatus(deviceId, deviceData)` - Update device status
- `calculateDeviceStatus(deviceData)` - Calculate online/offline
- `getDeviceStatus(deviceId)` - Get current status

### NotificationService.js

**Purpose**: Cross-platform notification management

**Features**:
- Request permissions
- Send local notifications
- Android notification channels
- Notification scheduling

**Usage**:
```javascript
await NotificationService.initialize();
await NotificationService.show({
  title: 'Device Alert',
  body: 'Device went offline',
  id: 1
});
```

### DeviceNotificationService.js

**Purpose**: Device-specific notification handling

**Features**:
- Device status change notifications
- Battery level alerts
- Alarm triggers
- Cooldown management

### SubscriptionNotificationService.js

**Purpose**: Handle subscription-based notifications

**Features**:
- Subscription condition evaluation
- Threshold crossing notifications
- Variable monitoring

### RealTimeSubscriptionDetector.js

**Purpose**: Real-time subscription monitoring

**Features**:
- WebSocket/SSE connection to backend
- Device change detection
- Subscription condition evaluation
- Automatic reconnection

---

## API Integration

### API Endpoints

All API calls go through AWS API Gateway, which invokes Lambda functions.

#### Base URLs
- **Production**: Configured via environment variables
- **Development**: `http://localhost:3000` (if using local proxy)

#### Authentication
```javascript
const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // Optional
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    action: 'login'
  })
});
```

#### Common API Patterns

**Device Data Fetching**:
```javascript
fetch(DEVICE_DATA_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get_device_data',
    client_id: device.client_id,
    user_email: user.email
  })
});
```

**Command Sending**:
```javascript
fetch(COMMAND_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: device.client_id,
    command: 'TOGGLE_1_ON',
    speed: 100 // if SET_SPEED
  })
});
```

### Error Handling

- **Network Errors**: CORS, connection failures
- **API Errors**: 400/500 responses with error messages
- **Timeout Handling**: Request timeouts
- **Retry Logic**: Automatic retries for failed requests

---

## Build & Deployment

### Development

```bash
# Install dependencies
npm install

# Start development server
npm start
# Opens http://localhost:3000

# Run tests
npm test

# Build for production
npm run build
```

### Android Build

```bash
# 1. Build web app
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Build APK in Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### Deployment Options

#### Web Deployment
- **AWS S3 + CloudFront**: Static website hosting
- **AWS Amplify**: CI/CD deployment
- **Netlify/Vercel**: Alternative hosting

#### Android Deployment
- **Google Play Store**: Release to production
- **Internal Testing**: Test track for beta
- **Direct APK**: Manual installation

### Environment Configuration

Set environment variables for API endpoints:
```javascript
// .env file (not committed)
REACT_APP_API_BASE_URL=https://your-api-gateway.amazonaws.com
REACT_APP_AWS_REGION=eu-central-1
```

---

## Development Guide

### Adding a New Component

1. Create component file in `src/components/`
2. Import dependencies (MUI, React hooks)
3. Define component with props
4. Export default
5. Import and use in parent component

### Adding a New Lambda Function

1. Create Python file in `src/lambda/`
2. Define `lambda_handler(event, context)`
3. Add CORS headers
4. Implement business logic
5. Deploy to AWS Lambda
6. Connect to API Gateway

### Adding a New Feature

1. **UI Component**: Create in `components/`
2. **State Management**: Use Context or component state
3. **API Integration**: Add Lambda function
4. **Routing**: Add route in `App.js`
5. **Testing**: Test on web and Android

### Best Practices

1. **Component Structure**:
   - Keep components focused and small
   - Extract reusable logic to hooks
   - Use proper prop types

2. **State Management**:
   - Use Context for global state
   - Use local state for component-specific data
   - Avoid prop drilling

3. **Performance**:
   - Memoize expensive computations
   - Use React.memo for pure components
   - Lazy load heavy components

4. **Error Handling**:
   - Use ErrorBoundary for component errors
   - Handle API errors gracefully
   - Show user-friendly error messages

5. **Accessibility**:
   - Use semantic HTML
   - Add ARIA labels
   - Ensure keyboard navigation

### Debugging

**Web**:
- Chrome DevTools for React DevTools
- Network tab for API calls
- Console for logs

**Android**:
- Chrome DevTools via `chrome://inspect`
- Android Studio Logcat
- Capacitor console logs

---

## Summary

This IoT Dashboard is a **modern, cross-platform application** that combines:

- **React** for powerful UI
- **Capacitor** for native mobile features
- **AWS** for scalable backend
- **Bluetooth LE** for direct device control
- **Real-time monitoring** with automated notifications

The architecture is designed for:
- ✅ Scalability (serverless backend)
- ✅ Maintainability (component-based, modular)
- ✅ Cross-platform (web + Android)
- ✅ Real-time capabilities (MQTT, WebSocket)
- ✅ Offline support (Bluetooth direct)

---

**Last Updated**: 2025
**Version**: 1.0.0
**Maintained by**: Telectronio

