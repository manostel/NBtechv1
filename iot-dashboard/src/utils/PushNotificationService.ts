import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class PushNotificationService {
  private static initialized = false;
  private static token: string | null = null;

  static async initialize(userEmail: string) {
    if (this.initialized && Capacitor.getPlatform() !== 'web') {
        console.log('PushNotificationService already initialized');
        return;
    }

    if (Capacitor.getPlatform() === 'web') {
        console.log('PushNotificationService not supported on web');
        return;
    }

    console.log('Initializing Push Notifications...');

    try {
        // 1. Register Listeners FIRST to ensure we don't miss any events
        await this.addListeners(userEmail);

        // 2. Check Permissions
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('Push notification permissions denied');
            return;
        }

        // 3. Create Notification Channel (Required for Android O+)
        if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
                id: 'iot_alerts',
                name: 'IoT Alerts',
                description: 'Critical alerts from your IoT devices',
                importance: 5, // High importance
                visibility: 1, // Public
                sound: 'default',
                vibration: true,
            });
        }

        // 4. Register for Push
        await PushNotifications.register();
        
        this.initialized = true;
        console.log('Push Notifications initialized successfully');
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
  }

  private static async addListeners(userEmail: string) {
    // Remove all existing listeners first to avoid duplicates
    await PushNotifications.removeAllListeners();

    console.log('Adding push notification listeners...');

    // On registration success, we get the token
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push Registration success, token: ' + token.value);
      this.token = token.value;
      await this.registerTokenWithBackend(token.value, userEmail);
    });

    // Some error happened
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on push registration: ' + JSON.stringify(error));
    });

    // Show notification when received while app is open
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      
      // If app is open, show a local notification so user sees it
      if (notification.title || notification.body) {
        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: notification.title || 'New Notification',
                        body: notification.body || '',
                        id: new Date().getTime(),
                        schedule: { at: new Date(Date.now() + 100) }, // Show immediately
                        sound: 'default',
                        extra: notification.data
                    }
                ]
            });
        } catch (e) {
            console.error('Error showing local notification', e);
        }
      }
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Navigate to specific page based on data
    });
  }

  private static async registerTokenWithBackend(token: string, userEmail: string) {
    try {
      // Retrieve your API URL from config or environment
      // Ideally, this should be the same URL used in NotificationManager
      const API_URL = 'https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/sns-notification';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'register_device',
          token: token,
          user_data: userEmail // We use the email as UserData to identify the endpoint later
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register token with backend');
      }

      const result = await response.json();
      console.log('Token registered with AWS SNS:', result);
      
      // Store the EndpointArn if returned, for future direct targeting
      if (result.endpoint_arn) {
        localStorage.setItem('sns_endpoint_arn', result.endpoint_arn);
      }

    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }
}

export default PushNotificationService;

