import { QueryClient } from '@tanstack/react-query';

// Create a client with default options optimized for IoT dashboard
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 30 seconds
      staleTime: 30000,
      // Keep unused data in cache for 5 minutes
      gcTime: 300000, // Previously cacheTime
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus (good for IoT dashboards)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (we'll handle this manually)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

