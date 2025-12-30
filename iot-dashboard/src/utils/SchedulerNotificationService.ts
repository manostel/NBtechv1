import { EventEmitter } from './EventEmitter';
import notificationManager from '../services/NotificationManager';

export interface SchedulerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  task_id: string;
  task_name: string;
  device_id: string;
  command: string;
  status: 'success' | 'failed';
  timestamp: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

class SchedulerNotificationService extends EventEmitter {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor() {
    super();
  }

  connect() {
    try {
      this.startPolling();
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      console.error('Error connecting to scheduler notification service:', error);
      this.emit('error', error);
    }
  }

  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.emit('disconnected');
  }

  startPolling() {
    // Poll for notifications from IoT_SchedulerNotifications table every 30 seconds
    this.pollingInterval = setInterval(async () => {
      await this.fetchNotifications();
    }, 30000);
    
    // Also fetch immediately on connect
    this.fetchNotifications();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchNotifications() {
    try {
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) return;

      const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/manage-scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_notifications',
          user_email: userEmail,
          limit: 50  // Fetch last 50 notifications
        })
      });

      if (!response.ok) {
        console.warn('Scheduler notifications API not available');
        return;
      }

      const result = await response.json();
      if (!result.success) return;

      const notifications = result.notifications || [];
      
      // Get list of already processed notification IDs
      const processedIds = new Set(
        JSON.parse(localStorage.getItem('processed_scheduler_notification_ids') || '[]')
      );

      // Process new notifications (unread ones we haven't seen before)
      const newNotifications = notifications.filter((notif: any) => 
        !notif.read && !processedIds.has(notif.notification_id)
      );

      for (const notification of newNotifications) {
        // Mark as processed
        processedIds.add(notification.notification_id);
        
        const severity = notification.status === 'success' ? 'success' : 'error';
        const message = notification.message || `Task '${notification.task_name}' ${notification.status}: Executed ${notification.command} on ${notification.device_id}`;
        
        // Send to NotificationManager for in-app display
        await notificationManager.notify({
          id: notification.notification_id,
          title: `Scheduled Task: ${notification.task_name}`,
          message: message,
          severity: severity,
          type: 'scheduler_trigger',
          priority: notification.status === 'success' ? 'normal' : 'high',
          channel: 'device',
          deviceId: notification.device_id,
          groupKey: `scheduler_${notification.task_id}`,
          duration: 5000,
          tags: ['scheduler', 'task', notification.device_id, notification.task_id],
          showInApp: true,
          showNative: true,
          enableAWSSNS: false, // Backend already handles SNS
        });

        // Also emit for backward compatibility
        const formattedNotification: SchedulerNotification = {
          id: notification.notification_id,
          type: 'scheduler_trigger',
          title: `Scheduled Task: ${notification.task_name}`,
          message: message,
          task_id: notification.task_id,
          task_name: notification.task_name,
          device_id: notification.device_id,
          command: notification.command,
          status: notification.status,
          timestamp: notification.timestamp,
          severity: severity
        };

        this.emit('notification', formattedNotification);
        this.storeNotification(formattedNotification);
      }

      // Save processed IDs (keep last 1000)
      const processedArray = Array.from(processedIds);
      if (processedArray.length > 1000) {
        processedArray.splice(0, processedArray.length - 1000);
      }
      localStorage.setItem('processed_scheduler_notification_ids', JSON.stringify(processedArray));

    } catch (error) {
      console.error('Error fetching scheduler notifications:', error);
    }
  }

  private storeNotification(notification: SchedulerNotification) {
    try {
      const stored = JSON.parse(localStorage.getItem('scheduler_notifications') || '[]');
      stored.unshift(notification);
      // Keep only last 100
      if (stored.length > 100) {
        stored.splice(100);
      }
      localStorage.setItem('scheduler_notifications', JSON.stringify(stored));
    } catch (error) {
      console.error('Error storing scheduler notification:', error);
    }
  }
}

// Export singleton instance
const schedulerNotificationService = new SchedulerNotificationService();
export default schedulerNotificationService;

