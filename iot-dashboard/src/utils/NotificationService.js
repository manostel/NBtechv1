import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  static initialized = false;
  static channelCreated = false;
  static enabled = false; // Disable notifications by default

  static async initialize() {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }

    if (this.initialized) {
      console.log('Notifications already initialized');
      return;
    }

    console.log('Initializing notifications...');
    console.log('Platform:', Capacitor.getPlatform());
    console.log('Is native:', Capacitor.isNativePlatform());

    try {
      // For web platform, use browser notifications
      if (Capacitor.getPlatform() === 'web') {
        console.log('Using web notifications');
        if ('Notification' in window) {
          try {
            const permission = await Notification.requestPermission();
            console.log('Web notification permission:', permission);
            if (permission === 'granted') {
              this.initialized = true;
            }
          } catch (error) {
            console.error('Error requesting web notification permission:', error);
            // Don't throw, just disable notifications
            this.enabled = false;
          }
        }
        return;
      }

      // For native platforms
      if (Capacitor.isNativePlatform()) {
        console.log('Using native notifications');
        try {
          console.log('Requesting notification permissions...');
          const permissionStatus = await PushNotifications.requestPermissions();
          console.log('Native notification permission status:', permissionStatus);

          if (permissionStatus.receive === 'granted') {
            console.log('Registering push notifications...');
            await PushNotifications.register();
            console.log('Push notifications registered successfully');

            // Add basic listeners for debugging
            PushNotifications.addListener('registration', (token) => {
              console.log('Push registration success:', token.value);
            });

            PushNotifications.addListener('registrationError', (error) => {
              console.error('Push registration error:', error.error);
              // Don't throw, just disable notifications
              this.enabled = false;
            });

            this.initialized = true;
          } else {
            console.log('Notification permission not granted');
            this.enabled = false;
          }
        } catch (error) {
          console.error('Error initializing native notifications:', error);
          this.enabled = false;
        }
      }
    } catch (error) {
      console.error('Error in notification initialization:', error);
      this.enabled = false;
    }
  }

  static async showAlarmNotification(alarm) {
    if (!this.enabled) {
      console.log('Notifications are disabled');
      return;
    }

    if (!this.initialized) {
      console.log('Notifications not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.enabled) {
      console.log('Notifications are still disabled after initialization attempt');
      return;
    }

    console.log('Showing alarm notification...');
    console.log('Alarm data:', alarm);

    if (!alarm) {
      console.log('No alarm data provided');
      return;
    }

    try {
      const { title, body } = this.formatAlarmNotification(alarm);
      console.log('Formatted notification:', { title, body });

      // For web platform, use browser notifications
      if (Capacitor.getPlatform() === 'web') {
        console.log('Showing web notification');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/telectronio.png'
          });
        }
        return;
      }

      // For native platforms
      if (Capacitor.isNativePlatform()) {
        console.log('Showing native notification');
        
        // Create notification channel for Android only once
        if (Capacitor.getPlatform() === 'android' && !this.channelCreated) {
          console.log('Creating Android notification channel');
          try {
            await PushNotifications.createChannel({
              id: 'alarms',
              name: 'Alarms',
              description: 'Device alarm notifications',
              importance: 5,
              vibration: true,
              sound: 'default'
            });
            console.log('Android notification channel created');
            this.channelCreated = true;
          } catch (error) {
            console.error('Error creating Android notification channel:', error);
            // Don't throw here, try to show notification anyway
          }
        }

        // Show the notification
        console.log('Scheduling notification');
        await PushNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Date.now().toString(),
              schedule: { at: new Date(Date.now()) },
              channelId: 'alarms',
              sound: 'default',
              attachments: null,
              actionTypeId: '',
              extra: {
                alarmId: alarm.alarm_id,
                severity: alarm.severity
              }
            }
          ]
        });
        console.log('Notification scheduled successfully');
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Don't throw the error, just log it
    }
  }

  static formatAlarmNotification(alarm) {
    console.log('Formatting alarm notification:', alarm);
    
    if (!alarm) {
      console.log('No alarm data to format');
      return {
        title: 'Alarm',
        body: 'Unknown alarm triggered'
      };
    }

    const severity = alarm.severity || 'info';
    const title = `Alarm: ${severity.toUpperCase()}`;
    const body = `${alarm.description || 'Device alarm triggered'}\nCurrent value: ${alarm.current_value}`;
    
    console.log('Formatted notification:', { title, body });
    return { title, body };
  }
}

export default NotificationService; 