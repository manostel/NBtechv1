// Notification Provider - Wraps app and manages notification display
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import notificationManager from '../../services/NotificationManager';
import useNotificationStore from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import NotificationToast from './NotificationToast';
import NotificationCenter from './NotificationCenter';
import { QueuedNotification } from '../../services/NotificationManager';
import { Device } from '../../types';

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { addNotification, setNotifications, setNotificationCenterOpen, isNotificationCenterOpen, preferences } = useNotificationStore();
  const { setSelectedDevice, user } = useAuthStore();
  const [activeToasts, setActiveToasts] = useState<QueuedNotification[]>([]);
  const maxConcurrentToasts = 3;

  // Sync notifications from NotificationManager on mount
  useEffect(() => {
    const existingNotifications = notificationManager.getNotifications({ limit: 1000 });
    if (existingNotifications.length > 0) {
      setNotifications(existingNotifications);
    }
  }, [setNotifications]);

  useEffect(() => {
    // Listen for new notifications
    const handleNotification = (notification: QueuedNotification) => {
      // Check preferences
      if (!preferences.enabledTypes.includes(notification.type)) {
        return;
      }

      if (notification.priority === 'low' && preferences.minPriority !== 'low') {
        return;
      }

      // Add to store
      addNotification(notification);

      // Show toast if enabled
      if (preferences.showInApp && notification.showInApp) {
        setActiveToasts((prev) => {
          const updated = [notification, ...prev].slice(0, maxConcurrentToasts);
          return updated;
        });
      }
    };

    notificationManager.on('notification', handleNotification);

    return () => {
      notificationManager.off('notification', handleNotification);
    };
  }, [addNotification, preferences]);

  const handleToastClose = (notificationId: string) => {
    setActiveToasts((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleNotificationAction = async (action: string, notification: QueuedNotification) => {
    switch (action) {
      case 'view_device':
      case 'view_alarms':
        if (notification.deviceId) {
          try {
            // Fetch device information
            const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                action: 'get_devices',
                user_email: user?.email
              })
            });

            if (response.ok) {
              const result = await response.json();
              const devices: Device[] = result.devices || [];
              
              // Find the device by deviceId
              const device = devices.find(d => d.client_id === notification.deviceId);
              
              if (device) {
                // Set selected device
                setSelectedDevice(device);
                
                // Navigate to dashboard with tab parameter
                // Tab 0 = Overview, 1 = Charts, 2 = Commands, 3 = Alarms, 4 = Subscriptions
                const tabIndex = action === 'view_alarms' ? 3 : 0;
                navigate('/dashboard', { state: { tab: tabIndex } });
                
                // Close notification center if open
                setNotificationCenterOpen(false);
              } else {
                console.warn('Device not found:', notification.deviceId);
                // Still navigate to devices page
                navigate('/devices');
              }
            } else {
              // Fallback: navigate to devices page
              navigate('/devices');
            }
          } catch (error) {
            console.error('Error fetching device:', error);
            // Fallback: navigate to devices page
            navigate('/devices');
          }
        } else {
          // No device ID, just go to devices page
          navigate('/devices');
        }
        break;
      case 'dismiss':
        notificationManager.dismiss(notification.id);
        break;
      default:
        console.log('Action:', action, notification);
    }
  };

  return (
    <>
      {children}
      
      {/* Toast Notifications */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: '500px',
          pointerEvents: 'none',
          '& > *': {
            pointerEvents: 'auto',
          },
        }}
      >
        {activeToasts.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => handleToastClose(notification.id)}
            onAction={handleNotificationAction}
          />
        ))}
      </Box>

      {/* Notification Center */}
      <NotificationCenter
        open={isNotificationCenterOpen}
        onClose={() => {
          console.log('Closing notification center');
          setNotificationCenterOpen(false);
        }}
        onAction={handleNotificationAction}
      />
    </>
  );
};

export default NotificationProvider;

