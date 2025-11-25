import NotificationService from './NotificationService';
import { Device, Alarm } from '../types';

class DeviceNotificationService {
  static async initialize() {
    await NotificationService.initialize();
  }

  static async notifyDeviceStatusChange(device: Device, oldStatus: string, newStatus: string) {
    if (oldStatus !== newStatus) {
      await NotificationService.showDeviceStatusNotification(device, oldStatus, newStatus);
    }
  }

  static async notifyBatteryLevel(device: Device, batteryLevel: number) {
    if (batteryLevel <= 20) {
      await NotificationService.showBatteryLowNotification(device, batteryLevel);
    }
  }

  static async notifySignalStrength(device: Device, signalStrength: number) {
    if (signalStrength <= 30) {
      await NotificationService.showSignalWeakNotification(device, signalStrength);
    }
  }

  static async notifyThresholdExceeded(device: Device, metric: string, value: number, threshold: number) {
    await NotificationService.showThresholdExceededNotification(device, metric, value, threshold);
  }

  static async notifyAlarmTriggered(alarm: Alarm) {
    await NotificationService.showAlarmNotification(alarm);
  }

  static async notifyCommandExecuted(device: Device, command: string, success: boolean) {
    const title = `Command ${success ? 'Executed' : 'Failed'}`;
    const body = `${command} command ${success ? 'successfully executed' : 'failed'} on ${device.name || 'Device'}`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: success ? 'success' : 'error',
      type: 'command_executed'
    });
  }

  static async notifyDeviceReconnected(device: Device) {
    const title = `Device Reconnected`;
    const body = `${device.name || 'Device'} is back online`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'success',
      type: 'device_reconnected'
    });
  }

  static async notifyDeviceDisconnected(device: Device) {
    const title = `Device Disconnected`;
    const body = `${device.name || 'Device'} is offline`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'error',
      type: 'device_disconnected'
    });
  }
}

export default DeviceNotificationService;

