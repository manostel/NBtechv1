import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Line, Bar } from "react-chartjs-2";
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
  Tabs,
  Tab,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
  Alert,
  Snackbar,
} from "@mui/material";
import { 
  FaCog, 
  FaDownload, 
  FaBell, 
  FaHistory,
  FaChartLine,
  FaChartBar,
  FaChartPie
} from "react-icons/fa";
import { MdRefresh, MdSettings } from "react-icons/md";
import { Logout as LogoutIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  ArcElement,
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
  BarElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  TimeScale,
  ArcElement
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
  const [speedInput, setSpeedInput] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [chartType, setChartType] = useState('line');
  const [tabValue, setTabValue] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [chartMenuAnchor, setChartMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [summary, setSummary] = useState({
    avg_temperature: 0,
    avg_humidity: 0,
    min_battery: 0,
    avg_signal: 0,
    data_points: 0
  });

  // Module toggles for commands and charts
  const [showCharts, setShowCharts] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  // Settings drawer state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
  const COMMAND_API_URL = "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!device || !device.device_id) {
      console.log('No device or device_id available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Fetching dashboard data for device:', device);
      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.device_id,
        user_email: user.email,
        time_range: timeRange
      };
      console.log('Request body:', requestBody);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Dashboard data response:', result);
      
      if (!result.data) {
        console.error('No data received from server');
        throw new Error('No data received from server');
      }

      const data = result.data;
      if (Array.isArray(data) && data.length > 0) {
        console.log('Processing data array with length:', data.length);
        const timestamps = data.map((entry) => new Date(entry.timestamp));
        const temperatures = data.map((entry) => parseFloat(entry.temperature));
        const humidities = data.map((entry) => parseFloat(entry.humidity));
        const batteries = data.map((entry) => parseFloat(entry.battery));
        const signals = data.map((entry) => parseFloat(entry.signal_quality));

        setClientID(device.device_id);
        setDeviceName(device.device_name || "Unknown");

        setLabels(timestamps);
        setTemperatureData(temperatures);
        setHumidityData(humidities);
        setBatteryData(batteries);
        setSignalQualityData(signals);

        const lastTimestamp = timestamps[timestamps.length - 1];
        setLastSeen(lastTimestamp);
        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;
        setDeviceStatus(timeDiff <= 60 ? "Active" : "Inactive");

        // Update summary statistics
        if (result.summary) {
          console.log('Updating summary:', result.summary);
          setSummary(result.summary);
        }

        // Check for alerts
        checkAlerts(temperatures[temperatures.length - 1], 
                   humidities[humidities.length - 1], 
                   batteries[batteries.length - 1], 
                   signals[signals.length - 1]);
      } else {
        console.log('No data points found in response');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setDeviceStatus("Error");
      showSnackbar('Error fetching data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAlerts = (temperature, humidity, battery, signal) => {
    const newAlerts = [];
    if (temperature > 30) newAlerts.push('High temperature alert!');
    if (humidity > 80) newAlerts.push('High humidity alert!');
    if (battery < 20) newAlerts.push('Low battery alert!');
    if (signal < 30) newAlerts.push('Poor signal strength alert!');
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev]);
      setShowAlerts(true);
      showSnackbar(newAlerts[0], 'warning');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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
      
      // Add to command history
      setCommandHistory(prev => [{
        timestamp: new Date(),
        action,
        data: additionalData,
        status: 'success'
      }, ...prev]);

      showSnackbar(`Command ${action} sent successfully`, 'success');
    } catch (error) {
      console.error("Error sending command:", error);
      showSnackbar(`Error sending command ${action}`, 'error');
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
    await sendCommand("RESTART");
  };

  const handleSendSpeed = async () => {
    if (speedInput.trim() !== "") {
      await sendCommand("SET_SPEED", { speed: speedInput });
      setSpeedInput("");
    }
  };

  const handleExportData = (format) => {
    const data = {
      timestamps: labels,
      temperature: temperatureData,
      humidity: humidityData,
      battery: batteryData,
      signal: signalQualityData
    };

    let content;
    let filename;
    let type;

    if (format === 'csv') {
      content = 'Timestamp,Temperature,Humidity,Battery,Signal\n';
      labels.forEach((label, i) => {
        content += `${label.toISOString()},${temperatureData[i]},${humidityData[i]},${batteryData[i]},${signalQualityData[i]}\n`;
      });
      filename = 'device_data.csv';
      type = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      filename = 'device_data.json';
      type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add this function to handle manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  // Modify the useEffect to ensure immediate fetch
  useEffect(() => {
    console.log('Dashboard mounted with device:', device);
    if (device && device.device_id) {
      console.log('Fetching initial data...');
      fetchData();
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
    }
  }, [device, timeRange]);

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
        time: { 
          unit: timeRange === '1h' ? 'minute' : timeRange === '24h' ? 'hour' : 'day',
          tooltipFormat: "yyyy-MM-dd HH:mm:ss" 
        },
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

  const renderChart = (data, label, color) => {
    const chartData = {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: `${color}40`,
          fill: true,
        },
      ],
    };

    if (chartType === 'line') {
      return <Line data={chartData} options={chartOptions} />;
    } else if (chartType === 'bar') {
      return <Bar data={chartData} options={chartOptions} />;
    }
    return null;
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, color: theme.palette.text.primary, minHeight: "100vh", p: 4 }}>
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
      </Helmet>

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Header */}
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={onBack}
            sx={{ position: "absolute", left: 16 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: "bold", textAlign: "center" }}>
            {isLoading ? "Loading..." : clientID}
          </Typography>
          <Box sx={{ position: "absolute", right: 16, display: "flex", alignItems: "center", gap: 1 }}>
            {/* Add Refresh Button */}
            <IconButton 
              onClick={handleRefresh}
              disabled={isLoading}
              sx={{ color: theme.palette.text.primary }}
            >
              <MdRefresh />
            </IconButton>
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
            <IconButton
              color="inherit"
              onClick={() => {
                onLogout();
                navigate('/login');
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <DeviceInfoCard
          clientID={clientID}
          device={deviceName}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : "N/A"}
          isLoading={isLoading}
        />

        {/* Tabs for different views */}
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Overview" />
          <Tab label="Commands" />
          <Tab label="History" />
        </Tabs>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <>
            {/* Module toggles & indicators row */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
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
                <Button
                  variant="contained"
                  onClick={() => setTimeRange(prev => prev === '1h' ? '24h' : prev === '24h' ? '7d' : '1h')}
                  sx={{ bgcolor: theme.palette.primary.main, "&:hover": { bgcolor: theme.palette.primary.dark } }}
                >
                  {timeRange === '1h' ? '1 Hour' : timeRange === '24h' ? '24 Hours' : '7 Days'}
                </Button>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <BatteryIndicator value={batteryData.length ? batteryData[batteryData.length - 1] : 0} />
                <SignalIndicator value={signalQualityData.length ? signalQualityData[signalQualityData.length - 1] : 0} />
              </Box>
            </Box>

            {/* Summary Statistics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                  <Typography variant="h6" gutterBottom>Temperature</Typography>
                  <Typography variant="h4">{summary.avg_temperature.toFixed(1)}°C</Typography>
                  <Typography variant="body2" color="textSecondary">Average</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                  <Typography variant="h6" gutterBottom>Humidity</Typography>
                  <Typography variant="h4">{summary.avg_humidity.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="textSecondary">Average</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                  <Typography variant="h6" gutterBottom>Battery</Typography>
                  <Typography variant="h4">{summary.min_battery.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="textSecondary">Minimum</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                  <Typography variant="h6" gutterBottom>Signal</Typography>
                  <Typography variant="h4">{summary.avg_signal.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="textSecondary">Average</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Charts */}
            {showCharts && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                    {renderChart(temperatureData, "Temperature (°C)", "red")}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                    {renderChart(humidityData, "Humidity (%)", "blue")}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                    {renderChart(batteryData, "Battery Level (%)", "green")}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                    {renderChart(signalQualityData, "Signal Quality (%)", "purple")}
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Commands */}
            {showCommands && (
              <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
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
                  <Box sx={{ display: "flex", gap: 1 }}>
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
          </>
        )}

        {/* Commands Tab */}
        {tabValue === 1 && (
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>Command History</Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {commandHistory.map((cmd, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2">{cmd.action}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cmd.timestamp.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: cmd.status === 'success' ? 'success.main' : 'error.main',
                      bgcolor: cmd.status === 'success' ? 'success.light' : 'error.light',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1
                    }}
                  >
                    {cmd.status}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* History Tab */}
        {tabValue === 2 && (
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data History</Typography>
              <Box>
                <Button
                  startIcon={<FaDownload />}
                  onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                >
                  Export
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={() => setExportMenuAnchor(null)}
                >
                  <MenuItem onClick={() => { handleExportData('csv'); setExportMenuAnchor(null); }}>
                    Export as CSV
                  </MenuItem>
                  <MenuItem onClick={() => { handleExportData('json'); setExportMenuAnchor(null); }}>
                    Export as JSON
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
            <Box sx={{ height: 400 }}>
              {renderChart(temperatureData, "Temperature (°C)", "red")}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Alerts */}
      <Snackbar
        open={showAlerts}
        autoHideDuration={6000}
        onClose={() => setShowAlerts(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowAlerts(false)} severity="warning" sx={{ width: '100%' }}>
          {alerts[0]}
        </Alert>
      </Snackbar>

      {/* Command Status Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
