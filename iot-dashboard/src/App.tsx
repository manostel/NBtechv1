import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/auth/components/LoginPage";
import RegisterPage from "./features/auth/components/RegisterPage";
import DevicesPage from "./features/devices/components/DevicesPage";
import Dashboard from "./features/dashboard/components/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import { CustomThemeProvider } from "./context/ThemeContext";
import { useAuthStore } from "./stores/authStore";
import "./App.css";
import ErrorBoundary from './components/common/ErrorBoundary';
import { LoadingProvider } from './context/LoadingContext';
import PageTransition from './components/common/PageTransition';
import { CssBaseline, Box } from '@mui/material';
import BluetoothControl from './features/devices/components/BluetoothControl';

function App(): JSX.Element {
  // Use Zustand auth store instead of useState
  const { user, selectedDevice, login, logout, setSelectedDevice, isSessionValid } = useAuthStore();

  // Check session validity on mount and clear if expired
  useEffect(() => {
    if (user && !isSessionValid()) {
      logout();
    }
  }, [user, isSessionValid, logout]);

  return (
    <LoadingProvider>
      <CustomThemeProvider>
        <CssBaseline />
        <Box className="App">
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Box className="App-content">
              <PageTransition>
                <Routes>
                  <Route path="/" element={user ? <Navigate to="/devices" /> : <LoginPage onLogin={login} />} />
                  <Route path="/register" element={user ? <Navigate to="/devices" /> : <RegisterPage onRegister={login} />} />
                  <Route path="/devices" element={user ? <DevicesPage user={user} onSelectDevice={setSelectedDevice} onLogout={logout} /> : <Navigate to="/" />} />
                  <Route
                    path="/dashboard"
                    element={user && selectedDevice ? (
                      <ErrorBoundary>
                        <Dashboard user={user} device={selectedDevice} onLogout={logout} onBack={() => setSelectedDevice(null)} />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/devices" />
                    )}
                  />
                  <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/" />} />
                  <Route 
                    path="/bluetooth" 
                    element={<BluetoothControl />} 
                  />
                </Routes>
              </PageTransition>
            </Box>
          </Router>
        </Box>
      </CustomThemeProvider>
    </LoadingProvider>
  );
}

export default App;
