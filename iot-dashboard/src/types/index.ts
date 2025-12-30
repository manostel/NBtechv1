// Common types for the IoT Dashboard

export interface User {
  email: string;
  client_id: string;
  auth_type?: string;
  [key: string]: any; // Allow additional properties
}

export interface Device {
  client_id: string;
  name?: string;
  device_name?: string;
  status?: 'online' | 'offline';
  battery?: number;
  signal_quality?: number;
  [key: string]: any; // Allow additional properties
}

export interface DeviceData {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  battery?: number;
  signal_quality?: number;
  motor_speed?: number;
  timestamp?: string;
  [key: string]: any;
}

export interface DashboardData {
  data: Array<{
    timestamp: string;
    [key: string]: any;
  }>;
  data_latest?: Array<{
    timestamp: string;
    [key: string]: any;
  }>;
  summary?: {
    [key: string]: {
      min?: number;
      max?: number;
      avg?: number;
    };
  };
}

export interface MetricConfigItem {
  label: string;
  unit?: string;
  color?: string;
  icon?: React.ReactNode;
  alertThresholds?: {
    min?: number;
    max?: number;
  };
  [key: string]: any;
}

export type MetricsConfig = Record<string, MetricConfigItem>;

export interface Alarm {
  alarm_id: string;
  variable_name: string;
  condition: string;
  threshold: number;
  description?: string;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  current_value?: number;
  [key: string]: any;
}

export type TimeRange = 'live' | '15m' | '1h' | '2h' | '4h' | '6h' | '8h' | '16h' | '24h' | '3d' | '7d' | '30d';

// Subscription related types
export interface Command {
  action: string;
  value: string;
  target_device: string;
}

export interface Subscription {
  subscription_id?: string;
  user_email?: string;
  device_id: string;
  parameter_type: string;
  parameter_name: string;
  condition_type: string;
  threshold_value?: string | number;
  cooldown_ms?: number;
  tolerance_percent?: number | string;
  notification_method: string;
  enabled: boolean;
  description?: string;
  commands?: Command[];
  last_triggered?: string;
  trigger_count?: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  subscription_id?: string;
  device_id?: string;
  read?: boolean;
  [key: string]: any;
}

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';
export type ConditionType = 'change' | 'above' | 'below' | 'equals' | 'not_equals';

// Device Status types
export interface DeviceStatusInfo {
  status: string;
  last_seen?: string;
  last_status_change?: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  duration?: number;
}

export interface DeviceStartTimeInfo {
  timestamp?: string;
  startup_data?: {
    firmware_version?: string;
    boot_reason?: string;
  };
}
