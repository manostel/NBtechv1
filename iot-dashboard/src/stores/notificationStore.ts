// Notification Store - Zustand store for notification state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QueuedNotification, NotificationSeverity, NotificationPriority } from '../services/NotificationManager';

interface NotificationState {
  notifications: QueuedNotification[];
  unreadCount: number;
  isNotificationCenterOpen: boolean;
  preferences: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showInApp: boolean;
    showNative: boolean;
    minPriority: NotificationPriority;
    enabledTypes: string[];
  };
  
  // Actions
  setNotifications: (notifications: QueuedNotification[]) => void;
  addNotification: (notification: QueuedNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  setNotificationCenterOpen: (open: boolean) => void;
  updatePreferences: (preferences: Partial<NotificationState['preferences']>) => void;
  getUnreadCount: () => number;
}

const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isNotificationCenterOpen: false,
      preferences: {
        soundEnabled: true,
        vibrationEnabled: true,
        showInApp: true,
        showNative: true,
        minPriority: 'normal',
        enabledTypes: ['alarm', 'device_status', 'subscription', 'command'],
      },

      setNotifications: (notifications) => {
        set({ 
          notifications,
          unreadCount: notifications.filter(n => !n.read && !n.dismissed).length,
        });
      },

      addNotification: (notification) => {
        const current = get().notifications;
        // Check if notification already exists
        if (!current.find(n => n.id === notification.id)) {
          const updated = [notification, ...current].slice(0, 1000); // Keep last 1000
          set({ 
            notifications: updated,
            unreadCount: updated.filter(n => !n.read && !n.dismissed).length,
          });
        }
      },

      markAsRead: (id) => {
        const notifications = get().notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        );
        set({ 
          notifications,
          unreadCount: notifications.filter(n => !n.read && !n.dismissed).length,
        });
      },

      markAllAsRead: () => {
        const notifications = get().notifications.map(n => ({ ...n, read: true }));
        set({ 
          notifications,
          unreadCount: 0,
        });
      },

      dismiss: (id) => {
        const notifications = get().notifications.map(n =>
          n.id === id ? { ...n, dismissed: true } : n
        );
        set({ 
          notifications,
          unreadCount: notifications.filter(n => !n.read && !n.dismissed).length,
        });
      },

      clearAll: () => {
        set({ 
          notifications: [],
          unreadCount: 0,
        });
      },

      setNotificationCenterOpen: (open) => {
        console.log('Setting notification center open to:', open);
        set({ isNotificationCenterOpen: open });
      },

      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read && !n.dismissed).length;
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        notifications: state.notifications.slice(0, 100), // Only persist last 100
      }),
    }
  )
);

export default useNotificationStore;

