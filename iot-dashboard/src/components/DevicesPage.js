import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Paper, Typography, Box, useTheme } from "@mui/material";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";

export default function DevicesPage({ user, onSelectDevice }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const [devices, setDevices] = useState([]);

  const API_URL = "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_URL}?limit=50`);
      const { data } = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const deviceMap = {};
        data.forEach((entry) => {
          const key = entry.ClientID;
          const lastTimestamp = new Date(entry.timestamp);
          const now = new Date();
          const timeDiff = (now - lastTimestamp) / 1000;
          const status = timeDiff <= 60 ? "Online" : "Offline";
          if (!deviceMap[key]) {
            deviceMap[key] = { ...entry, status };
          }
        });
        setDevices(Object.values(deviceMap));
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeviceClick = (dev) => {
    onSelectDevice(dev);
    navigate("/dashboard");
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, minHeight: "100vh", p: 2, color: theme.palette.text.primary }}>
      <Typography variant="h3" align="center" sx={{ mb: 3 }}>
        Your Devices
      </Typography>
      <Grid container spacing={3}>
        {devices.map((dev) => (
          <Grid item xs={12} sm={6} md={4} key={dev.ClientID}>
            <Paper
              sx={{
                p: 2,
                bgcolor: theme.palette.background.paper,
                cursor: "pointer",
                transition: "transform 0.2s, background-color 0.2s",
                "&:hover": { transform: "translateY(-5px)", bgcolor: theme.palette.action.hover },
              }}
              onClick={() => handleDeviceClick(dev)}
            >
              <Typography variant="h5" sx={{ mb: 1 }}>
                {dev.ClientID}
              </Typography>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {dev.device}
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                {dev.status === "Online" ? (
                  <FaCheckCircle style={{ color: "#4caf50" }} />
                ) : (
                  <FaTimesCircle style={{ color: "#f44336" }} />
                )}
                {dev.status}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                <BatteryIndicator battery={dev.battery} />
                <SignalIndicator signal={dev.signal_quality} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
