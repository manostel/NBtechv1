import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import DevicesPage from "./components/DevicesPage";
import Dashboard from "./components/Dashboard";
import SettingsPage from "./components/SettingsPage"; // if you have one
import { CustomThemeProvider } from "./components/ThemeContext";
import "./App.css";
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingProvider } from './context/LoadingContext';
import PageTransition from './components/PageTransition';
import { CssBaseline, Box } from '@mui/material';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const savedTimestamp = localStorage.getItem('loginTimestamp');
    
    if (savedUser && savedTimestamp) {
      const loginTime = new Date(parseInt(savedTimestamp)).getTime();
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - loginTime;
      
      // Check if 30 minutes have passed
      if (timeDiff < 30 * 60 * 1000) {
        return JSON.parse(savedUser);
      } else {
        // Clear expired session
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
        return null;
      }
    }
    return null;
  });
  
  const [selectedDevice, setSelectedDevice] = useState(() => {
    const savedDevice = localStorage.getItem('selectedDevice');
    return savedDevice ? JSON.parse(savedDevice) : null;
  });

  // Update localStorage when user or selectedDevice changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', new Date().getTime().toString());
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('loginTimestamp');
    }
  }, [user]);

  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem('selectedDevice', JSON.stringify(selectedDevice));
    } else {
      localStorage.removeItem('selectedDevice');
    }
  }, [selectedDevice]);

  const handleLogout = () => {
    setUser(null);
    setSelectedDevice(null);
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('selectedDevice');
  };

  return (
    <LoadingProvider>
      <CustomThemeProvider>
        <CssBaseline />
        <Box className="App">
          <Router>
            <Box className="App-content">
              <PageTransition>
                <Routes>
                  <Route path="/" element={user ? <Navigate to="/devices" /> : <LoginPage onLogin={setUser} />} />
                  <Route path="/register" element={user ? <Navigate to="/devices" /> : <RegisterPage onRegister={setUser} />} />
                  <Route path="/devices" element={user ? <DevicesPage user={user} onSelectDevice={setSelectedDevice} onLogout={handleLogout} /> : <Navigate to="/" />} />
                  <Route
                    path="/dashboard"
                    element={user && selectedDevice ? (
                      <ErrorBoundary>
                        <Dashboard user={user} device={selectedDevice} onLogout={handleLogout} onBack={() => setSelectedDevice(null)} />
                      </ErrorBoundary>
                    ) : (
                      <Navigate to="/devices" />
                    )}
                  />
                  <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/" />} />
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
