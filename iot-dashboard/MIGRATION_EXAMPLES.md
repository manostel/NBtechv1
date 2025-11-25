# Practical Migration Examples

This document shows **concrete code examples** for migrating to the recommended 2025 stack.

---

## Example 1: Migrating from Context API to Zustand

### Before (Current - Context API):

```javascript
// src/components/ThemeContext.js
import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const CustomThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

### After (Recommended - Zustand):

```typescript
// src/stores/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
    }),
    {
      name: 'theme-storage', // localStorage key
    }
  )
);

// Usage in component:
import { useThemeStore } from '../stores/themeStore';

function MyComponent() {
  const { theme, toggleTheme } = useThemeStore();
  // No Provider needed!
}
```

**Benefits:**
- ✅ No Provider wrapper needed
- ✅ Automatic localStorage persistence
- ✅ Only components using `theme` re-render (not all children)
- ✅ TypeScript support built-in

---

## Example 2: Migrating App.js State to Zustand

### Before (Current - useState + localStorage):

```javascript
// src/App.js
function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    // ... complex localStorage logic
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [selectedDevice, setSelectedDevice] = useState(() => {
    const savedDevice = localStorage.getItem('selectedDevice');
    return savedDevice ? JSON.parse(savedDevice) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', new Date().getTime().toString());
    }
  }, [user]);

  // ... more useEffect for selectedDevice
}
```

### After (Recommended - Zustand with Persist):

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  email: string;
  client_id: string;
  auth_type: string;
}

interface Device {
  client_id: string;
  name: string;
  // ... other device properties
}

interface AuthState {
  user: User | null;
  selectedDevice: Device | null;
  loginTimestamp: number | null;
  login: (user: User) => void;
  logout: () => void;
  setSelectedDevice: (device: Device) => void;
  isSessionValid: () => boolean;
}

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      selectedDevice: null,
      loginTimestamp: null,
      
      login: (user) => set({
        user,
        loginTimestamp: Date.now(),
      }),
      
      logout: () => set({
        user: null,
        selectedDevice: null,
        loginTimestamp: null,
      }),
      
      setSelectedDevice: (device) => set({ selectedDevice: device }),
      
      isSessionValid: () => {
        const { loginTimestamp } = get();
        if (!loginTimestamp) return false;
        return Date.now() - loginTimestamp < SESSION_DURATION;
      },
    }),
    {
      name: 'auth-storage',
      // Custom serialization if needed
      partialize: (state) => ({
        user: state.user,
        selectedDevice: state.selectedDevice,
        loginTimestamp: state.loginTimestamp,
      }),
    }
  )
);

// Usage in App.tsx:
import { useAuthStore } from './stores/authStore';

function App() {
  const { user, selectedDevice, login, logout, setSelectedDevice, isSessionValid } = useAuthStore();
  
  // Check session validity on mount
  useEffect(() => {
    if (user && !isSessionValid()) {
      logout();
    }
  }, []);
  
  // Much cleaner!
}
```

---

## Example 3: Migrating API Calls to React Query

### Before (Current - Manual fetch with useState):

```javascript
// In Dashboard.js
const [metricsData, setMetricsData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_device_data',
          client_id: device.client_id,
          user_email: user.email
        })
      });
      const data = await response.json();
      setMetricsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchData();
  const interval = setInterval(fetchData, 60000); // Poll every 60s
  return () => clearInterval(interval);
}, [device.client_id, user.email]);
```

### After (Recommended - React Query):

```typescript
// src/hooks/useDeviceData.ts
import { useQuery } from '@tanstack/react-query';

interface DeviceDataParams {
  client_id: string;
  user_email: string;
}

const fetchDeviceData = async (params: DeviceDataParams) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get_device_data',
      ...params,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch device data');
  }
  
  return response.json();
};

export const useDeviceData = (deviceId: string, userEmail: string) => {
  return useQuery({
    queryKey: ['deviceData', deviceId], // Cache key
    queryFn: () => fetchDeviceData({
      client_id: deviceId,
      user_email: userEmail,
    }),
    refetchInterval: 60000, // Auto-refetch every 60s
    staleTime: 30000, // Consider data fresh for 30s
    enabled: !!deviceId && !!userEmail, // Only fetch if both exist
  });
};

// Usage in Dashboard.tsx:
import { useDeviceData } from '../hooks/useDeviceData';

function Dashboard({ device, user }) {
  const { data: metricsData, isLoading, error, refetch } = useDeviceData(
    device.client_id,
    user.email
  );
  
  // That's it! No useState, no useEffect, no manual intervals!
  // React Query handles:
  // - Loading states
  // - Error states
  // - Caching
  // - Background refetching
  // - Request deduplication
}
```

**Benefits:**
- ✅ **Automatic caching** - same data fetched twice? Uses cache
- ✅ **Background refetching** - keeps data fresh automatically
- ✅ **Request deduplication** - 5 components need same data? 1 request
- ✅ **Built-in loading/error states** - no manual state management
- ✅ **Optimistic updates** - update UI before server responds

---

## Example 4: Migrating GlobalTimerService to React Query

### Before (Current - EventEmitter Service):

