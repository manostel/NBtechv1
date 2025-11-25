import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Alarm, Device } from '../types';

class NotificationService {
  static initialized = false;
  static enabled = false;

  static async initialize(): Promise<boolean> {
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

  static async showAlarmNotification(alarm: Alarm): Promise<void> {
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
      const scheduleOptions: ScheduleOptions = {
        notifications: [
          {
            title: 'Alarm Triggered',
            body: `${alarm.variable_name} is ${alarm.condition} ${alarm.threshold}`,
            id: Math.floor(Math.random() * 2147483647), // Random number within Java int range
            channelId: 'device_notifications',
            sound: 'beep.wav',
            extra: {
              alarm: alarm
            },
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second in the future
            // @ts-ignore - wake property might not be in types but supported
            wake: true, // Wake up device if sleeping
            // @ts-ignore
            priority: 2, // High priority
            // @ts-ignore
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
      console.log('Alarm notification scheduled successfully');
    } catch (error) {
      console.error('Error showing alarm notification:', error);
    }
  }

  static async showDeviceStatusNotification(device: Device, oldStatus: string, newStatus: string): Promise<void> {
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
      const scheduleOptions: ScheduleOptions = {
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
            // @ts-ignore
            wake: true, // Wake up device if sleeping
            // @ts-ignore
            priority: 2, // High priority
            // @ts-ignore
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
      console.log('Status notification scheduled successfully');
    } catch (error) {
      console.error('Error showing device status notification:', error);
    }
  }

  static async showBatteryLowNotification(device: Device, batteryLevel: number): Promise<void> {
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
      const scheduleOptions: ScheduleOptions = {
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
            // @ts-ignore
            wake: true, // Wake up device if sleeping
            // @ts-ignore
            priority: 2, // High priority
            // @ts-ignore
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
      console.log('Battery notification scheduled successfully');
    } catch (error) {
      console.error('Error showing battery low notification:', error);
    }
  }

  static async showSignalWeakNotification(device: Device, signalStrength: number): Promise<void> {
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
      const scheduleOptions: ScheduleOptions = {
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
            // @ts-ignore
            wake: true, // Wake up device if sleeping
            // @ts-ignore
            priority: 2, // High priority
            // @ts-ignore
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
      console.log('Signal notification scheduled successfully');
    } catch (error) {
      console.error('Error showing signal weak notification:', error);
    }
  }

  static async showThresholdExceededNotification(device: Device, metric: string, value: number, threshold: number): Promise<void> {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }

    try {
      console.log('Showing threshold exceeded notification:', { device, metric, value, threshold });
      const scheduleOptions: ScheduleOptions = {
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
            // @ts-ignore
            wake: true, // Wake up device if sleeping
            // @ts-ignore
            priority: 2, // High priority
            // @ts-ignore
            visibility: 1, // Public visibility
            ongoing: true // Make it an ongoing notification
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
      console.log('Threshold notification scheduled successfully');
    } catch (error) {
      console.error('Error showing threshold exceeded notification:', error);
    }
  }

  static async showNotification(options: {
    title: string;
    body: string;
    severity?: 'success' | 'error' | 'info' | 'warning';
    type?: string;
  }): Promise<void> {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }

    try {
      console.log('Showing generic notification:', options);
      const scheduleOptions: ScheduleOptions = {
        notifications: [
          {
            title: options.title,
            body: options.body,
            id: Math.floor(Math.random() * 2147483647),
            channelId: 'device_notifications',
            sound: 'default',
            extra: {
              type: options.type,
              severity: options.severity
            },
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      };
      await LocalNotifications.schedule(scheduleOptions);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}

export default NotificationService;

