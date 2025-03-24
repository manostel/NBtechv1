import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  IconButton,
  Grid,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import { FaCog } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import DeviceInfoCard from "./DeviceInfoCard";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import SettingsDrawer from "./SettingsDrawer";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  TimeScale
);

export default function Dashboard({ user, device, onLogout, onBack }) {
  const navigate = useNavigate();
  const theme = useTheme();

  // API & IoT data states
  const [labels, setLabels] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [batteryData, setBatteryData] = useState([]);
  const [signalQualityData, setSignalQualityData] = useState([]);
  const [lastSeen, setLastSeen] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState("Offline");
  const [clientID, setClientID] = useState("Unknown");
  const [deviceName, setDeviceName] = useState("Unknown");
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(false);
  const [restartClicked, setRestartClicked] = useState(false);
  const [speedInput, setSpeedInput] = useState("");

  // Module toggles for commands and charts
  const [showCharts, setShowCharts] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  // Settings drawer state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const API_URL =
    "https://5zmsoqz436.execute-api.eu-central-1.amazonaws.com/default/fetch-data";
  const COMMAND_API_URL =
    "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}?limit=50`);
      const { data } = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const timestamps = data.map((entry) => new Date(entry.timestamp));
        const temperatures = data.map((entry) => parseFloat(entry.temperature));
        const humidities = data.map((entry) => parseFloat(entry.humidity));
        const batteries = data.map((entry) => parseFloat(entry.battery));
        const signals = data.map((entry) =>
          parseFloat(entry.signal_quality)
        );

        setClientID(data[0].ClientID || "Unknown");
        setDeviceName(data[0].device || "Unknown");

        setLabels(timestamps);
        setTemperatureData(temperatures);
        setHumidityData(humidities);
        setBatteryData(batteries);
        setSignalQualityData(signals);

        const lastTimestamp = timestamps[0];
        setLastSeen(lastTimestamp);
        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;
        setDeviceStatus(timeDiff <= 60 ? "Active" : "Inactive");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const sendCommand = async (action, additionalData = {}) => {
    try {
      const payload = { ClientID: clientID, action, ...additionalData };
      const response = await fetch(COMMAND_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log("Command sent:", result);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  const handleToggle1 = () => {
    const newState = !toggle1;
    setToggle1(newState);
    sendCommand(newState ? "TOGGLE_1_ON" : "TOGGLE_1_OFF");
  };

  const handleToggle2 = () => {
    const newState = !toggle2;
    setToggle2(newState);
    sendCommand(newState ? "TOGGLE_2_ON" : "TOGGLE_2_OFF");
  };

  const handleRestart = async () => {
    setRestartClicked(true);
    await sendCommand("RESTART");
    setTimeout(() => setRestartClicked(false), 500);
  };

  const handleSendSpeed = async () => {
    if (speedInput.trim() !== "") {
      await sendCommand("SET_SPEED", { speed: speedInput });
      setSpeedInput("");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { color: theme.palette.text.primary } },
      title: { display: true, text: "Real-time IoT Data", color: theme.palette.text.primary },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "minute", tooltipFormat: "yyyy-MM-dd HH:mm:ss" },
        title: { display: true, text: "Time", color: theme.palette.text.primary },
        ticks: { color: theme.palette.text.primary },
        grid: { color: "rgba(255,255,255,0.3)" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.palette.text.primary },
        grid: { color: "rgba(255,255,255,0.3)" },
      },
    },
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, color: theme.palette.text.primary, minHeight: "100vh", p: 4 }}>
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
      </Helmet>

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Module toggles & indicators row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, px: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => setShowCommands((prev) => !prev)}
            sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}
          >
            {showCommands ? "Hide Commands" : "Show Commands"}
          </Button>
          <Button
            variant="contained"
            onClick={() => setShowCharts((prev) => !prev)}
            sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}
          >
            {showCharts ? "Hide Charts" : "Show Charts"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <BatteryIndicator battery={batteryData.length ? batteryData[0] : 0} />
          <SignalIndicator signal={signalQualityData.length ? signalQualityData[0] : 0} />
        </Box>
      </Box>

      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: theme.palette.background.default, boxShadow: "none", mb: 2 }}>
        <Toolbar sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", px: 2 }}>
          <Button
            variant="contained"
            onClick={onBack}
            sx={{
              position: "absolute",
              left: 16,
              bgcolor: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary.dark },
            }}
          >
            Back to Devices
          </Button>
          <Typography variant="h6" sx={{ fontWeight: "bold", textAlign: "center" }}>
            {clientID}
          </Typography>
          <Box sx={{ position: "absolute", right: 16, display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: theme.palette.primary.main,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h6" sx={{ color: "#fff" }}>
                {user.email[0].toUpperCase()}
              </Typography>
            </Box>
            <Typography variant="body1">{user.email}</Typography>
            <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: theme.palette.text.primary }}>
              <FaCog />
            </IconButton>
            <Button variant="contained" onClick={onLogout} sx={{ bgcolor: theme.palette.secondary.main, "&:hover": { bgcolor: theme.palette.secondary.dark } }}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ maxWidth: "1200px", mx: "auto", pt: 2 }}>
        <DeviceInfoCard
          clientID={clientID}
          device={deviceName}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : "N/A"}
        />
        {showCommands && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: theme.palette.background.paper }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={toggle1}
                    onChange={handleToggle1}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.primary.main },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: theme.palette.primary.main },
                    }}
                  />
                }
                label="Toggle 1"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={toggle2}
                    onChange={handleToggle2}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.primary.main },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: theme.palette.primary.main },
                    }}
                  />
                }
                label="Toggle 2"
              />
              <Button variant="contained" onClick={handleRestart} sx={{ bgcolor: theme.palette.secondary.main, "&:hover": { bgcolor: theme.palette.secondary.dark } }}>
                <MdRefresh size={24} />
              </Button>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Set Speed"
                  value={speedInput}
                  onChange={(e) => setSpeedInput(e.target.value)}
                  sx={{
                    bgcolor: theme.palette.background.default,
                    input: { color: theme.palette.text.primary },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
                  }}
                />
                <Button variant="contained" onClick={handleSendSpeed} sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}>
                  Send
                </Button>
              </Box>
            </Box>
          </Paper>
        )}
        {showCharts && (
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Temperature (°C)",
                        data: temperatureData,
                        borderColor: "red",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        fill: true,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Humidity (%)",
                        data: humidityData,
                        borderColor: "blue",
                        backgroundColor: "rgba(54, 162, 235, 0.2)",
                        fill: true,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Battery Level (%)",
                        data: batteryData,
                        borderColor: "green",
                        backgroundColor: "rgba(75, 192, 75, 0.2)",
                        fill: true,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: "Signal Quality (%)",
                        data: signalQualityData,
                        borderColor: "purple",
                        backgroundColor: "rgba(128, 0, 128, 0.2)",
                        fill: true,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}
