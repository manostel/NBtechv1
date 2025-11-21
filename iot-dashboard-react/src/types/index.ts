// Common type definitions for the IoT Dashboard

export interface User {
  email: string;
  name?: string;
  [key: string]: any;
}

export interface Device {
  client_id: string;
  device_name?: string;
  device?: string;
  device_type?: string;
  name?: string;
  latest_data?: {
    timestamp?: string;
    device?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface MetricConfig {
  label: string;
  color: string;
  unit: string;
  alertThresholds?: {
    min?: number;
    max?: number;
  };
}

export interface ChartData {
  labels: Date[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    [key: string]: any;
  }>;
}

export interface DeviceState {
  out1_state?: boolean | number;
  out2_state?: boolean | number;
  motor_speed?: number;
  charging?: boolean;
  power_saving?: boolean;
  in1_state?: boolean | number;
  in2_state?: boolean | number;
  [key: string]: any;
}


