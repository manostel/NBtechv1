import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import DevicesPage from "./components/DevicesPage";
import Dashboard from "./components/Dashboard";
import SettingsPage from "./components/SettingsPage"; // if you have one
import { CustomThemeProvider } from "./components/ThemeContext";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const handleLogout = () => {
    setUser(null);
    setSelectedDevice(null);
  };

  return (
    <CustomThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/devices" /> : <LoginPage onLogin={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/devices" /> : <RegisterPage onRegister={setUser} />} />
          <Route path="/devices" element={user ? <DevicesPage user={user} onSelectDevice={setSelectedDevice} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route
            path="/dashboard"
            element={user && selectedDevice ? (
              <Dashboard user={user} device={selectedDevice} onLogout={handleLogout} onBack={() => setSelectedDevice(null)} />
            ) : (
              <Navigate to="/devices" />
            )}
          />
          <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/" />} />
        </Routes>
      </Router>
    </CustomThemeProvider>
  );
}

export default App;
