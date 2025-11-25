# Professional Notification System

## Overview

A centralized, professional notification management system has been implemented to replace the previous scattered notification handling. This system provides queue management, throttling, deduplication, grouping, history, and a modern UI.

## Key Features

### 1. **Centralized Management**
- Single `NotificationManager` service handles all notifications
- Consistent API across the entire application
- Event-driven architecture for loose coupling

### 2. **Queue Management**
- Notifications are queued and processed sequentially
- Prevents overwhelming the UI with too many notifications at once
- Configurable max queue size (default: 50)

### 3. **Throttling & Rate Limiting**
- Prevents spam from the same notification source
- Throttle duration: 5 seconds between similar notifications
- Rate limit: Max 10 notifications per minute
- Configurable thresholds

### 4. **Deduplication**
- Prevents showing duplicate notifications
- 30-second deduplication window
- Smart key-based matching

### 5. **Grouping**
- Groups similar notifications together
- Shows count of grouped notifications
- 10-second grouping window
- Reduces notification clutter

### 6. **Notification History**
- Persistent notification history (localStorage)
- Stores up to 1000 notifications (last 100 persisted)
- Read/unread status tracking
- Dismiss functionality

### 7. **Priority Levels**
- `low`: Non-urgent notifications
- `normal`: Standard notifications (default)
- `high`: Important notifications
- `critical`: Urgent notifications

### 8. **Severity Levels**
- `success`: Green, for successful operations
- `error`: Red, for errors
- `warning`: Orange, for warnings
- `info`: Blue, for informational messages

### 9. **User Preferences**
- Enable/disable sound
- Enable/disable vibration
- Show/hide in-app notifications
- Show/hide native notifications
- Minimum priority filter
- Type-based filtering

### 10. **Modern UI Components**
- **NotificationToast**: In-app toast notifications with actions
- **NotificationCenter**: Full notification history with filters
- **NotificationProvider**: Wraps app and manages notification display

## Architecture

```
NotificationManager (Service)
├── Queue Management
├── Throttling & Rate Limiting
├── Deduplication
├── Grouping
└── History Management

NotificationStore (Zustand)
├── State Management
├── Preferences
└── Persistence

UI Components
├── NotificationProvider (Wrapper)
├── NotificationToast (In-app toasts)
└── NotificationCenter (History drawer)
```

## Usage

### Basic Notification

```typescript
import notificationManager from '../services/NotificationManager';

// Simple notification
await notificationManager.notify({
  title: 'Device Updated',
  message: 'Device settings have been saved successfully',
  severity: 'success',
});
```

### Alarm Notification

```typescript
await notificationManager.notifyAlarm(alarm, device);
```

### Device Status Change

```typescript
await notificationManager.notifyDeviceStatusChange(device, oldStatus, newStatus);
```

### Command Result

```typescript
await notificationManager.notifyCommandResult(device, command, success);
```

### Advanced Options

```typescript
await notificationManager.notify({
  title: 'Custom Notification',
  message: 'This is a custom notification',
  severity: 'warning',
  priority: 'high',
  type: 'custom_type',
  deviceId: 'device_123',
  duration: 5000, // Auto-dismiss after 5 seconds (0 = persistent)
  persistent: false,
  showInApp: true,
  showNative: true,
  actions: [
    {
      label: 'View Device',
      action: 'view_device',
      variant: 'primary',
      onClick: () => navigateToDevice(),
    },
    {
      label: 'Dismiss',
      action: 'dismiss',
    },
  ],
  groupKey: 'custom_group', // For grouping similar notifications
  data: { customData: 'value' }, // Additional metadata
});
```

## Components

### NotificationProvider

Wraps the entire app and manages notification display:

```tsx
<NotificationProvider>
  <App />
</NotificationProvider>
```

### NotificationCenter

Accessible via the notification bell icon in the Dashboard header:

- View all notifications
- Filter by severity, type, read/unread
- Search notifications
- Mark as read/dismiss
- Clear all notifications

### NotificationToast

Automatically displayed for new notifications:

- Auto-dismiss based on duration
- Action buttons
- Severity-based styling
- Group count display

## Integration Points

### Dashboard Header
- Notification bell icon with unread count badge
- Opens NotificationCenter on click

### DashboardAlarmsTab
- Uses `notificationManager.notifyAlarm()` for alarm notifications
- Automatic throttling and grouping

### DeviceNotificationService
- Wraps `NotificationManager` for backward compatibility
- All device-related notifications go through the manager

## Configuration

### NotificationManager Settings

Located in `src/services/NotificationManager.ts`:

```typescript
private readonly THROTTLE_DURATION = 5000; // 5 seconds
private readonly DEDUPLICATION_WINDOW = 30000; // 30 seconds
private readonly GROUPING_WINDOW = 10000; // 10 seconds
private readonly MAX_NOTIFICATIONS_PER_MINUTE = 10;
```

### User Preferences

Stored in Zustand store with persistence:

```typescript
preferences: {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showInApp: boolean;
  showNative: boolean;
  minPriority: NotificationPriority;
  enabledTypes: string[];
}
```

## Benefits

1. **No More Spam**: Throttling and rate limiting prevent notification overload
2. **Better UX**: Grouped notifications reduce clutter
3. **History**: Users can review past notifications
4. **Flexibility**: Rich options for different notification types
5. **Maintainability**: Centralized code makes it easy to update behavior
6. **Scalability**: Queue system handles high notification volumes
7. **Professional**: Modern UI with proper state management

## Migration Notes

- Old `NotificationService` calls still work (wrapped by `NotificationManager`)
- `DeviceNotificationService` now uses `NotificationManager` internally
- All notifications go through the centralized system
- History is automatically maintained

## Future Enhancements

Potential improvements:
- Backend sync for notification history
- Notification templates
- Scheduled notifications
- Notification analytics
- User notification preferences per device
- Notification channels/categories
- Rich media notifications (images, videos)

