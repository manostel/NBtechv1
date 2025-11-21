import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  static initialized = false;
  static enabled = false;

  static async initialize() {
    if (this.initialized) {
      return this.enabled;
    }

    try {
      console.log('Initializing notifications...');
      console.log('Platform:', Capacitor.getPlatform());
      
      // Request permissions
      const permissionStatus = await LocalNotifications.requestPermissions();
      console.log('Permission status:', permissionStatus);
      
      if (permissionStatus.display === 'granted') {
        this.enabled = true;
        this.initialized = true;
        
        // Add notification listeners
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Notification received:', notification);
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('Notification action performed:', notification);
        });

        // Create notification channel for Android
        if (Capacitor.getPlatform() === 'android') {
          try {
            await LocalNotifications.createChannel({
              id: 'device_notifications',
              name: 'Device Notifications',
              description: 'Device status and event notifications',
              importance: 5, // HIGH importance
              vibration: true,
              sound: 'beep.wav',
              lights: true,
              lightColor: '#FF0000',
              visibility: 1, // Public visibility
              bypassDnd: true, // Bypass Do Not Disturb
              enableVibration: true,
              enableLights: true,
              showBadge: true
            });
            console.log('Android notification channel created successfully');
          } catch (error) {
            console.error('Error creating Android notification channel:', error);
          }
        }

        console.log('Notifications initialized successfully');
        return true;
      } else {
        console.log('Notification permissions denied');
        this.enabled = false;
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.enabled = false;
      return false;
    }
  }

  static async showAlarmNotification(alarm) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }
    if (localStorage.getItem('pushEnabled') === 'false') {
      console.log('Push notifications are disabled by user setting');
      return;
    }

    try {
      console.log('Showing alarm notification:', alarm);
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Alarm Triggered',
            body: `${alarm.variable_name} is ${alarm.condition} ${alarm.threshold}${alarm.unit || ''}`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'beep.wav',
            extra: {
              alarm: alarm
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            wake: true, // Wake up device if sleeping
            priority: 2, // High priority
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      });
      console.log('Alarm notification scheduled successfully');
    } catch (error) {
      console.error('Error showing alarm notification:', error);
    }
  }

  static async showDeviceStatusNotification(device, oldStatus, newStatus) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }
    if (localStorage.getItem('pushEnabled') === 'false') {
      console.log('Push notifications are disabled by user setting');
      return;
    }

    try {
      console.log('Showing device status notification:', { device, oldStatus, newStatus });
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Device Status Changed',
            body: `${device.name || device.client_id} status changed from ${oldStatus} to ${newStatus}`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'default', // Use default system sound
            extra: {
              device: device,
              oldStatus: oldStatus,
              newStatus: newStatus
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            wake: true, // Wake up device if sleeping
            priority: 2, // High priority
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      });
      console.log('Status notification scheduled successfully');
    } catch (error) {
      console.error('Error showing device status notification:', error);
    }
  }

  static async showBatteryLowNotification(device, batteryLevel) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }
    if (localStorage.getItem('pushEnabled') === 'false') {
      console.log('Push notifications are disabled by user setting');
      return;
    }

    try {
      console.log('Showing battery low notification:', { device, batteryLevel });
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Low Battery Alert',
            body: `${device.name || device.client_id} battery is low (${batteryLevel}%)`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'beep.wav',
            extra: {
              device: device,
              batteryLevel: batteryLevel
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            wake: true, // Wake up device if sleeping
            priority: 2, // High priority
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      });
      console.log('Battery notification scheduled successfully');
    } catch (error) {
      console.error('Error showing battery low notification:', error);
    }
  }

  static async showSignalWeakNotification(device, signalStrength) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }
    if (localStorage.getItem('pushEnabled') === 'false') {
      console.log('Push notifications are disabled by user setting');
      return;
    }

    try {
      console.log('Showing signal weak notification:', { device, signalStrength });
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Weak Signal Alert',
            body: `${device.name || device.client_id} has weak signal (${signalStrength}%)`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'beep.wav',
            extra: {
              device: device,
              signalStrength: signalStrength
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            wake: true, // Wake up device if sleeping
            priority: 2, // High priority
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      });
      console.log('Signal notification scheduled successfully');
    } catch (error) {
      console.error('Error showing signal weak notification:', error);
    }
  }

  static async showThresholdExceededNotification(device, metric, value, threshold) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }

    try {
      console.log('Showing threshold exceeded notification:', { device, metric, value, threshold });
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Threshold Exceeded',
            body: `${device.name || device.client_id} ${metric} is ${value} (threshold: ${threshold})`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'beep.wav',
            extra: {
              device: device,
              metric: metric,
              value: value,
              threshold: threshold
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            wake: true, // Wake up device if sleeping
            priority: 2, // High priority
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      });
      console.log('Threshold notification scheduled successfully');
    } catch (error) {
      console.error('Error showing threshold exceeded notification:', error);
    }
  }
}

export default NotificationService; 