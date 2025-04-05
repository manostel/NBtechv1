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
  CircularProgress,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon,
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Thermostat as ThermostatIcon,
  WaterDrop as WaterDropIcon,
  Battery90 as BatteryIcon,
  SignalCellular4Bar as SignalIcon,
  Refresh as RefreshIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ZoomOut as ZoomOutIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
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
  ArcElement
} from "chart.js";
import zoomPlugin from 'chartjs-plugin-zoom';
import "chartjs-adapter-date-fns";
import DeviceInfoCard from "./DeviceInfoCard";
import BatteryIndicator from "./BatteryIndicator";
import SignalIndicator from "./SignalIndicator";
import SettingsDrawer from "./SettingsDrawer";
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import DashboardSkeleton from './DashboardSkeleton';
import { keyframes } from '@mui/material/styles';

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
  ArcElement,
  zoomPlugin
);

// Update the TIME_RANGES constant
const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '2h', label: '2 Hours' },
  { value: '4h', label: '4 Hours' },
  { value: '8h', label: '8 Hours' },
  { value: '16h', label: '16 Hours' },
  { value: '24h', label: '24 Hours' }
];

// Add this keyframes animation near the top of your file
const pulseAnimation = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
`;

// Remove the static METRICS_CONFIG and replace with a function to generate config
const generateMetricConfig = (key) => {
  // Default configurations for known metrics
  const defaultConfigs = {
    temperature: {
      label: "Temperature",
      unit: "\u00B0C",
      color: "#FF6B6B",
      icon: <ThermostatIcon />,
      alertThresholds: { min: 10, max: 30 },
      summaryKey: 'temperature'
    },
    humidity: {
      label: "Humidity",
      unit: "%",
      color: "#4ECDC4",
      icon: <WaterDropIcon />,
      alertThresholds: { min: 30, max: 70 },
      summaryKey: 'humidity'
    },
    battery: {
      label: "Battery",
      unit: "%",
      color: "#FFD93D",
      icon: <BatteryIcon />,
      alertThresholds: { min: 20 },
      summaryKey: 'battery_level'
    },
    signal: {
      label: "Signal",
      unit: "%",
      color: "#6C5CE7",
      icon: <SignalIcon />,
      alertThresholds: { min: 30 },
      summaryKey: 'signal_quality',
      dataKey: 'signal_quality'
    },
    signal_quality: {
      label: "Signal",
      unit: "%",
      color: "#6C5CE7",
      icon: <SignalIcon />,
      alertThresholds: { min: 30 }
    }
  };

  // If we have a default config, use it
  if (defaultConfigs[key]) {
    return {
      ...defaultConfigs[key],
      dataKey: key
    };
  }

  // For unknown metrics, generate a config
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#9B59B6",
    "#E67E22", "#3498DB", "#2ECC71", "#F1C40F", "#E74C3C"
  ];
  const icons = [
    "speed", "analytics", "assessment", "trending_up", "data_usage",
    "monitoring", "insights", "query_stats", "bar_chart", "line_axis"
  ];

  // Generate a deterministic color and icon based on the key
  const colorIndex = Math.abs(key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const iconIndex = Math.abs(key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % icons.length;

  return {
    label: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    unit: "%", // Default unit, can be updated based on data type
    color: colors[colorIndex],
    icon: icons[iconIndex],
    alertThresholds: { min: 0, max: 100 }, // Default thresholds
    summaryKey: `avg_${key}`,
    dataKey: key
  };
};

// Replace console.log with this function
const log = (message, data) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, data);
  }
};

// Update the get_time_range_and_points function to handle the new time ranges
const get_time_range_and_points = (time_range, target_points=100) => {
  const now = new Date();
  switch(time_range) {
    case 'live':
      return now - new Date(Date.now() - 2 * 60 * 1000), 20;
    case '15m':
      return now - new Date(Date.now() - 15 * 60 * 1000), target_points;
    case '1h':
      return now - new Date(Date.now() - 60 * 60 * 1000), target_points;
    case '2h':
      return now - new Date(Date.now() - 2 * 60 * 60 * 1000), target_points;
    case '4h':
      return now - new Date(Date.now() - 4 * 60 * 60 * 1000), target_points;
    case '8h':
      return now - new Date(Date.now() - 8 * 60 * 60 * 1000), target_points;
    case '16h':
      return now - new Date(Date.now() - 16 * 60 * 60 * 1000), target_points;
    case '24h':
      return now - new Date(Date.now() - 24 * 60 * 60 * 1000), target_points;
    default:
      return now - new Date(Date.now() - 60 * 60 * 1000), target_points;
  }
};

// Update the getTimeRangeLabel function
const getTimeRangeLabel = (range) => {
  switch(range) {
    case 'live': return 'Live';
    case '15m': return '15 Minutes';
    case '1h': return '1 Hour';
    case '2h': return '2 Hours';
    case '4h': return '4 Hours';
    case '8h': return '8 Hours';
    case '16h': return '16 Hours';
    case '24h': return '24 Hours';
    default: return 'Live';
  }
};

// Add these constants at the top of the file
const MAX_RETRIES = 2;  // Maximum number of retries
const RETRY_DELAY = 1500;  // Delay between retries in milliseconds
const INITIAL_CHECK_DELAY = 4500;  // Initial delay before first check

// Add this helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  const [timeRange, setTimeRange] = useState('15m');
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
    data_points: 0,
    original_points: 0,
    interval_seconds: 0
  });

  // Module toggles for commands and charts
  const [showCharts, setShowCharts] = useState(true);
  const [showCommands, setShowCommands] = useState(true);

  // Settings drawer state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Add new state for chart customization
  const [chartConfig, setChartConfig] = useState({
    showGrid: true,
    showPoints: false,
    showLines: true,
    animation: true
  });

  // Add new state for alert thresholds
  const [alertThresholds, setAlertThresholds] = useState({
    temperature: { min: 10, max: 30 },
    humidity: { min: 30, max: 70 },
    battery: { min: 20 },
    signal: { min: 30 }
  });

  // Replace individual state variables with a dynamic state object
  const [metricsData, setMetricsData] = useState({});

  // Add state for dynamic metrics config
  const [metricsConfig, setMetricsConfig] = useState({});

  // Add this state near the other state declarations
  const [summaryType, setSummaryType] = useState('latest'); // 'latest', 'avg', 'min', or 'max'

  // Add new state for showing/hiding battery and signal
  const [showBatterySignal, setShowBatterySignal] = useState(true);

  // Add new state for clientID visibility
  const [showClientId, setShowClientId] = useState(false);

  // Add the new state for time range menu
  const [timeRangeAnchor, setTimeRangeAnchor] = useState(null);

  // Add this near your other state declarations
  const [dataRangeWarning, setDataRangeWarning] = useState(null);

  // Add this near your other state declarations
  const [isInitializing, setIsInitializing] = useState(true);

  // Add this with your other useRefs or useState declarations
  const chartRef = React.useRef(null);

  // Add these states for tracking changes
  const [pendingStateCheck, setPendingStateCheck] = useState(false);
  const [stateCheckTimeout, setStateCheckTimeout] = useState(null);

  // Add this state to track commands in progress
  const [pendingCommands] = useState(new Map());

  // Add this state to track active commands
  const [activeCommands] = useState(new Set());

  // Add this state for debounced fetching
  const [fetchTimeout, setFetchTimeout] = useState(null);

  // Add this state to track pending verifications
  const [pendingVerifications, setPendingVerifications] = useState(new Map());

  // Add this state at the top with other state declarations
  const [isVerifying, setIsVerifying] = useState(false);

  // Add this near your other state declarations
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });

  // Add these new state variables near your other state declarations
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeWindow, setTimeWindow] = useState('8h');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(null);

  // Update the state variables for the enhanced date picker
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(() => {
    const date = new Date();
    date.setHours(23, 59, 59);
    return date;
  });
  const [dateTimeError, setDateTimeError] = useState('');

  // Add this state variable to track previous tab
  const [prevTabValue, setPrevTabValue] = useState(0);

  const API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
  const COMMAND_API_URL = "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  const [isLoading, setIsLoading] = useState(true);

  // Add this state for device state
  const [deviceState, setDeviceState] = useState({
    led1_state: 0,
    led2_state: 0,
    motor_speed: 0,
    timestamp: null
  });

  // Add the sendCommand function inside the Dashboard component
  const sendCommand = async (command, params = {}) => {
    try {
      if (!device || !device.client_id) {
        throw new Error('No device or client_id available');
      }

      const payload = {
        body: JSON.stringify({
          client_id: device.client_id,
          command: command,
          ...params
        }),
        httpMethod: "POST"
      };

      console.log('Sending command:', command, params);

      const response = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send command');
      }

      const data = await response.json();
      console.log('Command response:', data);
      return data;
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  };

  // Add the sendCommandWithRetry function inside the Dashboard component
  const sendCommandWithRetry = async (command, params = {}) => {
    try {
      // First attempt
      await sendCommand(command, params);
      
      // Wait 500ms before second attempt
      await delay(500);
      
      // Second attempt
      await sendCommand(command, params);
      
      return true;
    } catch (error) {
      console.error('Error in sendCommandWithRetry:', error);
      throw error;
    }
  };

  const fetchDeviceState = async () => {
    try {
      if (!device || !device.client_id) {
        console.error('No device or client_id available');
        return null;
      }

      const payload = {
        body: JSON.stringify({ client_id: device.client_id }),
        httpMethod: "POST"
      };

      console.log('Fetching device state...');

      const response = await fetch('https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch device state');
      }

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);

      console.log('Received device state:', parsedBody);

      // Ensure we always store the state in a consistent format
      const stateToStore = parsedBody.state || parsedBody;
      setDeviceState(stateToStore);

      // Update UI states using the state object
      if (stateToStore.led1_state !== undefined) {
        setToggle1(stateToStore.led1_state === 1);
      }
      if (stateToStore.led2_state !== undefined) {
        setToggle2(stateToStore.led2_state === 1);
      }
      if (stateToStore.timestamp) {
        setLastSeen(new Date(stateToStore.timestamp));
      }

      setPendingStateCheck(false);
      
      // Return the state for verification
      return stateToStore;

    } catch (error) {
      console.error('Error fetching device state:', error);
      showSnackbar('Failed to fetch device state', 'error');
      setPendingStateCheck(false);
      return null;
    }
  };

  // Function to update command buttons based on state
  const updateCommandButtons = (state) => {
    // Update LED1 button
    const led1Button = document.getElementById('led1-button');
    if (led1Button) {
      led1Button.textContent = state.led1_state ? 'Turn LED1 OFF' : 'Turn LED1 ON';
    }

    // Update LED2 button
    const led2Button = document.getElementById('led2-button');
    if (led2Button) {
      led2Button.textContent = state.led2_state ? 'Turn LED2 OFF' : 'Turn LED2 ON';
    }

    // Update speed display
    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) {
      speedDisplay.textContent = `Current Speed: ${state.motor_speed}`;
    }
  };

  // Remove the polling useEffect and replace with this new one
  useEffect(() => {
    // Cleanup function for timeouts
    return () => {
      if (stateCheckTimeout) {
        clearTimeout(stateCheckTimeout);
      }
    };
  }, []);

  const fetchData = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching dashboard data for device:', device);
      
      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.client_id,
        user_email: user.email,
        time_range: timeRange,
        points: timeRange === 'live' ? 20 : 
               timeRange === '15m' ? 15 : 
               100
      };

      // Adjust timeout for live data to match new publication rate
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 
        timeRange === 'live' ? 5000 : 8000  // Reduced timeout for live data to 5 seconds
      );

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error('No data received from server');
      }

      const data = result.data;
      console.log('Received data:', data);

      // Check data time range
      const firstTimestamp = new Date(data[0].timestamp);
      const lastTimestamp = new Date(data[data.length - 1].timestamp);
      const dataRangeHours = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60);

      // Show more informative warning
      if (timeRange === '30d' || timeRange === '7d') {
        const requestedDays = timeRange === '30d' ? 30 : 7;
        const startDate = firstTimestamp.toLocaleDateString();
        const endDate = lastTimestamp.toLocaleDateString();
        
        setDataRangeWarning(
          `Limited historical data available: Showing data from ${startDate} to ${endDate}. ` +
          `Expected ${requestedDays} days but received ${Math.round(dataRangeHours)} hours of data. ` +
          `Data points: ${summary.data_points} (aggregated from ${summary.original_points} readings)`
        );
        
        showMobileToast(`Limited historical data: ${Math.round(dataRangeHours)} hours available`).then(shown => {
          if (!shown) {
        showSnackbar(`Limited historical data: ${Math.round(dataRangeHours)} hours available`, 'warning');
          }
        });
      } else {
        setDataRangeWarning(null);
      }

      if (Array.isArray(data) && data.length > 0) {
        const timestamps = data.map((entry) => new Date(entry.timestamp));
        setLabels(timestamps);

        // Process data in the background
        const firstDataPoint = data[0];
        const newMetricsConfig = {};
        Object.keys(firstDataPoint).forEach(key => {
          // Exclude client_id from metrics configuration
          if (key !== 'timestamp' && key !== 'client_id') {
            newMetricsConfig[key] = generateMetricConfig(key);
          }
        });
        setMetricsConfig(newMetricsConfig);

        const newMetricsData = {};
        Object.keys(newMetricsConfig).forEach(key => {
          newMetricsData[key] = data.map(entry => parseFloat(entry[key]));
        });
        setMetricsData(newMetricsData);

        // Update basic info
        setClientID(device.client_id);
        setDeviceName(device.device_name || "Unknown");

        // Update last seen with the most recent timestamp
        const lastTimestamp = new Date(data[data.length - 1].timestamp);
        setLastSeen(lastTimestamp);
        
        // Calculate time difference in seconds between now and last timestamp
        const timeDiffSeconds = (new Date() - lastTimestamp) / 1000;
        
        // Device is active if last seen within 2 minutes
        setDeviceStatus(timeDiffSeconds <= 120 ? "Active" : "Inactive");

        // Calculate summary statistics
        const calculatedSummary = {};
        Object.keys(newMetricsConfig).forEach(key => {
          const values = newMetricsData[key].filter(v => !isNaN(v));
          if (values.length > 0) {
            calculatedSummary[`avg_${key}`] = values.reduce((a, b) => a + b, 0) / values.length;
            calculatedSummary[`min_${key}`] = Math.min(...values);
            calculatedSummary[`max_${key}`] = Math.max(...values);
          }
        });

        // Merge summaries
        const finalSummary = result.summary || {};
        const mergedSummary = {
          ...calculatedSummary,
          ...finalSummary
        };
        setSummary(mergedSummary);

        // Check alerts
        Object.keys(newMetricsConfig).forEach(key => {
          const value = newMetricsData[key][newMetricsData[key].length - 1];
          const config = newMetricsConfig[key];
          checkMetricAlert(key, value, config.alertThresholds);
        });

        // Make sure we pick up the latest timestamp from the summary if available
        if (result.summary && result.summary.latest && result.summary.latest.timestamp) {
          const latestTimestamp = new Date(result.summary.latest.timestamp);
          setLastSeen(latestTimestamp);
          
          // Update status based on latest timestamp
          const timeDiffSeconds = (new Date() - latestTimestamp) / 1000;
          setDeviceStatus(timeDiffSeconds <= 120 ? "Active" : "Inactive");
        }
      }

      // After successful data fetch, if this is the first load, fetch device status
      if (isInitializing) {
        console.log('Initial load - fetching device status');
        await fetchDeviceState();
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDeviceStatus("Error");
      
      if (error.name === 'AbortError') {
        if (timeRange === 'live') {
          console.log('Live data fetch timeout - will retry on next interval');
        } else {
          showMobileToast('Request timeout - try a shorter time range').then(shown => {
            if (!shown) {
          showSnackbar('Request timeout - try a shorter time range', 'error');
            }
          });
        }
      } else {
        showMobileToast('Error fetching data. Please try again.').then(shown => {
          if (!shown) {
        showSnackbar('Error fetching data. Please try again.', 'error');
      }
        });
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  // Modify the checkAlerts function to handle dynamic metrics
  const checkMetricAlert = (metric, value, thresholds) => {
    const newAlerts = [];
    if (thresholds.max && value > thresholds.max) {
      newAlerts.push(`High ${metricsConfig[metric]?.label || metric} alert!`);
    }
    if (thresholds.min && value < thresholds.min) {
      newAlerts.push(`Low ${metricsConfig[metric]?.label || metric} alert!`);
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev]);
      setShowAlerts(true);
      showMobileToast(newAlerts[0]).then(shown => {
        if (!shown) {
      showSnackbar(newAlerts[0], 'warning');
        }
      });
    }
  };

  // Replace traditional snackbar with native toast for better mobile experience
  const showMobileToast = async (message, severity = 'info') => {
    setSnackbar({ 
      open: true, 
      message, 
      severity 
    });
    return true;
  };

  // Update the showSnackbar function
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Update the verifyCommandSuccess function
  const verifyCommandSuccess = (command, params, deviceState) => {
    console.log('Verifying command:', command);
    console.log('Device state:', deviceState);
    
    if (!deviceState) {
      console.log('No device state available for verification');
      return false;
    }

    // Ensure we have the correct state object
    const state = deviceState.state || deviceState;
    console.log('Parsed state:', state);

    switch (command) {
      case 'TOGGLE_1_ON':
        return state.led1_state === 1;
      case 'TOGGLE_1_OFF':
        return state.led1_state === 0;
      case 'TOGGLE_2_ON':
        return state.led2_state === 1;
      case 'TOGGLE_2_OFF':
        return state.led2_state === 0;
      case 'SET_SPEED':
        const targetSpeed = Number(params.speed);
        const currentSpeed = Number(state.motor_speed);
        return currentSpeed === targetSpeed;
      case 'RESTART':
        return true; // Consider restart always successful if we get a state
      default:
        return false;
    }
  };

  // Update the command handlers to include feedback
  const handleToggle1 = async () => {
    if (isVerifying) {
      console.log('Verification in progress, skipping new command');
      return;
    }

    const newState = !toggle1;
    const command = newState ? "TOGGLE_1_ON" : "TOGGLE_1_OFF";
    const commandId = `${command}_${Date.now()}`;
    
    if (activeCommands.has(commandId)) {
      return;
    }
    
    activeCommands.add(commandId);
    setToggle1(newState);
    setIsVerifying(true);
    
    setCommandFeedback({
      show: true,
      message: `Sending ${command} command...`,
      loading: true
    });

    const commandEntry = {
      id: commandId,
      timestamp: new Date(),
      action: command,
      status: 'pending'
    };

    setCommandHistory(prev => [commandEntry, ...prev]);

    try {
      // Send command twice with delay
      await sendCommandWithRetry(command);
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });
      
      setTimeout(async () => {
        try {
          const finalState = await fetchDeviceState();
          const success = verifyCommandSuccess(command, {}, finalState);
          
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { 
                ...cmd, 
                status: success ? 'success' : 'failed'
              };
            }
            return cmd;
          }));

          setCommandFeedback({
            show: true,
            message: success ? 'Command confirmed!' : 'Command failed to verify',
            loading: false
          });

          setTimeout(async () => {
            await fetchDeviceState();
            setCommandFeedback({ show: false, message: '', loading: false });
          }, 1000);

        } catch (error) {
          console.error('Verification error:', error);
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { ...cmd, status: 'failed' };
            }
            return cmd;
          }));
          
          setCommandFeedback({
            show: true,
            message: 'Failed to verify command',
            loading: false
          });
        } finally {
          setIsVerifying(false);
          activeCommands.delete(commandId);
        }
      }, 4500);
      
    } catch (error) {
      console.error('Error in handleToggle1:', error);
      setCommandHistory(prev => prev.map(cmd => {
        if (cmd.id === commandId) {
          return { ...cmd, status: 'failed' };
        }
        return cmd;
      }));
      setIsVerifying(false);
      activeCommands.delete(commandId);
      
      setCommandFeedback({
        show: true,
        message: 'Failed to send command',
        loading: false
      });
    }
  };

  // Update handleToggle2 similarly
  const handleToggle2 = async () => {
    if (isVerifying) {
      console.log('Verification in progress, skipping new command');
      return;
    }

    const newState = !toggle2;
    const command = newState ? "TOGGLE_2_ON" : "TOGGLE_2_OFF";
    const commandId = `${command}_${Date.now()}`;
    
    if (activeCommands.has(commandId)) {
      return;
    }
    
    activeCommands.add(commandId);
    setToggle2(newState);
    setIsVerifying(true);
    
    setCommandFeedback({
      show: true,
      message: `Sending ${command} command...`,
      loading: true
    });

    const commandEntry = {
      id: commandId,
      timestamp: new Date(),
      action: command,
      status: 'pending'
    };

    setCommandHistory(prev => [commandEntry, ...prev]);

    try {
      // Send command twice with delay
      await sendCommandWithRetry(command);
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });
      
      setTimeout(async () => {
        try {
          const finalState = await fetchDeviceState();
          const success = verifyCommandSuccess(command, {}, finalState);
          
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { 
                ...cmd, 
                status: success ? 'success' : 'failed'
              };
            }
            return cmd;
          }));

          setCommandFeedback({
            show: true,
            message: success ? 'Command confirmed!' : 'Command failed to verify',
            loading: false
          });

          setTimeout(async () => {
            await fetchDeviceState();
            setCommandFeedback({ show: false, message: '', loading: false });
          }, 1000);

        } catch (error) {
          console.error('Verification error:', error);
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { ...cmd, status: 'failed' };
            }
            return cmd;
          }));
          
          setCommandFeedback({
            show: true,
            message: 'Failed to verify command',
            loading: false
          });
        } finally {
          setIsVerifying(false);
          activeCommands.delete(commandId);
        }
      }, 4500);
      
    } catch (error) {
      console.error('Error in handleToggle2:', error);
      setCommandHistory(prev => prev.map(cmd => {
        if (cmd.id === commandId) {
          return { ...cmd, status: 'failed' };
        }
        return cmd;
      }));
      setIsVerifying(false);
      activeCommands.delete(commandId);
      
      setCommandFeedback({
        show: true,
        message: 'Failed to send command',
        loading: false
      });
    }
  };

  // Update handleSendSpeed similarly
  const handleSendSpeed = async () => {
    if (isVerifying) {
      console.log('Verification in progress, skipping new command');
      return;
    }

    if (speedInput.trim() === "") return;
    
    const speed = parseInt(speedInput);
    if (isNaN(speed) || speed < 0 || speed > 100) {
      showSnackbar('Speed must be a number between 0 and 100', 'error');
      return;
    }

    const commandId = `SET_SPEED_${speed}_${Date.now()}`;
    
    if (activeCommands.has(commandId)) {
      return;
    }
    
    activeCommands.add(commandId);
    setIsVerifying(true);
    
    setCommandFeedback({
      show: true,
      message: `Sending speed command (${speed}%)...`,
      loading: true
    });

    const commandEntry = {
      id: commandId,
      timestamp: new Date(),
      action: "SET_SPEED",
      data: { speed },
      status: 'pending'
    };

    setCommandHistory(prev => [commandEntry, ...prev]);

    try {
      // Send command twice with delay
      await sendCommandWithRetry("SET_SPEED", { speed });
      setSpeedInput("");
      
      setCommandFeedback({
        show: true,
        message: 'Waiting for device confirmation...',
        loading: true
      });
      
      setTimeout(async () => {
        try {
          const finalState = await fetchDeviceState();
          const success = verifyCommandSuccess("SET_SPEED", { speed }, finalState);
          
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { 
                ...cmd, 
                status: success ? 'success' : 'failed'
              };
            }
            return cmd;
          }));

          setCommandFeedback({
            show: true,
            message: success ? 'Speed command confirmed!' : 'Speed command failed to verify',
            loading: false
          });

          setTimeout(async () => {
            await fetchDeviceState();
            setCommandFeedback({ show: false, message: '', loading: false });
          }, 1000);

        } catch (error) {
          console.error('Verification error:', error);
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return { ...cmd, status: 'failed' };
            }
            return cmd;
          }));
          
          setCommandFeedback({
            show: true,
            message: 'Failed to verify speed command',
            loading: false
          });
        } finally {
          setIsVerifying(false);
          activeCommands.delete(commandId);
        }
      }, 4500);
      
    } catch (error) {
      console.error('Error in handleSendSpeed:', error);
      setCommandHistory(prev => prev.map(cmd => {
        if (cmd.id === commandId) {
          return { ...cmd, status: 'failed' };
        }
        return cmd;
      }));
      setIsVerifying(false);
      activeCommands.delete(commandId);
      
      setCommandFeedback({
        show: true,
        message: 'Failed to send speed command',
        loading: false
      });
    }
  };

  const handleRestart = async () => {
    const commandId = `RESTART_${Date.now()}`;
    const commandEntry = {
      id: commandId,
      timestamp: new Date(),
      action: "RESTART",
      status: 'pending'
    };

    setCommandHistory(prev => [commandEntry, ...prev]);

    try {
      // Send restart command twice with delay
      await sendCommandWithRetry("RESTART");
      
      const timeout1 = setTimeout(async () => {
        await fetchDeviceState();
        
        const timeout2 = setTimeout(async () => {
          await fetchDeviceState();
          
          setCommandHistory(prev => prev.map(cmd => {
            if (cmd.id === commandId) {
              return {
                ...cmd,
                status: verifyCommandSuccess("RESTART", {}, deviceState) ? 'success' : 'failed'
              };
            }
            return cmd;
          }));
          activeCommands.delete(commandId);
        }, 2000);
        
        setStateCheckTimeout(timeout2);
      }, 2000);
      
      setStateCheckTimeout(timeout1);
      
    } catch (error) {
      setCommandHistory(prev => prev.map(cmd => {
        if (cmd.id === commandId) {
          return { ...cmd, status: 'failed' };
        }
        return cmd;
      }));
      activeCommands.delete(commandId);
    }
  };

  // Add this new function to handle the delayed state checks
  const scheduleStateChecks = () => {
    // Clear any existing timeouts
    if (stateCheckTimeout) {
      clearTimeout(stateCheckTimeout);
    }

    // First check after 2 seconds
    const timeout1 = setTimeout(() => {
      fetchDeviceState();
      
      // Second check after another 2 seconds
      const timeout2 = setTimeout(() => {
        fetchDeviceState();
        setStateCheckTimeout(null);
      }, 2000);
      
      setStateCheckTimeout(timeout2);
    }, 2000);

    setStateCheckTimeout(timeout1);
    setPendingStateCheck(true);
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

  // Modify the refresh handler to not set loading state
  const handleRefresh = () => {
    fetchData();
  };

  // Replace haptic feedback with MUI visual feedback
  const handleRefreshWithHaptics = () => {
    // Visual feedback using MUI ripple effect is automatic in Button component
    handleRefresh();
  };

  // Update the useEffect for initial load
  useEffect(() => {
    log('Dashboard mounted with device:', device);
    if (device && device.client_id) {
      // Only fetch data when component first mounts or if we're on the Overview tab
      if (isInitializing || (tabValue === 0 && prevTabValue === 0)) {
      log('Fetching initial data...');
        fetchData();
      }
      
      // Set up intervals for data fetching, but only activate them on the Overview tab
      const liveInterval = setInterval(() => {
        if (timeRange === 'live' && tabValue === 0) {
          fetchData();
        }
      }, 10000);
      
      const historicalInterval = setInterval(() => {
        if (timeRange !== 'live' && tabValue === 0) {
          fetchData();
        }
      }, 60000);

      return () => {
        clearInterval(liveInterval);
        clearInterval(historicalInterval);
      };
    }
  }, [device, timeRange, tabValue]);

  // Add this effect to track tab changes
  useEffect(() => {
    setPrevTabValue(tabValue);
  }, [tabValue]);

  // Modify the time range menu handler to check the current tab
  const handleTimeRangeChange = (newRange) => {
    // Only update time range and fetch data if we're on Overview tab
    setTimeRange(newRange);
    setTimeRangeAnchor(null);
    
    // Only fetch data if we're on the Overview tab
    if (tabValue === 0) {
      fetchData();
    }
  };

  // Update the renderTimeRangeMenu function
  const renderTimeRangeMenu = () => (
    <Box sx={{ 
      display: 'flex', 
      gap: 1, 
      alignItems: 'center',
      flexWrap: 'wrap',
      mb: 1
    }}>
      {/* Refresh Button */}
      <Button
        size="small"
        variant="outlined"
        onClick={handleRefresh}
        startIcon={<RefreshIcon />}
        sx={{ 
          minWidth: 'auto',
          px: 1.5,  // Reduced padding
          height: 28,  // Smaller height
          borderRadius: 1,
          fontSize: '0.75rem',  // Smaller font
          textTransform: 'none',
          '& .MuiButton-startIcon': {
            mr: 0.5,
            '& svg': {
              fontSize: '1rem'  // Smaller icon
            }
          }
        }}
      >
        Refresh
      </Button>

      {/* Time Range Button */}
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setTimeRangeAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        sx={{ 
          minWidth: 'auto',
          px: 1.5,
          height: 28,
          borderRadius: 1,
          fontSize: '0.75rem',
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '& .MuiButton-endIcon': {
            ml: 0.5,
            '& svg': {
              fontSize: '1.2rem'
            }
          }
        }}
      >
        {timeRange === 'live' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Live
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'error.main',
                animation: `${pulseAnimation} 2s ease-in-out infinite`
              }}
            />
          </Box>
        ) : (
          getTimeRangeLabel(timeRange)
        )}
      </Button>

      {/* Reset Zoom Button */}
      <Button
        size="small"
        variant="outlined"
        onClick={handleResetZoom}
        startIcon={<ZoomOutIcon />}
        sx={{ 
          minWidth: 'auto',
          px: 1.5,
          height: 28,
          borderRadius: 1,
          fontSize: '0.75rem',
          textTransform: 'none',
          '& .MuiButton-startIcon': {
            mr: 0.5,
            '& svg': {
              fontSize: '1rem'
            }
          }
        }}
      >
        Reset
      </Button>

      {/* Chart Options Button */}
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setChartMenuAnchor(e.currentTarget)}
        startIcon={<ShowChartIcon />}
        sx={{ 
          minWidth: 'auto',
          px: 1.5,
          height: 28,
          borderRadius: 1,
          fontSize: '0.75rem',
          textTransform: 'none',
          '& .MuiButton-startIcon': {
            mr: 0.5,
            '& svg': {
              fontSize: '1rem'
            }
          }
        }}
      >
        Options
      </Button>

      {/* Summary Type Button */}
      <Button
        size="small"
        variant="outlined"
        onClick={cycleSummaryType}
        sx={{ 
          minWidth: 'auto',
          px: 1.5,
          height: 28,
          borderRadius: 1,
          fontSize: '0.75rem',
          textTransform: 'capitalize'
        }}
      >
        {summaryType === 'latest' ? 'Latest' :
         summaryType === 'avg' ? 'Average' :
         summaryType === 'min' ? 'Minimum' :
         'Maximum'}
      </Button>
    </Box>
  );

  // Update the handleResetZoom function to use ChartJS instead of Chart
  const handleResetZoom = () => {
    try {
      // Try different approaches to find and reset charts
      if (chartRef.current) {
        // For Chart.js v3+
        if (chartRef.current.chartInstance && typeof chartRef.current.chartInstance.resetZoom === 'function') {
          chartRef.current.chartInstance.resetZoom();
        } 
        // For legacy Chart.js
        else if (chartRef.current.chart && typeof chartRef.current.chart.resetZoom === 'function') {
          chartRef.current.chart.resetZoom();
        }
        // Direct access to chart
        else if (typeof chartRef.current.resetZoom === 'function') {
          chartRef.current.resetZoom();
        }
      } else {
        // Fallback to finding all charts in the document
        document.querySelectorAll('canvas').forEach(canvas => {
          const chartInstance = ChartJS.getChart(canvas);
          if (chartInstance && typeof chartInstance.resetZoom === 'function') {
            chartInstance.resetZoom();
          }
        });
      }
      
      showSnackbar('Chart zoom reset', 'info');
    } catch (error) {
      console.error('Error resetting zoom:', error);
      showSnackbar('Could not reset zoom', 'error');
    }
  };

  // Update the chart options for better mobile viewing
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top", 
        labels: { 
          color: theme.palette.text.primary,
          boxWidth: window.innerWidth < 600 ? 10 : 40,
          padding: window.innerWidth < 600 ? 8 : 10,
          font: {
            size: window.innerWidth < 600 ? 10 : 12
          }
        },
        display: true
      },
      title: { 
        display: true, 
        text: "Real-time IoT Data", 
        color: theme.palette.text.primary,
        font: {
          size: window.innerWidth < 600 ? 14 : 16,
          weight: 'bold'
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: true,
        callbacks: {
          label: function(context) {
            setTimeout(() => {
              const tooltipEl = document.querySelector('.chartjs-tooltip');
              if (tooltipEl) {
                  tooltipEl.style.opacity = '0';
              }
            }, 1500);
            
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          }
        },
        animation: {
          duration: 150
        },
        position: 'nearest',
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 11
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          overScaleMode: 'y'
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
          overScaleMode: 'y'
        },
        limits: {
          y: {min: 'original', max: 'original'}
        }
      }
    },
    scales: {
      x: {
        type: "time",
        time: { 
          unit: timeRange === 'live' ? 'second' :
                timeRange === '15m' ? 'minute' :
                timeRange === '1h' ? 'minute' :
                timeRange === '24h' || timeRange === '2d' || timeRange === '3d' || selectedTimeWindow === '24h' || selectedTimeWindow === '2d' || selectedTimeWindow === '3d' ? 'hour' : 'minute',
          tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                        (timeRange === '24h' || timeRange === '2d' || timeRange === '3d' || selectedTimeWindow === '24h' || selectedTimeWindow === '2d' || selectedTimeWindow === '3d') ? "MMM dd, HH:mm" : "HH:mm",
          displayFormats: {
            second: 'HH:mm:ss',
            minute: 'HH:mm',
            hour: 'MMM dd, HH:mm',
            day: 'MMM dd'
          },
          // Add specific min/max for time ranges
          min: function() {
            const now = new Date();
            switch(timeRange) {
              case 'live':
                return new Date(now - 2 * 60 * 1000); // 2 minutes
              case '15m':
                return new Date(now - 15 * 60 * 1000); // 15 minutes
              case '1h':
                return new Date(now - 60 * 60 * 1000); // 1 hour
              case '2h':
                return new Date(now - 2 * 60 * 60 * 1000); // 2 hours
              case '4h':
                return new Date(now - 4 * 60 * 60 * 1000); // 4 hours
              case '8h':
                return new Date(now - 8 * 60 * 60 * 1000); // 8 hours
              case '16h':
                return new Date(now - 16 * 60 * 60 * 1000); // 16 hours
              case '24h':
                return new Date(now - 24 * 60 * 60 * 1000); // 24 hours
              default:
                return undefined;
            }
          }(),
          max: new Date(), // Current time
          bounds: 'data'
        },
        title: { 
          display: true, 
          text: "Time", 
          color: theme.palette.text.primary,
          font: { weight: 'bold' }
        },
        ticks: {
          maxRotation: window.innerWidth < 600 ? 60 : 45,
          minRotation: window.innerWidth < 600 ? 60 : 45,
          source: 'data',
          autoSkip: true,
          maxTicksLimit: timeRange === '15m' ? 15 : // Show all 15 minutes
                        timeRange === 'live' ? 4 : 10, // Adjust other ranges accordingly
          font: {
            size: window.innerWidth < 600 ? 8 : 10
          }
        },
        grid: {
          display: chartConfig.showGrid
        }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: theme.palette.text.primary,
          font: {
            size: window.innerWidth < 600 ? 8 : 10
          },
          maxTicksLimit: window.innerWidth < 600 ? 5 : 10
        },
        grid: { 
          color: chartConfig.showGrid ? "rgba(255,255,255,0.1)" : "transparent",
          drawBorder: false
        },
      },
    },
    elements: {
      point: {
        radius: chartConfig.showPoints ? 3 : 0,
        hoverRadius: 6
      },
      line: {
        tension: 0.4
      }
    },
    animation: {
      duration: 750,
      animations: {
        y: {
          from: (ctx) => {
            // Only animate the last point
            if (ctx.type === 'data' && ctx.dataIndex === ctx.dataset.data.length - 1) {
              return ctx.chart.scales.y.getPixelForValue(0);
            }
            return ctx.chart.scales.y.getPixelForValue(ctx.dataset.data[ctx.dataIndex]);
          },
          duration: 1000
        }
      }
    },
    transitions: {
      active: {
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    }
  };

  // Update the renderChart function to handle animations for the last point
  const renderChart = (data, metricKey) => {
    const config = metricsConfig[metricKey];
    if (!config) return null;

    const chartData = {
      labels,
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data,
          borderColor: config.color,
          backgroundColor: `${config.color}40`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: chartConfig.showPoints ? 3 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: config.color,
          pointBorderColor: config.color,
          pointBorderWidth: 2
        }
      ]
    };

    const chartSpecificOptions = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        title: {
          ...chartOptions.plugins.title,
          text: config.label
        }
      },
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          ticks: {
            ...chartOptions.scales.y.ticks,
            callback: function(value) {
              return value + config.unit;
            }
          }
        }
      }
    };

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          height: 400,
          position: 'relative'
        }}
      >
        <Box sx={{ 
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          gap: 1
        }}>
          {/* Optional: Add any chart-specific controls here */}
        </Box>
        
        {chartType === 'line' ? (
          <Line 
            data={chartData} 
            options={chartSpecificOptions} 
            ref={chartEl => {
              if (chartEl) {
                chartRef.current = chartEl;
              }
            }} 
          />
        ) : (
          <Bar 
            data={chartData} 
            options={chartSpecificOptions} 
            ref={chartEl => {
              if (chartEl) {
                chartRef.current = chartEl;
              }
            }} 
          />
        )}
      </Paper>
    );
  };

  // Modify the cycleSummaryType function
  const cycleSummaryType = () => {
    setSummaryType(prev => {
      switch(prev) {
        case 'latest': return 'avg';
        case 'avg': return 'min';
        case 'min': return 'max';
        case 'max': return 'latest';
        default: return 'latest';
      }
    });
  };

  // Update the renderSummaryCards function for better mobile display
  const renderSummaryCards = () => {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}> {/* Reduced spacing on mobile */}
        {Object.entries(metricsConfig).map(([key, config]) => {
          // Skip client_id
          if (key === 'client_id' || key === 'ClientID') return null;
          
          // Skip signal and battery metrics unless showBatterySignal is true
          if ((key === 'signal' || key === 'battery' || key === 'signal_quality') && !showBatterySignal) return null;

          // Get the appropriate value based on summaryType
          let value;
          if (summaryType === 'latest') {
            // Get the last value from the metrics data
            value = metricsData[key]?.[metricsData[key].length - 1];
          } else {
            value = summary[`${summaryType}_${key}`] || summary[key];
          }

          console.log(`Metric ${key}:`, {
            value,
            summaryKey: summaryType === 'latest' ? 'latest' : `${summaryType}_${key}`,
            rawValue: summary[key]
          });
          
          const displayValue = value !== undefined && !isNaN(value) ? value.toFixed(1) : 'N/A';
          
          return (
            <Grid item xs={6} sm={6} md={3} key={key}> {/* xs:6 to show 2 cards per row on phones */}
              <Paper 
                elevation={1}  // Lower elevation for better mobile performance
                sx={{ 
                  p: { xs: 1.5, sm: 2 }, // Less padding on mobile
                  bgcolor: theme.palette.background.paper,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {config.icon}
                  <Typography variant="subtitle1" color="primary"> {/* Smaller heading on mobile */}
                    {config.label}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ mb: 1 }}> {/* h5 instead of h4 on mobile */}
                  {displayValue}{value !== undefined && !isNaN(value) ? config.unit : ''}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summaryType === 'latest' ? 'Latest' :
                   summaryType === 'avg' ? 'Average' :
                   summaryType === 'min' ? 'Minimum' :
                   'Maximum'}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: value !== undefined && !isNaN(value) ? (
                        config.alertThresholds.max && value > config.alertThresholds.max ? 'error.main' :
                        config.alertThresholds.min && value < config.alertThresholds.min ? 'warning.main' :
                        'success.main'
                      ) : 'grey.500'
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {value !== undefined && !isNaN(value) ? (
                      config.alertThresholds.max && value > config.alertThresholds.max ? 'High' :
                      config.alertThresholds.min && value < config.alertThresholds.min ? 'Low' :
                      'Normal'
                    ) : 'No Data'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  // Update the renderCharts function to exclude client_id
  const renderCharts = () => (
    <Grid container spacing={3}>
      {Object.entries(metricsConfig).map(([key, config]) => {
        // Skip client_id
        if (key === 'client_id' || key === 'ClientID') return null;
        
        // Skip signal and battery metrics unless showBatterySignal is true
        if ((key === 'signal' || key === 'battery' || key === 'signal_quality') && !showBatterySignal) return null;
        
        return (
          <Grid item xs={12} md={6} key={key}>
            <Paper 
              sx={{ 
                p: 2, 
                bgcolor: theme.palette.background.paper,
                height: 400,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            >
              {renderChart(metricsData[key], key)}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );

  // Add mobile-specific initialization
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Set status bar style
      StatusBar.setBackgroundColor({ color: '#000000' });
      
      // Handle back button
      App.addListener('backButton', (data) => {
        if (onBack) {
          onBack();
        }
      });
    }
  }, []);

  // Add a useEffect to handle chart resizing
  useEffect(() => {
    const handleResize = () => {
      // Manually trigger chart resize if needed
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clean up the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
    };
  }, [fetchTimeout]);

  // Add this function before the return statement
  const handleFetchHistoricalData = async () => {
    if (!selectedDate) {
      showSnackbar('Please select a valid date', 'error');
      return;
    }

    // Close dialog
    setDatePickerOpen(false);
    
    // Set selected history date for display
    setSelectedHistoryDate(selectedDate.toISOString());
    setSelectedTimeWindow(timeWindow);
    
    // Show loading
    setIsLoading(true);
    
    try {
      // Calculate end time as end of the selected day
      const endTime = new Date(selectedDate);
      endTime.setHours(23, 59, 59);
      
      // Calculate start time based on selected window
      const startTime = new Date(endTime);
      
      // Handle multi-day windows
      if (timeWindow === '24h') {
        startTime.setDate(startTime.getDate() - 1); // 1 day back
      } else if (timeWindow === '2d') {
        startTime.setDate(startTime.getDate() - 2); // 2 days back
      } else if (timeWindow === '3d') {
        startTime.setDate(startTime.getDate() - 3); // 3 days back
      } else {
        // Handle hour-based windows as before
        const hours = parseInt(timeWindow.replace('h', ''));
        startTime.setHours(endTime.getHours() - hours);
      }
      
      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.client_id,
        user_email: user.email,
        time_range: 'custom',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        points: timeWindow.includes('d') ? 150 : 100 // More points for multi-day views
      };
      
      // Show a loading indicator for longer time ranges
      if (timeWindow === '2d' || timeWindow === '3d') {
        setCommandFeedback({
          show: true,
          message: `Loading ${timeWindow} of data, please wait...`,
          loading: true
        });
      }
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      // Hide loading message
      setCommandFeedback({
        show: false,
        message: '',
        loading: false
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        showSnackbar('No data available for the selected date', 'warning');
        setIsLoading(false);
        return;
      }
      
      // Process the historical data
      const data = result.data;
      const timestamps = data.map((entry) => new Date(entry.timestamp));
      setLabels(timestamps);
      
      // Process metrics data
      const firstDataPoint = data[0];
      const newMetricsConfig = {};
      Object.keys(firstDataPoint).forEach(key => {
        if (key !== 'timestamp' && key !== 'client_id') {
          newMetricsConfig[key] = generateMetricConfig(key);
        }
      });
      setMetricsConfig(newMetricsConfig);
      
      const newMetricsData = {};
      Object.keys(newMetricsConfig).forEach(key => {
        newMetricsData[key] = data.map(entry => parseFloat(entry[key]));
      });
      setMetricsData(newMetricsData);
      
      // Show warning if one was returned
      if (result.summary && result.summary.warning) {
        showSnackbar(result.summary.warning, 'warning');
      }
      
    } catch (error) {
      console.error('Error fetching historical data:', error);
      showSnackbar('Error fetching historical data. Please try again.', 'error');
      setCommandFeedback({
        show: false,
        message: '',
        loading: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add these functions to your component:

  // Calculate duration between two dates for display
  const calculateDuration = (start, end) => {
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 0) {
      return "Invalid time range";
    } else if (diffHours < 1) {
      return `${Math.round(diffHours * 60)} minutes`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ${Math.round((diffHours % 1) * 60)} minutes`;
    } else {
      const days = Math.floor(diffHours / 24);
      const hours = Math.floor(diffHours % 24);
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  // Validates time range and triggers data fetching
  const validateAndFetchHistoricalData = () => {
    // Calculate time difference in hours
    const diffHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
    
    // Validation checks
    if (endDateTime <= startDateTime) {
      setDateTimeError('End time must be after start time');
      return;
    }
    
    // Strictly enforce the 24-hour limit
    if (diffHours > 24) {
      setDateTimeError('Time range cannot exceed 24 hours (1 day)');
      return;
    }
    
    // All checks passed, proceed to fetch data
    setDateTimeError('');
    setDatePickerOpen(false);
    fetchPreciseHistoricalData(startDateTime, endDateTime);
  };

  // New function to fetch data with precise timestamps
  const fetchPreciseHistoricalData = async (startTime, endTime) => {
    // Set selected history date for display (we'll keep this for compatibility)
    setSelectedHistoryDate(startTime.toISOString());
    setSelectedTimeWindow("custom");
    
    // Show loading
    setIsLoading(true);
    
    try {
      // Calculate appropriate number of data points based on time range
      const diffHours = (endTime - startTime) / (1000 * 60 * 60);
      let requestedPoints = 100;
      
      if (diffHours > 48) {
        requestedPoints = 150; // More points for 2-3 day ranges
      } else if (diffHours > 24) {
        requestedPoints = 120; // More points for 1-2 day ranges
      }
      
      // Show a loading indicator for longer time ranges
      if (diffHours > 24) {
        setCommandFeedback({
          show: true,
          message: `Loading ${Math.round(diffHours)} hours of data, please wait...`,
          loading: true
        });
      }
      
      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.client_id,
        user_email: user.email,
        time_range: 'custom',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        points: requestedPoints
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      // Hide loading message
      setCommandFeedback({
        show: false,
        message: '',
        loading: false
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        showSnackbar('No data available for the selected time range', 'warning');
        setIsLoading(false);
        return;
      }
      
      // Process the historical data
      const data = result.data;
      const timestamps = data.map((entry) => new Date(entry.timestamp));
      setLabels(timestamps);
      
      // Process metrics data
      const firstDataPoint = data[0];
      const newMetricsConfig = {};
      Object.keys(firstDataPoint).forEach(key => {
        if (key !== 'timestamp' && key !== 'client_id') {
          newMetricsConfig[key] = generateMetricConfig(key);
        }
      });
      setMetricsConfig(newMetricsConfig);
      
      const newMetricsData = {};
      Object.keys(newMetricsConfig).forEach(key => {
        newMetricsData[key] = data.map(entry => parseFloat(entry[key]));
      });
      setMetricsData(newMetricsData);
      
      // Show warning if one was returned
      if (result.summary && result.summary.warning) {
        showSnackbar(result.summary.warning, 'warning');
      }
      
    } catch (error) {
      console.error('Error fetching historical data:', error);
      showSnackbar('Error fetching historical data. Please try again.', 'error');
      setCommandFeedback({
        show: false,
        message: '',
        loading: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <DashboardSkeleton />;
  }

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
        width: '100%',
        pt: 0 // Remove any top padding
      }}
    >
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
      </Helmet>

      {/* Settings Drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Updated AppBar with back button and centered title */}
      <AppBar 
        position="static" 
        color="primary" 
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          width: '100%',
        }}
      >
        <Toolbar 
          sx={{ 
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1, sm: 0.5 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        > 
          {/* Back Button */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back to devices"
            onClick={onBack || (() => navigate('/devices'))}
            sx={{ 
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              mb: { xs: 1, sm: 0 }
            }}
          >
            <ArrowBackIcon />
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 0.5, 
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Devices
            </Typography>
          </IconButton>
          
          {/* Centered Title with Device Name */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              mb: { xs: 1, sm: 0 },
              fontSize: { xs: '1rem', sm: '1.25rem' },
              textAlign: { xs: 'left', sm: 'center' }, // Center align on larger screens
              fontWeight: 'medium'
            }}
          >
            Dashboard{device && ` - ${device.device_name}`}
          </Typography>

          {/* User Controls - Removed refresh icon */}
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: { xs: 0.5, sm: 1 },
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {/* Removed the refresh IconButton that was here */}
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
            <Typography 
              variant="body2" 
              noWrap 
              sx={{ 
                maxWidth: { xs: '100px', sm: '150px', md: '300px' },
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user.email}
            </Typography>
            <IconButton onClick={() => setSettingsOpen(true)} sx={{ color: theme.palette.text.primary }}>
              <SettingsIcon />
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

      {/* Main content area with consistent padding */}
      <Container 
        maxWidth={false} 
        disableGutters 
        sx={{ 
          p: { xs: 2, sm: 3 },  // Match padding with other pages
          flexGrow: 1,
          width: '100%'
        }}
      >
        <DeviceInfoCard
          clientID={device.client_id}
          deviceName={device.device_name}
          deviceType={device.device_type || device.latest_data?.device || 'Unknown'}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : 
            device.latest_data?.timestamp ? new Date(device.latest_data.timestamp).toLocaleString() : "N/A"}
          batteryLevel={metricsData.battery?.[metricsData.battery.length - 1]}
          signalStrength={metricsData.signal_quality?.[metricsData.signal_quality.length - 1]}
          showClientId={showClientId}
          onToggleClientId={() => setShowClientId(!showClientId)}
        />

        {/* Tabs for different views */}
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ 
            mb: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '1rem',
              minWidth: 120,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              }
            }
          }}
        >
          <Tab label="Overview" icon={<ShowChartIcon />} iconPosition="start" />
          <Tab label="Commands" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <>
            {/* Controls Bar */}
            <Paper sx={{ 
              p: 1.5,  // Reduced padding
              mb: 2,  // Reduced margin
              bgcolor: theme.palette.background.paper,
              '& .MuiButton-root': {
                minHeight: 28,  // Consistent height
                minWidth: 'auto'
              },
              '& .MuiFormControlLabel-root': {
                mr: { xs: 0, sm: 1 },
                '& .MuiTypography-root': {
                  fontSize: '0.75rem'  // Smaller label text
                }
              }
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,  // Reduced gap
                alignItems: 'center' 
              }}>
                {renderTimeRangeMenu()}
              </Box>
            </Paper>

            {/* Summary Statistics */}
            {renderSummaryCards()}

            {/* Charts */}
            {renderCharts()}
          </>
        )}

        {/* Commands Tab */}
        {tabValue === 1 && (
          <>
            {/* Device Controls */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: theme.palette.background.paper }}>
              <Typography variant="h6" gutterBottom>Device Controls</Typography>
              <Grid container spacing={2}>
                {/* Toggle Controls */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
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
                  </Box>
                </Grid>

                {/* Restart Button */}
                <Grid item xs={12} md={6}>
                <Button 
                  variant="contained" 
                  onClick={handleRestart}
                    startIcon={<RefreshIcon />}
                  sx={{ 
                    bgcolor: theme.palette.secondary.main,
                    "&:hover": { bgcolor: theme.palette.secondary.dark }
                  }}
                >
                  Restart Device
                </Button>
                </Grid>

                {/* Speed Control and Display */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap"
                  }}>
                    {/* Current Speed Display */}
                    <Paper
                      elevation={1}
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: theme.palette.background.default,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        height: 40,
                        minWidth: 120
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">
                        Speed Configured:
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 'medium' }}>
                        {deviceState.motor_speed}%
                      </Typography>
                    </Paper>

                    {/* Speed Input Control */}
                    <Box sx={{ 
                      display: "flex", 
                      gap: 1, 
                      alignItems: "center",
                      height: 40
                    }}>
                  <TextField
                    variant="outlined"
                    size="small"
                        label="New Speed"
                        placeholder="0-100"
                    value={speedInput}
                    onChange={(e) => setSpeedInput(e.target.value)}
                    sx={{
                          width: 100,
                          "& .MuiOutlinedInput-root": {
                            height: 40,
                      bgcolor: theme.palette.background.default,
                          }
                    }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSendSpeed}
                    disabled={!speedInput.trim()}
                    sx={{ 
                          height: 40,
                          minWidth: 'auto',
                          px: 2
                    }}
                  >
                        Set
                  </Button>
                </Box>
              </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Command History */}
            <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Command History</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setCommandHistory([])}
                >
                  Clear History
                </Button>
              </Box>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {commandHistory.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                    No commands sent yet
                  </Typography>
                ) : (
                  commandHistory.map((cmd, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        py: 1.5, 
                        px: 2,
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {cmd.action}
                        </Typography>
                        {cmd.data && Object.keys(cmd.data).length > 0 && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            {JSON.stringify(cmd.data)}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          {cmd.timestamp.toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: cmd.status === 'success' ? 'success.main' : 
                                cmd.status === 'pending' ? 'warning.main' : 'error.main',
                          bgcolor: cmd.status === 'success' ? 'success.light' : 
                                  cmd.status === 'pending' ? 'warning.light' : 'error.light',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontWeight: 'medium'
                        }}
                      >
                        {cmd.status}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>
          </>
        )}

        {/* History Tab */}
        {tabValue === 2 && (
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data History</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Date Picker Section */}
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setDatePickerOpen(true)}
                >
                  Select Date
                </Button>
                
                {/* Export Button */}
                <Button
                  startIcon={<DownloadIcon />}
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
            
            {/* Selected Date Display */}
            {selectedHistoryDate && (
              <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2">
                    {selectedTimeWindow === "custom" ? (
                      <>
                        Viewing data from: <b>{new Date(selectedHistoryDate).toLocaleString()}</b> to <b>{endDateTime.toLocaleString()}</b>
                      </>
                    ) : (
                      <>
                        Viewing data from: <b>{new Date(selectedHistoryDate).toLocaleDateString()}</b> 
                        {selectedTimeWindow && selectedTimeWindow === '24h' && ` (1 day window)`}
                        {selectedTimeWindow && selectedTimeWindow === '2d' && ` (2 day window)`}
                        {selectedTimeWindow && selectedTimeWindow === '3d' && ` (3 day window)`}
                        {selectedTimeWindow && !['24h', '2d', '3d', 'custom'].includes(selectedTimeWindow) && ` (${selectedTimeWindow} window)`}
                      </>
                    )}
                  </Typography>
                  {((selectedTimeWindow === '2d' || selectedTimeWindow === '3d') || 
                     (selectedTimeWindow === 'custom' && (endDateTime - new Date(selectedHistoryDate)) > 24 * 60 * 60 * 1000)) && (
                    <Typography variant="caption" color="text.secondary">
                      Large data ranges are aggregated for performance
                    </Typography>
                  )}
                </Box>
                <Button 
                  size="small" 
                  onClick={() => {
                    setSelectedHistoryDate(null);
                    setSelectedTimeWindow(null);
                    // Reset to current data
                    fetchData();
                  }}
                >
                  Return to Current
                </Button>
              </Box>
            )}
            
            {/* Chart Section */}
            <Box sx={{ height: 400 }}>
              {selectedHistoryDate ? (
                // Show all metrics in historical view
                <Grid container spacing={2}>
                  {Object.entries(metricsConfig).map(([key, config]) => {
                    if (key === 'client_id' || key === 'ClientID') return null;
                    return (
                      <Grid item xs={12} md={6} key={key}>
                        {renderChart(metricsData[key], key)}
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                // Default view - temperature chart
                renderChart(temperatureData, "temperature")
              )}
            </Box>
            
            {/* Date Picker Dialog */}
            <Dialog 
              open={datePickerOpen} 
              onClose={() => setDatePickerOpen(false)}
              maxWidth="md"
              PaperProps={{ sx: { borderRadius: 2 } }}
            >
              <DialogTitle sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                pb: 1
              }}>
                Select Historical Time Range
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, 
                  gap: 3, 
                  width: '100%', 
                  minWidth: { sm: 500 }
                }}>
                  {/* Start Date & Time */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom color="primary.main" fontWeight="medium">
                      Start Date & Time
                    </Typography>
                    <TextField
                      label="Date"
                      type="date"
                      value={startDateTime.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(startDateTime);
                        const [year, month, day] = e.target.value.split('-');
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                        setStartDateTime(newDate);
                        setDateTimeError('');
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      margin="dense"
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        label="Hour"
                        type="number"
                        value={startDateTime.getHours()}
                        onChange={(e) => {
                          const newDate = new Date(startDateTime);
                          newDate.setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)));
                          setStartDateTime(newDate);
                          setDateTimeError('');
                        }}
                        InputProps={{ 
                          inputProps: { min: 0, max: 23 }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        margin="dense"
                      />
                      <TextField
                        label="Minute"
                        type="number"
                        value={startDateTime.getMinutes()}
                        onChange={(e) => {
                          const newDate = new Date(startDateTime);
                          newDate.setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)));
                          setStartDateTime(newDate);
                          setDateTimeError('');
                        }}
                        InputProps={{ 
                          inputProps: { min: 0, max: 59 }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        margin="dense"
                      />
                    </Box>
                  </Box>

                  {/* End Date & Time */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom color="primary.main" fontWeight="medium">
                      End Date & Time
                    </Typography>
                    <TextField
                      label="Date"
                      type="date"
                      value={endDateTime.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(endDateTime);
                        const [year, month, day] = e.target.value.split('-');
                        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                        setEndDateTime(newDate);
                        setDateTimeError('');
                      }}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      margin="dense"
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        label="Hour"
                        type="number"
                        value={endDateTime.getHours()}
                        onChange={(e) => {
                          const newDate = new Date(endDateTime);
                          newDate.setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)));
                          setEndDateTime(newDate);
                          setDateTimeError('');
                        }}
                        InputProps={{ 
                          inputProps: { min: 0, max: 23 }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        margin="dense"
                      />
                      <TextField
                        label="Minute"
                        type="number"
                        value={endDateTime.getMinutes()}
                        onChange={(e) => {
                          const newDate = new Date(endDateTime);
                          newDate.setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)));
                          setEndDateTime(newDate);
                          setDateTimeError('');
                        }}
                        InputProps={{ 
                          inputProps: { min: 0, max: 59 }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        margin="dense"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Quick Selection Buttons */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary.main" fontWeight="medium">
                    Quick Range Selection
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setHours(end.getHours() - 4);
                        setStartDateTime(start);
                        setEndDateTime(end);
                      }}
                    >
                      Last 4 Hours
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setHours(end.getHours() - 8);
                        setStartDateTime(start);
                        setEndDateTime(end);
                      }}
                    >
                      Last 8 Hours
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setHours(end.getHours() - 16);
                        setStartDateTime(start);
                        setEndDateTime(end);
                      }}
                    >
                      Last 16 Hours
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date(end);
                        start.setDate(end.getDate() - 1);  // Exactly 24 hours
                        setStartDateTime(start);
                        setEndDateTime(end);
                      }}
                    >
                      Last 24 Hours (Max)
                    </Button>
                  </Box>
                </Box>

                {/* Error Message */}
                {dateTimeError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {dateTimeError}
                  </Alert>
                )}

                {/* Duration Display */}
                <Box sx={{ mt: 3, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  {/* Calculate diffHours here */}
                  {(() => {
                    const diffHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
                    return (
                      <>
                        <Typography variant="body2">
                          Selected duration: {calculateDuration(startDateTime, endDateTime)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={diffHours > 24 ? "error.main" : "text.secondary"} 
                          fontWeight={diffHours > 24 ? "bold" : "normal"}
                        >
                          Maximum allowed: 24 hours (1 day)
                          {diffHours > 24 && " - Current selection exceeds limit"}
                        </Typography>
                      </>
                    );
                  })()}
      </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setDatePickerOpen(false)}>Cancel</Button>
                <Button 
                  onClick={validateAndFetchHistoricalData} 
                  variant="contained" 
                  color="primary"
                  startIcon={<HistoryIcon />}
                >
                  View Data
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        )}
      </Container>

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

      {/* Add this after your existing Controls Bar */}
      {dataRangeWarning && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          onClose={() => setDataRangeWarning(null)}
        >
          {dataRangeWarning}
        </Alert>
      )}

      {/* Add these Menu components right after your Controls Bar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 1
      }}>
        {/* Time Range Menu */}
        <Menu
          anchorEl={timeRangeAnchor}
          open={Boolean(timeRangeAnchor)}
          onClose={() => setTimeRangeAnchor(null)}
          PaperProps={{
            sx: {
              mt: 0.5,
              minWidth: 120,
              boxShadow: theme.shadows[3]
            }
          }}
        >
          {TIME_RANGES.map((range) => (
            <MenuItem
              key={range.value}
              onClick={() => {
                if (range.value === 'custom') {
                  setDatePickerOpen(true);  // Using setDatePickerOpen instead of setCustomDateOpen
                } else {
                  // Use the handler function instead of directly setting
                  handleTimeRangeChange(range.value);
                }
              }}
              selected={timeRange === range.value}
              sx={{ 
                fontSize: '0.875rem',
                minHeight: 32,
                py: 0.5
              }}
            >
              {range.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Chart Options Menu */}
        <Menu
          anchorEl={chartMenuAnchor}
          open={Boolean(chartMenuAnchor)}
          onClose={() => setChartMenuAnchor(null)}
          PaperProps={{
            sx: {
              mt: 0.5,
              minWidth: 160,
              boxShadow: theme.shadows[3]
            }
          }}
        >
          <MenuItem
            onClick={() => {
              setChartType(chartType === 'line' ? 'bar' : 'line');
              setChartMenuAnchor(null);
            }}
            sx={{ fontSize: '0.875rem', minHeight: 32, py: 0.5 }}
          >
            {chartType === 'line' ? 'Switch to Bar Chart' : 'Switch to Line Chart'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setChartConfig(prev => ({ ...prev, showGrid: !prev.showGrid }));
              setChartMenuAnchor(null);
            }}
            sx={{ fontSize: '0.875rem', minHeight: 32, py: 0.5 }}
          >
            {chartConfig.showGrid ? 'Hide Grid' : 'Show Grid'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setChartConfig(prev => ({ ...prev, showPoints: !prev.showPoints }));
              setChartMenuAnchor(null);
            }}
            sx={{ fontSize: '0.875rem', minHeight: 32, py: 0.5 }}
          >
            {chartConfig.showPoints ? 'Hide Points' : 'Show Points'}
          </MenuItem>
        </Menu>
      </Box>

      {/* Add this component near the end of your return statement, just before the closing </Box> */}
      {/* Add this right after your existing Snackbar components */}
      <Snackbar
        open={commandFeedback.show}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiPaper-root': {
            bgcolor: 'background.paper',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            minWidth: 250
          }
        }}
      >
        <Paper elevation={3}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 1.5
          }}>
            {commandFeedback.loading && (
              <CircularProgress size={20} color="primary" />
            )}
            <Typography variant="body2">
              {commandFeedback.message}
            </Typography>
          </Box>
        </Paper>
      </Snackbar>
    </Box>
  );
}
