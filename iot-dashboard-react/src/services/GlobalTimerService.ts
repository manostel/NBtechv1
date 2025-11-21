import { EventEmitter } from 'events';
import { Device } from '../types';

interface StatusHistoryEntry {
  status: string;
  timestamp: number;
  timeDiff: number | null;
  source: string;
}

interface DeviceStatusInfo {
  status: string;
  lastSeen: Date | null;
  timeDiff: number | null;
}

interface StatusChangeEvent {
  deviceId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: number;
  timeDiff: number | null;
}

interface DeviceStatusUpdateEvent {
  deviceId: string;
  status: string;
  timestamp: number;
  timeDiff: number | null;
}

class GlobalTimerService extends EventEmitter {
  private intervals: Map<string, NodeJS.Timeout>;
  public isRunning: boolean;
  private deviceStatuses: Map<string, string>;
  private lastStatusChanges: Map<string, number>;
  private lastNotifications: Map<string, number>;
  private statusHistory?: Map<string, StatusHistoryEntry[]>;
  
  // Constants
  private readonly STATUS_CHANGE_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  private readonly NOTIFICATION_COOLDOWN = 10 * 60 * 1000; // 10 minutes
  private readonly STATUS_HISTORY_LIMIT = 10;
  private readonly INACTIVE_TIMEOUT_MINUTES = 7;

