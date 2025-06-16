import NotificationService from './NotificationService';

class DeviceNotificationService {
  static async initialize() {
    await NotificationService.initialize();
  }

  static async notifyDeviceStatusChange(device, oldStatus, newStatus) {
    if (oldStatus !== newStatus) {
      await NotificationService.showDeviceStatusNotification(device, oldStatus, newStatus);
    }
  }

  static async notifyBatteryLevel(device, batteryLevel) {
    if (batteryLevel <= 20) {
      await NotificationService.showBatteryLowNotification(device, batteryLevel);
    }
  }

  static async notifySignalStrength(device, signalStrength) {
    if (signalStrength <= 30) {
      await NotificationService.showSignalWeakNotification(device, signalStrength);
    }
  }

  static async notifyThresholdExceeded(device, metric, value, threshold) {
    await NotificationService.showThresholdExceededNotification(device, metric, value, threshold);
  }

  static async notifyAlarmTriggered(alarm) {
    await NotificationService.showAlarmNotification(alarm);
  }

  static async notifyCommandExecuted(device, command, success) {
    const title = `Command ${success ? 'Executed' : 'Failed'}`;
    const body = `${command} command ${success ? 'successfully executed' : 'failed'} on ${device.deviceName || 'Device'}`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: success ? 'success' : 'error',
      type: 'command_executed'
    });
  }

  static async notifyDeviceReconnected(device) {
    const title = `Device Reconnected`;
    const body = `${device.deviceName || 'Device'} is back online`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'success',
      type: 'device_reconnected'
    });
  }

  static async notifyDeviceDisconnected(device) {
    const title = `Device Disconnected`;
    const body = `${device.deviceName || 'Device'} is offline`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'error',
      type: 'device_disconnected'
    });
  }
}

export default DeviceNotificationService; 