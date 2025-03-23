import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from "react";
import LoginPage from "./components/LoginPage";
import DevicesPage from "./components/DevicesPage";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const handleLogout = () => {
    setUser(null);
    setSelectedDevice(null);
  };

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/devices" /> : <LoginPage onLogin={setUser} />}
          />
          <Route
            path="/devices"
            element={user ? <DevicesPage user={user} onSelectDevice={setSelectedDevice} /> : <Navigate to="/" />}
          />
          <Route
            path="/dashboard"
            element={
              user && selectedDevice ? (
                <Dashboard
                  user={user}
                  device={selectedDevice}
                  onLogout={handleLogout}
                  onBack={() => setSelectedDevice(null)}
                />
              ) : (
                <Navigate to="/devices" />
              )
            }
          />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