  constructor() {
    super();
    this.intervals = new Map();
    this.isRunning = false;
    this.deviceStatuses = new Map();
    this.lastStatusChanges = new Map();
    this.lastNotifications = new Map();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Device status update interval (every 1 minute)
    const statusInterval = setInterval(() => {
      this.emit('statusUpdate');
    }, 60000);
    
    // Battery state update interval (every 15 seconds)
    const batteryInterval = setInterval(() => {
      this.emit('batteryUpdate');
    }, 15000);
    
    // Device data update interval (every 2 minutes)
    const dataInterval = setInterval(() => {
      this.emit('dataUpdate');
    }, 120000);
    
    this.intervals.set('status', statusInterval);
    this.intervals.set('battery', batteryInterval);
    this.intervals.set('data', dataInterval);
    
    console.log('GlobalTimerService started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    
    console.log('GlobalTimerService stopped');
  }

  // Device status management
  updateDeviceStatus(deviceId: string, deviceData: Device): void {
    console.log(`GlobalTimer: updateDeviceStatus called for device ${deviceId}`);
    
    // Calculate status from device data
    const statusInfo = this.calculateDeviceStatus(deviceData);
    const newStatus = statusInfo.status;
    const timeDiff = statusInfo.timeDiff;
    
    const now = Date.now();
    const currentStatus = this.deviceStatuses.get(deviceId);
    
    console.log(`GlobalTimer: Device ${deviceId} current status: ${currentStatus}, new status: ${newStatus}`);
    
    // Update status history
    const statusHistory = this.getStatusHistory(deviceId);
    statusHistory.push({
      status: newStatus,
      timestamp: now,
      timeDiff: timeDiff,
      source: 'global_timer'
    });
    
    // Keep only last N entries
    if (statusHistory.length > this.STATUS_HISTORY_LIMIT) {
      statusHistory.splice(0, statusHistory.length - this.STATUS_HISTORY_LIMIT);
    }
    
    // Check if status has actually changed
    if (currentStatus !== newStatus) {
      const lastStatusChange = this.lastStatusChanges.get(deviceId);
      const lastNotification = this.lastNotifications.get(deviceId);
      
      const timeSinceLastChange = !lastStatusChange ? Infinity : now - lastStatusChange;
      const timeSinceLastNotification = !lastNotification ? Infinity : now - lastNotification;
      
      // Check if we should notify
      const shouldNotify = timeSinceLastChange > this.STATUS_CHANGE_COOLDOWN && 
                          timeSinceLastNotification > this.NOTIFICATION_COOLDOWN &&
                          this.isStatusStable(deviceId, newStatus);
      
      if (shouldNotify) {
        console.log(`Device ${deviceId} status changed: ${currentStatus} → ${newStatus} (${Math.round(timeDiff || 0)}s ago)`);
        this.emit('statusChange', {
          deviceId,
          oldStatus: currentStatus || 'Unknown',
          newStatus,
          timestamp: now,
          timeDiff
        } as StatusChangeEvent);
        this.lastNotifications.set(deviceId, now);
      }
      
      this.lastStatusChanges.set(deviceId, now);
    }
    
    this.deviceStatuses.set(deviceId, newStatus);
    
    // Emit status update for this specific device
    this.emit('deviceStatusUpdate', {
      deviceId,
      status: newStatus,
      timestamp: now,
      timeDiff
    } as DeviceStatusUpdateEvent);
  }

  getDeviceStatus(deviceId: string): string {
    return this.deviceStatuses.get(deviceId) || 'Offline';
  }

  getStatusHistory(deviceId: string): StatusHistoryEntry[] {
    if (!this.statusHistory) {
      this.statusHistory = new Map();
    }
    if (!this.statusHistory.has(deviceId)) {
      this.statusHistory.set(deviceId, []);
    }
    return this.statusHistory.get(deviceId)!;
  }

  isStatusStable(deviceId: string, newStatus: string): boolean {
    const history = this.getStatusHistory(deviceId);
    if (history.length < 3) return true;
    
    // Check if the last 3 status changes are the same
    const lastThree = history.slice(-3);
    return lastThree.every(entry => entry.status === newStatus);
  }

  // Calculate device status based on timestamp
  calculateDeviceStatus(deviceData: Device): DeviceStatusInfo {
    try {
      if (!deviceData?.latest_data?.timestamp) {
        console.log('GlobalTimer: No timestamp data, returning Offline');
        return { status: 'Offline', lastSeen: null, timeDiff: null };
      }
      
      const timestamp = deviceData.latest_data.timestamp;
      console.log(`GlobalTimer: Processing timestamp: ${timestamp}`);
      
      let lastUpdateTime = new Date(timestamp);
      
      // If the first attempt fails, try parsing as a different format
      if (isNaN(lastUpdateTime.getTime())) {
        console.log('GlobalTimer: First parse failed, trying alternative formats');
        
        // Try DD/MM/YYYY format with 24-hour time (24/10/2025, 15:45:13)
        const ddMMyyyyMatch = String(timestamp).match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
        if (ddMMyyyyMatch) {
          const [, day, month, year, hour, minute, second] = ddMMyyyyMatch;
          const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}Z`;
          console.log(`GlobalTimer: Converting DD/MM/YYYY 24H to ISO: ${isoString}`);
          lastUpdateTime = new Date(isoString);
        }
        
        // If still invalid, try MM/DD/YYYY format with 24-hour time
        if (isNaN(lastUpdateTime.getTime())) {
          const mmDDyyyyMatch = String(timestamp).match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
          if (mmDDyyyyMatch) {
            const [, month, day, year, hour, minute, second] = mmDDyyyyMatch;
            const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}Z`;
            console.log(`GlobalTimer: Converting MM/DD/YYYY 24H to ISO: ${isoString}`);
            lastUpdateTime = new Date(isoString);
          }
        }
      }
      
      const now = new Date();
      
      console.log(`GlobalTimer: Parsed timestamp: ${lastUpdateTime.toISOString()}`);
      console.log(`GlobalTimer: Current time: ${now.toISOString()}`);
      
      if (isNaN(lastUpdateTime.getTime())) {
        console.log('GlobalTimer: Invalid timestamp after all attempts, returning Offline');
        return { status: 'Offline', lastSeen: null, timeDiff: null };
      }
      
      const timeDiffSeconds = (now.getTime() - lastUpdateTime.getTime()) / 1000;
      const timeDiffMinutes = timeDiffSeconds / 60;
      
      console.log(`GlobalTimer: Time difference: ${timeDiffSeconds.toFixed(0)} seconds (${timeDiffMinutes.toFixed(2)} minutes)`);
      console.log(`GlobalTimer: Timeout threshold: ${this.INACTIVE_TIMEOUT_MINUTES} minutes`);
      
      const status = timeDiffMinutes <= this.INACTIVE_TIMEOUT_MINUTES ? 'Online' : 'Offline';
      console.log(`GlobalTimer: Calculated status ${status} for device (${timeDiffMinutes.toFixed(2)} minutes ago)`);
      
      return {
        status: status,
        lastSeen: lastUpdateTime,
        timeDiff: timeDiffSeconds
      };
    } catch (error) {
      console.error('Error calculating device status:', error);
      return { status: 'Offline', lastSeen: null, timeDiff: null };
    }
  }

  // Get all device statuses
  getAllDeviceStatuses(): Record<string, string> {
    return Object.fromEntries(this.deviceStatuses);
  }

  // Clear device data
  clearDevice(deviceId: string): void {
    this.deviceStatuses.delete(deviceId);
    this.lastStatusChanges.delete(deviceId);
    this.lastNotifications.delete(deviceId);
    if (this.statusHistory) {
      this.statusHistory.delete(deviceId);
    }
  }
}

// Create singleton instance
const globalTimerService = new GlobalTimerService();

export default globalTimerService;


