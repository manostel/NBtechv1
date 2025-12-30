import notificationManager from '../services/NotificationManager';
import { Device, Alarm } from '../types';

class DeviceNotificationService {
  static async initialize() {
    // NotificationManager handles initialization automatically
    // This method is kept for backward compatibility
  }

  static async notifyDeviceStatusChange(device: Device, oldStatus: string, newStatus: string) {
    if (oldStatus !== newStatus) {
      await notificationManager.notifyDeviceStatusChange(device, oldStatus, newStatus);
    }
  }

  static async notifyBatteryLevel(device: Device, batteryLevel: number) {
    if (batteryLevel <= 20) {
      await notificationManager.notify({
        title: 'Low Battery Alert',
        message: `${device.name || device.client_id} battery is low (${batteryLevel}%)`,
        severity: 'warning',
        priority: 'high',
        type: 'battery_low',
        deviceId: device.client_id,
        groupKey: `battery_${device.client_id}`,
      });
    }
  }

  static async notifySignalStrength(device: Device, signalStrength: number) {
    if (signalStrength <= 30) {
      await notificationManager.notify({
        title: 'Weak Signal Alert',
        message: `${device.name || device.client_id} has weak signal (${signalStrength}%)`,
        severity: 'warning',
        priority: 'normal',
        type: 'signal_weak',
        deviceId: device.client_id,
        groupKey: `signal_${device.client_id}`,
      });
    }
  }

  static async notifyThresholdExceeded(device: Device, metric: string, value: number, threshold: number) {
    await notificationManager.notify({
      title: 'Threshold Exceeded',
      message: `${device.name || device.client_id} ${metric} is ${value} (threshold: ${threshold})`,
      severity: 'warning',
      priority: 'normal',
      type: 'threshold_exceeded',
      deviceId: device.client_id,
    });
  }

  static async notifyAlarmTriggered(alarm: Alarm, device: Device) {
    await notificationManager.notifyAlarm(alarm, device);
  }

  static async notifyCommandExecuted(device: Device, command: string, success: boolean) {
    await notificationManager.notifyCommandResult(device, command, success);
  }

  static async notifyDeviceReconnected(device: Device) {
    await notificationManager.notify({
      title: 'Device Reconnected',
      message: `${device.name || device.client_id} is back online`,
      severity: 'success',
      priority: 'normal',
      type: 'device_reconnected',
      deviceId: device.client_id,
    });
  }

  static async notifyDeviceDisconnected(device: Device) {
    await notificationManager.notify({
      title: 'Device Disconnected',
      message: `${device.name || device.client_id} is offline`,
      severity: 'error',
      priority: 'high',
      type: 'device_disconnected',
      deviceId: device.client_id,
      persistent: true, // Persistent for offline notifications
    });
  }
}

export default DeviceNotificationService;

