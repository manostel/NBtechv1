import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { DeviceData, DashboardData, TimeRange } from '../types';

const DEVICE_DATA_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices-data";
const DASHBOARD_DATA_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
const DASHBOARD_LATEST_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-latest";

/**
 * Fetch device data (latest values)
 */
export const useDeviceData = (
  deviceId: string | undefined,
  userEmail: string | undefined,
  options?: Omit<UseQueryOptions<DeviceData, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<DeviceData, Error>({
    queryKey: ['deviceData', deviceId, userEmail],
    queryFn: async (): Promise<DeviceData> => {
      if (!deviceId || !userEmail) {
        throw new Error('Device ID and user email are required');
      }

      const response = await fetch(DEVICE_DATA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          action: 'get_device_data',
          client_id: deviceId,
          user_email: userEmail
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle both response formats
      let deviceData: DeviceData;
      try {
        if (result.body) {
          const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          deviceData = parsed.device_data || parsed;
        } else {
          deviceData = result.device_data || result;
        }
      } catch (e) {
        deviceData = result;
      }

      return deviceData;
    },
    enabled: !!deviceId && !!userEmail,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Auto-refetch every 60 seconds
    ...options,
  });
};

/**
 * Fetch dashboard data (historical data with time range)
 */
export const useDashboardData = (
  deviceId: string | undefined,
  userEmail: string | undefined,
  timeRange: TimeRange | undefined,
  selectedVariables: string[] = [],
  options?: Omit<UseQueryOptions<DashboardData, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboardData', deviceId, userEmail, timeRange, selectedVariables],
    queryFn: async (): Promise<DashboardData> => {
      if (!deviceId || !userEmail || !timeRange) {
        throw new Error('Device ID, user email, and time range are required');
      }

      // Calculate points based on time range
      const pointsMap: Record<TimeRange, number> = {
        'live': 60,
        '15m': 15,
        '1h': 60,
        '2h': 120,
        '4h': 240,
        '6h': 360,
        '8h': 480,
        '16h': 960,
        '24h': 288,
        '3d': 432,
        '7d': 336,
        '30d': 720,
      };

      const response = await fetch(DASHBOARD_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_dashboard_data',
          client_id: deviceId,
          user_email: userEmail,
          time_range: timeRange,
          points: pointsMap[timeRange] || 60,
          include_state: true,
          selected_variables: selectedVariables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as DashboardData;
    },
    enabled: !!deviceId && !!userEmail && !!timeRange,
    staleTime: 60000, // Consider data fresh for 1 minute
    ...options,
  });
};

/**
 * Fetch latest dashboard data
 */
export const useDashboardLatest = (
  deviceId: string | undefined,
  userEmail: string | undefined,
  options?: Omit<UseQueryOptions<DashboardData, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboardLatest', deviceId, userEmail],
    queryFn: async (): Promise<DashboardData> => {
      if (!deviceId || !userEmail) {
        throw new Error('Device ID and user email are required');
      }

      const response = await fetch(DASHBOARD_LATEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_latest_data',
          client_id: deviceId,
          user_email: userEmail
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as DashboardData;
    },
    enabled: !!deviceId && !!userEmail,
    staleTime: 15000, // Consider data fresh for 15 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
    ...options,
  });
};

