import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Device } from '../types';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  user: User | null;
  selectedDevice: Device | null;
  loginTimestamp: number | null;
  login: (user: User) => void;
  logout: () => void;
  setSelectedDevice: (device: Device) => void;
  isSessionValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      selectedDevice: null,
      loginTimestamp: null,

      login: (user: User) => {
        set({
          user,
          loginTimestamp: Date.now(),
        });
      },

      logout: () => {
        set({
          user: null,
          selectedDevice: null,
          loginTimestamp: null,
        });
      },

      setSelectedDevice: (device: Device) => {
        set({ selectedDevice: device });
      },

      isSessionValid: (): boolean => {
        const { loginTimestamp } = get();
        if (!loginTimestamp) return false;
        return Date.now() - loginTimestamp < SESSION_DURATION;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        selectedDevice: state.selectedDevice,
        loginTimestamp: state.loginTimestamp,
      }),
    }
  )
);

