import React, { useState, useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { CustomThemeProvider } from "../src/components/common/ThemeContext";
import "../src/App.css";
import "../src/index.css";
import "../src/components/dashboard/Dashboard.css";
import "react-horizontal-scrolling-menu/dist/styles.css";
// Leaflet CSS will be imported dynamically in components that use it
import ErrorBoundary from '../src/components/common/ErrorBoundary';
import { LoadingProvider } from '../src/context/LoadingContext';
import PageTransition from '../src/components/layout/PageTransition';
import { CssBaseline, Box } from '@mui/material';
import { User, Device } from '../src/types';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Initialize user and device from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      const savedTimestamp = localStorage.getItem('loginTimestamp');
      
      if (savedUser && savedTimestamp) {
        const loginTime = new Date(parseInt(savedTimestamp)).getTime();
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - loginTime;
        
        // Check if 30 minutes have passed
        if (timeDiff < 30 * 60 * 1000) {
          setUser(JSON.parse(savedUser) as User);
        } else {
          // Clear expired session
          localStorage.removeItem('user');
          localStorage.removeItem('loginTimestamp');
        }
      }

      const savedDevice = localStorage.getItem('selectedDevice');
      if (savedDevice) {
        setSelectedDevice(JSON.parse(savedDevice) as Device);
      }
    }
  }, []);

  // Update localStorage when user or selectedDevice changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTimestamp', new Date().getTime().toString());
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
      }
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedDevice) {
        localStorage.setItem('selectedDevice', JSON.stringify(selectedDevice));
      } else {
        localStorage.removeItem('selectedDevice');
      }
    }
  }, [selectedDevice]);

  const handleLogout = (): void => {
    setUser(null);
    setSelectedDevice(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('loginTimestamp');
      localStorage.removeItem('selectedDevice');
    }
    router.push('/');
  };

  const handleSelectDevice = (device: Device): void => {
    setSelectedDevice(device);
  };

  // Pass user and device state to all pages via pageProps
  const enhancedPageProps = {
    ...pageProps,
    user,
    setUser,
    selectedDevice,
    setSelectedDevice,
    handleLogout,
    handleSelectDevice,
  };

  return (
    <LoadingProvider>
      <CustomThemeProvider>
        <CssBaseline />
        <Box className="App">
          <Box className="App-content">
            <PageTransition>
              <ErrorBoundary>
                <Component {...enhancedPageProps} />
              </ErrorBoundary>
            </PageTransition>
          </Box>
        </Box>
      </CustomThemeProvider>
    </LoadingProvider>
  );
}

export default MyApp;

