import { useEffect, useState, useCallback } from 'react';
import globalTimerService from '../services/GlobalTimerService';
import { DeviceData } from '../types';

export const useGlobalTimer = () => {
  const [isRunning, setIsRunning] = useState(globalTimerService.isRunning);
  const [deviceStatuses, setDeviceStatuses] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    console.log('useGlobalTimer: Hook initialized');
    
    // Start the global timer when the hook is first used
    if (!globalTimerService.isRunning) {
      console.log('useGlobalTimer: Starting global timer service');
      globalTimerService.start();
      setIsRunning(true);
    } else {
      console.log('useGlobalTimer: Global timer service already running');
    }

    // Listen for status updates
    const handleStatusUpdate = () => {
      setDeviceStatuses(globalTimerService.getAllDeviceStatuses());
    };

    const handleDeviceStatusUpdate = (data: { deviceId: string, status: string }) => {
      setDeviceStatuses(prev => ({
        ...prev,
        [data.deviceId]: data.status
      }));
    };

    const handleStatusChange = (data: any) => {
      console.log('Status change detected:', data);
      // You can emit notifications here or handle them in the component
    };

    // Add event listeners
    globalTimerService.on('statusUpdate', handleStatusUpdate);
    globalTimerService.on('deviceStatusUpdate', handleDeviceStatusUpdate);
    globalTimerService.on('statusChange', handleStatusChange);

    // Cleanup
    return () => {
      globalTimerService.off('statusUpdate', handleStatusUpdate);
      globalTimerService.off('deviceStatusUpdate', handleDeviceStatusUpdate);
      globalTimerService.off('statusChange', handleStatusChange);
    };
  }, []);

  const updateDeviceStatus = useCallback((deviceId: string, deviceData: DeviceData) => {
    console.log(`useGlobalTimer: updateDeviceStatus called for device ${deviceId}`);
    const statusInfo = globalTimerService.calculateDeviceStatus(deviceData);
    console.log(`useGlobalTimer: Calculated status info:`, statusInfo);
    globalTimerService.updateDeviceStatus(deviceId, deviceData);
  }, []);

  const getDeviceStatus = useCallback((deviceId: string) => {
    const status = globalTimerService.getDeviceStatus(deviceId);
    console.log(`useGlobalTimer: getDeviceStatus for ${deviceId}: ${status}`);
    return status;
  }, []);

  const getStatusHistory = useCallback((deviceId: string) => {
    return globalTimerService.getStatusHistory(deviceId);
  }, []);

  const clearDevice = useCallback((deviceId: string) => {
    globalTimerService.clearDevice(deviceId);
  }, []);

  return {
    isRunning,
    deviceStatuses,
    updateDeviceStatus,
    getDeviceStatus,
    getStatusHistory,
    clearDevice
  };
};

export default useGlobalTimer;

