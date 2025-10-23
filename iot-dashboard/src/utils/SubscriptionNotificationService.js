import { EventEmitter } from 'events';

class SubscriptionNotificationService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.subscriptions = new Map();
  }

  connect() {
    try {
      // For now, we'll use polling to check for subscription triggers
      // In a production environment, you would use WebSockets or Server-Sent Events
      this.startPolling();
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      console.error('Error connecting to notification service:', error);
      this.emit('error', error);
    }
  }

  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.emit('disconnected');
  }

  startPolling() {
    // Poll for subscription triggers every 30 seconds
    this.pollingInterval = setInterval(async () => {
      await this.checkSubscriptionTriggers();
    }, 30000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async checkSubscriptionTriggers() {
    try {
      // Get all active subscriptions for the current user
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) return;

      const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/manage-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_subscriptions',
          user_email: userEmail
        })
      });

      if (!response.ok) return;

      const result = await response.json();
      const subscriptions = result.subscriptions || [];

      // Check each subscription for triggers
      for (const subscription of subscriptions) {
        if (!subscription.enabled) continue;

        await this.checkSingleSubscription(subscription);
      }
    } catch (error) {
      console.error('Error checking subscription triggers:', error);
    }
  }

  async checkSingleSubscription(subscription) {
    try {
      // Get latest device data
      const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_device_data',
          client_id: subscription.device_id,
          user_email: subscription.user_email
        })
      });

      if (!response.ok) return;

      const result = await response.json();
      const deviceData = result.device_data;

      if (!deviceData || !deviceData[subscription.parameter_name]) return;

      const currentValue = deviceData[subscription.parameter_name];
      const shouldTrigger = this.evaluateCondition(
        subscription.condition_type,
        currentValue,
        subscription.threshold_value
      );

      if (shouldTrigger) {
        // Check if we've already notified for this trigger recently (avoid spam)
        const lastNotificationKey = `${subscription.subscription_id}_${currentValue}`;
        const lastNotification = localStorage.getItem(lastNotificationKey);
        const now = Date.now();
        
        // Only notify if we haven't notified for this value in the last 5 minutes
        if (!lastNotification || (now - parseInt(lastNotification)) > 300000) {
          this.triggerNotification(subscription, currentValue);
          localStorage.setItem(lastNotificationKey, now.toString());
        }
      }
    } catch (error) {
      console.error('Error checking single subscription:', error);
    }
  }

  evaluateCondition(conditionType, currentValue, thresholdValue) {
    switch (conditionType) {
      case 'change':
        return true; // Always trigger on change
      case 'above':
        return currentValue > thresholdValue;
      case 'below':
        return currentValue < thresholdValue;
      case 'equals':
        return currentValue === thresholdValue;
      case 'not_equals':
        return currentValue !== thresholdValue;
      default:
        return false;
    }
  }

  triggerNotification(subscription, currentValue) {
    const notification = {
      id: `${subscription.subscription_id}_${Date.now()}`,
      type: 'subscription_trigger',
      title: `Device Alert: ${subscription.device_id}`,
      message: this.formatNotificationMessage(subscription, currentValue),
      subscription: subscription,
      currentValue: currentValue,
      timestamp: new Date().toISOString(),
      severity: this.getNotificationSeverity(subscription),
      actions: [
        {
          label: 'View Device',
          action: 'view_device',
          deviceId: subscription.device_id
        },
        {
          label: 'Manage Subscriptions',
          action: 'manage_subscriptions'
        }
      ]
    };

    this.emit('notification', notification);

    // Store notification in localStorage for persistence
    this.storeNotification(notification);

    // Send to notification service if configured
    if (subscription.notification_method === 'email' || subscription.notification_method === 'both') {
      this.sendEmailNotification(notification);
    }
  }

  formatNotificationMessage(subscription, currentValue) {
    const deviceName = subscription.device_id; // You might want to get the actual device name
    const parameterName = subscription.parameter_name;
    const condition = subscription.condition_type;
    const threshold = subscription.threshold_value;

    switch (condition) {
      case 'change':
        return `${parameterName} changed to ${currentValue}`;
      case 'above':
        return `${parameterName} (${currentValue}) is above threshold (${threshold})`;
      case 'below':
        return `${parameterName} (${currentValue}) is below threshold (${threshold})`;
      case 'equals':
        return `${parameterName} equals ${currentValue}`;
      case 'not_equals':
        return `${parameterName} (${currentValue}) is not equal to ${threshold}`;
      default:
        return `${parameterName} value changed to ${currentValue}`;
    }
  }

  getNotificationSeverity(subscription) {
    // You can customize severity based on parameter type or other factors
    const criticalParams = ['battery', 'signal_quality', 'status'];
    if (criticalParams.includes(subscription.parameter_name)) {
      return 'error';
    }
    return 'info';
  }

  storeNotification(notification) {
    try {
      const notifications = JSON.parse(localStorage.getItem('subscription_notifications') || '[]');
      notifications.unshift(notification);
      
      // Keep only the last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      localStorage.setItem('subscription_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  getStoredNotifications() {
    try {
      return JSON.parse(localStorage.getItem('subscription_notifications') || '[]');
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }

  clearNotifications() {
    localStorage.removeItem('subscription_notifications');
    this.emit('notifications_cleared');
  }

  async sendEmailNotification(notification) {
    try {
      // This would integrate with your email service
      // For now, we'll just log it
      console.log('Email notification would be sent:', notification);
      
      // In a real implementation, you would call an email service API
      // await fetch('your-email-service-api', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: notification.subscription.user_email,
      //     subject: notification.title,
      //     body: notification.message
      //   })
      // });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Method to manually trigger a subscription check (useful for testing)
  async triggerManualCheck(deviceId, parameterName, currentValue) {
    try {
      const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/manage-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'check_triggers',
          device_id: deviceId,
          parameter_name: parameterName,
          current_value: currentValue
        })
      });

      if (!response.ok) return;

      const result = await response.json();
      const triggeredSubscriptions = result.triggered_subscriptions || [];

      // Process triggered subscriptions
      for (const subscription of triggeredSubscriptions) {
        this.triggerNotification(subscription, currentValue);
      }
    } catch (error) {
      console.error('Error in manual trigger check:', error);
    }
  }
}

// Create and export a singleton instance
const subscriptionNotificationService = new SubscriptionNotificationService();
export default subscriptionNotificationService;
