import NotificationService from './NotificationService';
import { Device } from '../types';

class DeviceNotificationService {
  static async initialize(): Promise<void> {
    await NotificationService.initialize();
  }

  static async notifyDeviceStatusChange(device: Device, oldStatus: string, newStatus: string): Promise<void> {
    if (oldStatus !== newStatus) {
      await NotificationService.showDeviceStatusNotification(device, oldStatus, newStatus);
    }
  }

  static async notifyBatteryLevel(device: Device, batteryLevel: number): Promise<void> {
    if (batteryLevel <= 20) {
      await NotificationService.showBatteryLowNotification(device, batteryLevel);
    }
  }

  static async notifySignalStrength(device: Device, signalStrength: number): Promise<void> {
    if (signalStrength <= 30) {
      await NotificationService.showSignalWeakNotification(device, signalStrength);
    }
  }

  static async notifyThresholdExceeded(device: Device, metric: string, value: number, threshold: number): Promise<void> {
    await NotificationService.showThresholdExceededNotification(device, metric, value, threshold);
  }

  static async notifyAlarmTriggered(alarm: any): Promise<void> {
    await NotificationService.showAlarmNotification(alarm);
  }

  static async notifyCommandExecuted(device: Device, command: string, success: boolean): Promise<void> {
    const title = `Command ${success ? 'Executed' : 'Failed'}`;
    const body = `${command} command ${success ? 'successfully executed' : 'failed'} on ${device.device_name || device.device || 'Device'}`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: success ? 'success' : 'error',
      type: 'command_executed'
    });
  }

  static async notifyDeviceReconnected(device: Device): Promise<void> {
    const title = `Device Reconnected`;
    const body = `${device.device_name || device.device || 'Device'} is back online`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'success',
      type: 'device_reconnected'
    });
  }

  static async notifyDeviceDisconnected(device: Device): Promise<void> {
    const title = `Device Disconnected`;
    const body = `${device.device_name || device.device || 'Device'} is offline`;
    
    await NotificationService.showNotification({
      title,
      body,
      severity: 'error',
      type: 'device_disconnected'
    });
  }
}

export default DeviceNotificationService;