```javascript
// src/services/GlobalTimerService.js
import EventEmitter from 'events';

class GlobalTimerService extends EventEmitter {
  constructor() {
    super();
    this.statusInterval = null;
    this.batteryInterval = null;
  }
  
  start() {
    this.statusInterval = setInterval(() => {
      this.emit('statusUpdate');
    }, 60000);
    
    this.batteryInterval = setInterval(() => {
      this.emit('batteryUpdate');
    }, 15000);
  }
  
  stop() {
    clearInterval(this.statusInterval);
    clearInterval(this.batteryInterval);
  }
}

export default new GlobalTimerService();

// Usage in component:
useEffect(() => {
  const handleStatusUpdate = () => {
    fetchLatestData();
  };
  
  globalTimerService.on('statusUpdate', handleStatusUpdate);
  return () => {
    globalTimerService.off('statusUpdate', handleStatusUpdate);
  };
}, []);
```

### After (Recommended - React Query with refetchInterval):

```typescript
// src/hooks/useDeviceStatus.ts
import { useQuery } from '@tanstack/react-query';

export const useDeviceStatus = (deviceId: string) => {
  return useQuery({
    queryKey: ['deviceStatus', deviceId],
    queryFn: () => fetchDeviceStatus(deviceId),
    refetchInterval: 60000, // Every 60s
    staleTime: 50000, // Consider fresh for 50s
  });
};

// src/hooks/useBatteryLevel.ts
export const useBatteryLevel = (deviceId: string) => {
  return useQuery({
    queryKey: ['batteryLevel', deviceId],
    queryFn: () => fetchBatteryLevel(deviceId),
    refetchInterval: 15000, // Every 15s
    staleTime: 10000,
  });
};

// Usage in component:
function Dashboard({ device }) {
  const { data: status } = useDeviceStatus(device.client_id);
  const { data: battery } = useBatteryLevel(device.client_id);
  
  // No event listeners, no cleanup, no manual intervals!
  // React Query handles everything automatically
}
```

---

## Example 5: Vite Configuration

### Before (CRA - craco.config.js):

```javascript
// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Complex webpack configuration
      // ...
    },
  },
};
```

### After (Vite - vite.config.ts):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  // Capacitor compatibility
  base: './',
});
```

**Benefits:**
- ✅ **Much simpler** - no webpack complexity
- ✅ **Faster** - native ESM, no bundling in dev
- ✅ **Better path aliases** - cleaner imports
- ✅ **TypeScript support** - config file can be .ts

---

## Example 6: TypeScript Component Migration

### Before (JavaScript):

```javascript
// src/components/Dashboard.js
export default function Dashboard({ user, device, onLogout, onBack }) {
  const [metricsData, setMetricsData] = useState(null);
  // ... 50+ more state variables
  
  // No type safety - easy to pass wrong props
  // No autocomplete for props
  // Runtime errors only
}
```

### After (TypeScript):

```typescript
// src/components/Dashboard.tsx
import { User, Device } from '../types';

interface DashboardProps {
  user: User;
  device: Device;
  onLogout: () => void;
  onBack: () => void;
}

export default function Dashboard({ user, device, onLogout, onBack }: DashboardProps) {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  
  // TypeScript catches errors at compile time:
  // - Wrong prop types
  // - Missing required props
  // - Type mismatches
  // - Better autocomplete
}

// src/types/index.ts
export interface User {
  email: string;
  client_id: string;
  auth_type: string;
}

export interface Device {
  client_id: string;
  name: string;
  status: 'online' | 'offline';
  battery?: number;
  // ... other properties
}

export interface MetricsData {
  temperature: number;
  humidity: number;
  pressure: number;
  battery: number;
  timestamp: string;
}
```

---

## Migration Checklist

### Phase 1: Setup
- [ ] Install Vite: `npm install -D vite @vitejs/plugin-react`
- [ ] Create `vite.config.ts`
- [ ] Update `package.json` scripts
- [ ] Move `index.html` to root
- [ ] Test build works

### Phase 2: State Management
- [ ] Install Zustand: `npm install zustand`
- [ ] Create `themeStore.ts` (replace ThemeContext)
- [ ] Create `authStore.ts` (replace App.js state)
- [ ] Update components to use stores
- [ ] Remove old Context providers

### Phase 3: Server State
- [ ] Install React Query: `npm install @tanstack/react-query`
- [ ] Set up QueryClient provider
- [ ] Create `useDeviceData` hook
- [ ] Replace one API call pattern
- [ ] Gradually migrate all API calls

### Phase 4: TypeScript
- [ ] Install TypeScript: `npm install -D typescript @types/react @types/node`
- [ ] Create `tsconfig.json`
- [ ] Rename one `.js` file to `.tsx`
- [ ] Add types gradually
- [ ] Enable strict mode eventually

---

## Quick Start Commands

```bash
# 1. Install Vite
npm install -D vite @vitejs/plugin-react

# 2. Install Zustand
npm install zustand

# 3. Install React Query
npm install @tanstack/react-query

# 4. Install TypeScript (optional but recommended)
npm install -D typescript @types/react @types/react-dom @types/node

# 5. Update package.json scripts:
# "dev": "vite",
# "build": "vite build",
# "preview": "vite preview"
```

---

**Next Steps**: Start with Vite migration (easiest, biggest immediate win), then add Zustand for one store, then React Query for one API call. Gradual migration is the key to success!

