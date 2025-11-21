import { EventEmitter } from 'events';

class RealTimeSubscriptionDetector extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.lastValues = new Map(); // Track last known values
    this.subscriptionChecks = new Map(); // Cache subscription data
  }

  async connect() {
    try {
      // Method 1: WebSocket connection to your MQTT bridge
      await this.connectWebSocket();
      
      // Method 2: Server-Sent Events (alternative)
      // await this.connectSSE();
      
      // Method 3: Enhanced polling with change detection
      this.startEnhancedPolling();
      
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      console.error('Error connecting to real-time detector:', error);
      this.emit('error', error);
    }
  }

  async connectWebSocket() {
    try {
      // Connect to your MQTT bridge WebSocket endpoint
      // This would be implemented in your MQTT bridge to expose WebSocket
      const wsUrl = 'ws://your-mqtt-bridge:8080/subscriptions';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to MQTT bridge');
        this.reconnectAttempts = 0;
        this.emit('websocket_connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeData(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        this.handleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('websocket_error', error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw error;
    }
  }

  async connectSSE() {
    try {
      // Server-Sent Events alternative
      const eventSource = new EventSource('/api/subscriptions/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeData(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.emit('sse_error', error);
      };
    } catch (error) {
      console.error('SSE connection failed:', error);
      throw error;
    }
  }

  startEnhancedPolling() {
    // Enhanced polling that only checks when we expect changes
    this.pollingInterval = setInterval(async () => {
      await this.checkForChanges();
    }, 5000); // Check every 5 seconds for faster response
  }

  async checkForChanges() {
    try {
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) return;

      // Get all active subscriptions
      const subscriptions = await this.getActiveSubscriptions(userEmail);
      
      // Group subscriptions by device for efficient checking
      const subscriptionsByDevice = this.groupSubscriptionsByDevice(subscriptions);
      
      // Check each device for changes
      for (const [deviceId, deviceSubscriptions] of subscriptionsByDevice) {
        await this.checkDeviceChanges(deviceId, deviceSubscriptions);
      }
    } catch (error) {
      console.error('Error in enhanced polling:', error);
    }
  }

  async getActiveSubscriptions(userEmail) {
    try {
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

      if (!response.ok) return [];

      const result = await response.json();
      return result.subscriptions?.filter(sub => sub.enabled) || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  groupSubscriptionsByDevice(subscriptions) {
    const grouped = new Map();
    
    subscriptions.forEach(subscription => {
      const deviceId = subscription.device_id;
      if (!grouped.has(deviceId)) {
        grouped.set(deviceId, []);
      }
      grouped.get(deviceId).push(subscription);
    });
    
    return grouped;
  }

  async checkDeviceChanges(deviceId, subscriptions) {
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
          client_id: deviceId,
          user_email: localStorage.getItem('user_email')
        })
      });

      if (!response.ok) return;

      const result = await response.json();
      const deviceData = result.device_data;
      
      if (!deviceData) return;

      // Check each subscription for this device
      for (const subscription of subscriptions) {
        const parameterName = subscription.parameter_name;
        const currentValue = deviceData[parameterName];
        
        if (currentValue === undefined) continue;

        // Get last known value
        const lastValueKey = `${deviceId}_${parameterName}`;
        const lastValue = this.lastValues.get(lastValueKey);
        
        // Check if value changed
        const hasChanged = lastValue === undefined || currentValue !== lastValue;
        
        if (hasChanged) {
          // Update stored value
          this.lastValues.set(lastValueKey, currentValue);
          
          // Check if subscription should trigger
          const shouldTrigger = this.evaluateSubscriptionCondition(subscription, currentValue);
          
          if (shouldTrigger) {
            this.triggerSubscriptionNotification(subscription, currentValue, lastValue);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking device ${deviceId}:`, error);
    }
  }

  evaluateSubscriptionCondition(subscription, currentValue) {
    const { condition_type, threshold_value } = subscription;
    
    switch (condition_type) {
      case 'change':
        return true; // Always trigger on any change
      case 'above':
        return currentValue > threshold_value;
      case 'below':
        return currentValue < threshold_value;
      case 'equals':
        return currentValue === threshold_value;
      case 'not_equals':
        return currentValue !== threshold_value;
      default:
        return false;
    }
  }

  triggerSubscriptionNotification(subscription, currentValue, previousValue) {
    const notification = {
      id: `${subscription.subscription_id}_${Date.now()}`,
      type: 'subscription_trigger',
      title: `Device Alert: ${subscription.device_id}`,
      message: this.formatChangeMessage(subscription, currentValue, previousValue),
      subscription: subscription,
      currentValue: currentValue,
      previousValue: previousValue,
      timestamp: new Date().toISOString(),
      severity: this.getNotificationSeverity(subscription),
      changeType: this.getChangeType(currentValue, previousValue)
    };

    this.emit('subscription_triggered', notification);
    
    // Store notification
    this.storeNotification(notification);
  }

  formatChangeMessage(subscription, currentValue, previousValue) {
    const { parameter_name, condition_type, threshold_value } = subscription;
    
    if (condition_type === 'change') {
      return `${parameter_name} changed from ${previousValue} to ${currentValue}`;
    } else if (condition_type === 'above') {
      return `${parameter_name} (${currentValue}) is above threshold (${threshold_value})`;
    } else if (condition_type === 'below') {
      return `${parameter_name} (${currentValue}) is below threshold (${threshold_value})`;
    } else if (condition_type === 'equals') {
      return `${parameter_name} equals ${currentValue}`;
    } else if (condition_type === 'not_equals') {
      return `${parameter_name} (${currentValue}) is not equal to ${threshold_value}`;
    }
    
    return `${parameter_name} changed to ${currentValue}`;
  }

  getChangeType(currentValue, previousValue) {
    if (previousValue === undefined) return 'initial';
    if (currentValue > previousValue) return 'increased';
    if (currentValue < previousValue) return 'decreased';
    return 'changed';
  }

  getNotificationSeverity(subscription) {
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

  handleRealtimeData(data) {
    // Handle real-time data from MQTT bridge
    const { device_id, parameter_name, value, timestamp } = data;
    
    if (!device_id || !parameter_name || value === undefined) return;
    
    // Check if we have subscriptions for this device/parameter
    const subscriptions = this.getSubscriptionsForDeviceParameter(device_id, parameter_name);
    
    for (const subscription of subscriptions) {
      const shouldTrigger = this.evaluateSubscriptionCondition(subscription, value);
      
      if (shouldTrigger) {
        this.triggerSubscriptionNotification(subscription, value, null);
      }
    }
  }

  getSubscriptionsForDeviceParameter(deviceId, parameterName) {
    // This would be implemented to get subscriptions from cache or API
    // For now, return empty array
    return [];
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.isConnected = false;
    this.emit('disconnected');
  }
}

// Create and export singleton
const realTimeSubscriptionDetector = new RealTimeSubscriptionDetector();
export default realTimeSubscriptionDetector;
