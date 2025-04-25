import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
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
  Select,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery
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
  VisibilityOff,
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import DashboardHeader from "./dashboard2/DashboardHeader";
import DashboardContent from "./dashboard2/DashboardContent";
import DashboardControls from "./dashboard2/DashboardControls";
import DashboardCharts from "./dashboard2/DashboardCharts";
import DashboardCommands from "./dashboard2/DashboardCommands";
import DashboardHistory from "./dashboard2/DashboardHistory";
import SettingsDrawer from "./SettingsDrawer";
import DeviceInfoCard from "./DeviceInfoCard";
import TimeRangeMenu from './dashboard2/TimeRangeMenu';
import DashboardSkeleton from "./dashboard2/DashboardSkeleton";
import DashboardSummaryTab from './dashboard2/DashboardSummaryTab';
import DashboardChartsTab from './dashboard2/DashboardChartsTab';
import DashboardCommandsTab from './dashboard2/DashboardCommandsTab';
import DashboardHistoryTab from './dashboard2/DashboardHistoryTab';
import DashboardOverviewTab from './dashboard2/DashboardOverviewTab';
import DashboardStatisticsTab from './dashboard2/DashboardStatisticsTab';
import DashboardAlarmsTab from './dashboard2/DashboardAlarmsTab';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const DASHBOARD_DATA_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
const DASHBOARD_LATEST_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-latest";
const STATUS_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-status";
const VARIABLES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-variables";
const COMMAND_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/send-command";
const BATTERY_STATE_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-battery-state";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

export default function Dashboard2({ user, device, onLogout, onBack }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedTab, setSelectedTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [deviceState, setDeviceState] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [alarmHistory, setAlarmHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [chartType, setChartType] = useState('line');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [chartMenuAnchor, setChartMenuAnchor] = useState(null);
  const [showCharts, setShowCharts] = useState(true);
  const [showCommands, setShowCommands] = useState(true);
  const [metricsConfig, setMetricsConfig] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [prevTabValue, setPrevTabValue] = useState(0);
  const [variablesLoaded, setVariablesLoaded] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [alertThresholds, setAlertThresholds] = useState({
    temperature: { min: 10, max: 30 },
    humidity: { min: 30, max: 70 },
    battery: { min: 20 },
    signal: { min: 30 }
  });

  // Add error state
  const [error, setError] = useState(null);

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
  const [speedInput, setSpeedInput] = useState(0);
  const [commandHistory, setCommandHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [chartConfig, setChartConfig] = useState({
    showPoints: true,
    showGrid: true
  });

  // Summary type state
  const [summaryType, setSummaryType] = useState('latest');

  // UI visibility states
  const [showBatterySignal, setShowBatterySignal] = useState(true);
  const [showClientId, setShowClientId] = useState(false);

  // Time range menu state
  const [timeRangeAnchor, setTimeRangeAnchor] = useState(null);

  // Data range warning state
  const [dataRangeWarning, setDataRangeWarning] = useState(null);

  // Chart reference
  const chartRef = React.useRef(null);

  // State tracking
  const [pendingStateCheck, setPendingStateCheck] = useState(false);
  const [stateCheckTimeout, setStateCheckTimeout] = useState(null);
  const [pendingCommands] = useState(new Map());
  const [activeCommands] = useState(new Set());
  const [fetchTimeout, setFetchTimeout] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState(new Map());
  const [isVerifying, setIsVerifying] = useState(false);

  // Command feedback state
  const [commandFeedback, setCommandFeedback] = useState({
    show: false,
    message: '',
    loading: false
  });

  // Date and time states
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeWindow, setTimeWindow] = useState('8h');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(null);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(() => {
    const date = new Date();
    date.setHours(23, 59, 59);
    return date;
  });
  const [dateTimeError, setDateTimeError] = useState('');

  // Add cleanup ref for component unmount
  const isMounted = useRef(true);

  // Separate state for overview tab
  const [selectedVariablesOverview, setSelectedVariablesOverview] = useState([]);
  
  // Shared state for charts and statistics tabs
  const [selectedVariablesChartsStats, setSelectedVariablesChartsStats] = useState([]);
  
  const [availableVariables, setAvailableVariables] = useState([]);

  // Add state for tracking pending changes
  const [pendingChanges, setPendingChanges] = useState({
    timeRange: null,
    variables: null
  });

  // Add these state variables near the other state declarations
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [signalStrength, setSignalStrength] = useState(0);

  // Add this state variable near other state declarations
  const [batteryState, setBatteryState] = useState('idle');

  useEffect(() => {
    if (metricsConfig) {
      const variables = Object.keys(metricsConfig);
      setAvailableVariables(variables);
      setSelectedVariablesChartsStats(variables);
      setSelectedVariablesOverview(variables);
    }
  }, [metricsConfig]);

  const handleVariableChange = (event, isOverview = false) => {
    const newVariables = event.target.value;
    if (isOverview) {
      setSelectedVariablesOverview(newVariables);
    } else {
      setSelectedVariablesChartsStats(newVariables);
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchVariables = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      setVariablesLoaded(false);
      const response = await fetch(VARIABLES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.variables || !Array.isArray(result.variables)) {
        throw new Error('Invalid response format from variables API');
      }

      // Create metrics config based on available variables
      const newMetricsConfig = {};
      result.variables.forEach(variable => {
        newMetricsConfig[variable] = {
          label: variable === 'temperature' ? 'Temperature' :
                 variable === 'humidity' ? 'Humidity' :
                 variable === 'battery' ? 'Battery' :
                 variable === 'signal_quality' ? 'Signal Quality' : variable,
          color: variable === 'temperature' ? '#FF6B6B' :
                 variable === 'humidity' ? '#4ECDC4' :
                 variable === 'battery' ? '#FFD166' :
                 variable === 'signal_quality' ? '#06D6A0' : theme.palette.primary.main,
          unit: variable === 'temperature' ? '°C' : 
                variable === 'humidity' ? '%' : 
                variable === 'battery' ? '%' : 
                variable === 'signal_quality' ? '%' : '',
          alertThresholds: {
            min: variable === 'temperature' ? 10 : 
                 variable === 'humidity' ? 30 : 
                 variable === 'battery' ? 20 : 
                 variable === 'signal_quality' ? 30 : 0,
            max: variable === 'temperature' ? 30 : 
                 variable === 'humidity' ? 70 : 
                 variable === 'battery' ? 100 : 
                 variable === 'signal_quality' ? 100 : 100
          }
        };
      });

      setMetricsConfig(newMetricsConfig);
      setVariablesLoaded(true);
    } catch (error) {
      console.error('Error fetching variables:', error);
      setError(error.message || 'Failed to fetch available variables');
      setVariablesLoaded(false);
    }
  };

  const fetchBatteryState = async (retryCount = 0) => {
    if (!device || !device.client_id) {
      console.warn('No device or client_id available for battery state fetch');
      return;
    }

    try {
      console.log(`Fetching battery state for device: ${device.client_id}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(BATTERY_STATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 502 && retryCount < 1) {
          console.warn('Received 502 Bad Gateway, retrying once...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return fetchBatteryState(retryCount + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result || typeof result.battery_state !== 'string') {
        console.error('Invalid response format from battery state API:', result);
        throw new Error('Invalid response format from battery state API');
      }

      console.log('Successfully fetched battery state:', result.battery_state);
      setBatteryState(result.battery_state);
    } catch (error) {
      console.error('Error fetching battery state:', error);
      if (error.name === 'AbortError') {
        console.warn('Request timed out');
      }
      setBatteryState('idle');
    }
  };

  const fetchLatestData = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      const response = await fetch(DASHBOARD_LATEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id,
          selected_variables: selectedVariablesOverview
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received latest data:', result);

      if (result.data_latest && Array.isArray(result.data_latest) && result.data_latest.length > 0) {
        const latestData = result.data_latest[0];
        const summary = result.summary_latest || {};

        // Update device status based on timestamp
        const lastTimestamp = new Date(latestData.timestamp);
        const timeDiffSeconds = (new Date() - lastTimestamp) / 1000;
        const deviceStatus = timeDiffSeconds <= 120 ? "Active" : "Inactive";

        // Update metrics data with latest values
        setMetricsData(prevData => ({
          ...prevData,
          data_latest: result.data_latest,
          summary_latest: summary
        }));

        // Update device info
        setDeviceStatus(deviceStatus);
        setLastSeen(lastTimestamp);
        setClientID(device.client_id);
        setDeviceName(device.name || "Unknown");

        // Fetch battery state
        await fetchBatteryState();
      }
    } catch (error) {
      console.error('Error fetching latest data:', error);
      setError(error.message || 'Failed to connect to the server');
    }
  };

  const fetchGraphData = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      // Only set loading state for initial load
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await fetch(DASHBOARD_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_dashboard_data',
          client_id: device.client_id,
          user_email: user.email,
          time_range: timeRange,
          points: 60,
          include_state: true,
          selected_variables: selectedVariablesChartsStats
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received dashboard data:', result);

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        const newMetricsData = {
          data: result.data,
          summary: result.summary || {}
        };
        setMetricsData(newMetricsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to connect to the server');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const fetchDeviceState = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      const response = await fetch(STATUS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const deviceState = await response.json();
      console.log('Device state response:', deviceState);

      setDeviceState(deviceState);
      return deviceState;
    } catch (error) {
      console.error('Error fetching device state:', error);
      setError(error.message || 'Failed to fetch device state');
      return null;
    }
  };

  const fetchInitialData = async () => {
    if (!device || !device.client_id || !isMounted.current) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. First fetch variables
      await fetchVariables();
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      // 2. Fetch regular dashboard data
      await fetchGraphData();
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      // 3. Fetch latest data
      await fetchLatestData();
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      // 4. Finally fetch device state
      await fetchDeviceState();

      // Set up interval for periodic updates
      const intervalId = setInterval(async () => {
        if (!isMounted.current) {
          clearInterval(intervalId);
          return;
        }
        await fetchLatestData();
        await fetchDeviceState();
      }, 30000);

      // Cleanup interval on unmount
      return () => {
        clearInterval(intervalId);
      };
      
    } catch (error) {
      console.error('Error in initial data fetch:', error);
      if (isMounted.current) {
        setError(error.message || 'Failed to fetch initial data');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Update the initial data fetch useEffect
  useEffect(() => {
    if (device && device.client_id) {
      fetchInitialData();
    }
    return () => {
      isMounted.current = false;
    };
  }, [device]);

  const handleCloseError = () => {
    setError(null);
  };

  // Event handlers
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    setPendingChanges(prev => ({
      ...prev,
      timeRange: newTimeRange
    }));
  };

  const handleExportData = () => {
    if (!metricsData || Object.keys(metricsData).length === 0) {
      setSnackbar({
        open: true,
        message: 'No data available to export',
        severity: 'error'
      });
      return;
    }

    // Create CSV content
    const headers = ['Timestamp', 'Temperature', 'Humidity', 'Battery', 'Signal Quality'];
    const rows = [headers];

    // Get the first metric's timestamps
    const timestamps = metricsData[Object.keys(metricsData)[0]]?.map(d => d.timestamp) || [];
    
    timestamps.forEach((timestamp, index) => {
      const row = [
        new Date(timestamp).toLocaleString(),
        metricsData.temperature?.[index]?.value || '',
        metricsData.humidity?.[index]?.value || '',
        metricsData.battery?.[index]?.value || '',
        metricsData.signal_quality?.[index]?.value || ''
      ];
      rows.push(row);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `device_${device.client_id}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleChartTypeClick = (event) => {
    setChartMenuAnchor(event.currentTarget);
  };

  const handleChartTypeClose = () => {
    setChartMenuAnchor(null);
  };

  const handleTimeRangeClick = (event) => {
    setTimeRangeAnchor(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setTimeRangeAnchor(null);
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleToggle1Change = (event) => {
    setToggle1(event.target.checked);
    // Add command sending logic here
  };

  const handleToggle2Change = (event) => {
    setToggle2(event.target.checked);
    // Add command sending logic here
  };

  const handleSpeedInputChange = (event) => {
    setSpeedInput(event.target.value);
  };

  const handleSpeedInputSubmit = () => {
    const speed = parseInt(speedInput, 10);
    console.log('Submitting speed:', speed); // Debug log
    
    if (isNaN(speed) || speed < 0 || speed > 100) {
      setSnackbar({
        open: true,
        message: 'Speed must be a number between 0 and 100',
        severity: 'error'
      });
      return;
    }
    
    // Send the command with the speed value
    handleCommandSend('SET_SPEED', { speed: speed });
  };

  const handleChartConfigChange = (key) => (event) => {
    setChartConfig(prev => ({
      ...prev,
      [key]: event.target.checked
    }));
  };

  const handleAlertThresholdChange = (metric, type) => (event) => {
    setAlertThresholds(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [type]: parseFloat(event.target.value)
      }
    }));
  };

  const handleSummaryTypeChange = (event) => {
    setSummaryType(event.target.value);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setDatePickerOpen(false);
  };

  const handleTimeWindowChange = (event) => {
    setTimeWindow(event.target.value);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleAlarmUpdate = (updatedAlarms) => {
    setAlarms(updatedAlarms);
    // Here you would typically send the updated alarms to your backend
  };

  const handleCommandSend = async (command, params = {}) => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return false;
    }

    try {
      const payload = {
        client_id: device.client_id,
        command: command
      };

      // Add speed to payload for SET_SPEED command
      if (command === 'SET_SPEED') {
        payload.speed = params.speed;
      }

      console.log('Sending command with payload:', payload);

      const response = await fetch('https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send command');
      }

      // The API might return a success response without a body
      if (response.status === 200) {
        setSnackbar({
          open: true,
          message: 'Command sent successfully',
          severity: 'success'
        });
        return true;
      }

      // If there is a response body, try to parse it
      const result = await response.json();
      if (result && result.success) {
        setSnackbar({
          open: true,
          message: 'Command sent successfully',
          severity: 'success'
        });
        return true;
      }

      throw new Error(result?.error || 'Failed to send command');
    } catch (error) {
      console.error('Error sending command:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to send command',
        severity: 'error'
      });
      return false;
    }
  };

  const handleApply = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(DASHBOARD_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_dashboard_data',
          client_id: device.client_id,
          user_email: user.email,
          time_range: timeRange,
          points: 60,
          include_state: true,
          selected_variables: selectedVariablesChartsStats
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received dashboard data:', result);

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Update the metrics data while preserving latest data
        setMetricsData(prevData => ({
          ...prevData,
          data: result.data,
          summary: result.summary || {}
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = (tabValue) => {
    switch (tabValue) {
      case 0:
        return (
          <DashboardOverviewTab
            device={device}
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            lastSeen={device?.last_seen}
            deviceState={deviceState}
            timeRange={timeRange}
            refreshInterval={refreshInterval}
            toggle1={toggle1}
            toggle2={toggle2}
            speedInput={speedInput}
            onRefresh={fetchGraphData}
            selectedVariables={selectedVariablesOverview}
            availableVariables={availableVariables}
            onVariableChange={(e) => handleVariableChange(e, true)}
            onTimeRangeChange={handleTimeRangeChange}
          />
        );
      case 1:
        return (
          <DashboardChartsTab
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            timeRange={timeRange}
            chartConfig={chartConfig}
            selectedVariables={selectedVariablesChartsStats}
            availableVariables={availableVariables}
            onVariableChange={handleVariableChange}
            onTimeRangeChange={handleTimeRangeChange}
            onApply={handleApply}
          />
        );
      case 2:
        return (
          <DashboardStatisticsTab
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            deviceState={deviceState}
            selectedVariables={selectedVariablesChartsStats}
            availableVariables={availableVariables}
            onVariableChange={handleVariableChange}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            onApply={handleApply}
          />
        );
      case 3:
        return (
          <DashboardCommands
            device={device}
            deviceState={deviceState}
            onCommandSend={handleCommandSend}
            fetchDeviceState={fetchDeviceState}
            handleCommandSend={handleCommandSend}
            setSnackbar={setSnackbar}
          />
        );
      case 4:
        return (
          <DashboardAlarmsTab
            metricsConfig={metricsConfig}
            alarms={alarms}
            alarmHistory={alarmHistory}
            onAlarmUpdate={handleAlarmUpdate}
          />
        );
      default:
        return null;
    }
  };

  if (isInitialLoad && isLoading) {
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
        pt: 0
      }}
    >
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
      </Helmet>

      {/* Settings Drawer */}
      <SettingsDrawer 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        chartConfig={chartConfig}
        onChartConfigChange={handleChartConfigChange}
        alertThresholds={alertThresholds}
        onAlertThresholdChange={handleAlertThresholdChange}
        showBatterySignal={showBatterySignal}
        onShowBatterySignalChange={(e) => setShowBatterySignal(e.target.checked)}
        showClientId={showClientId}
        onShowClientIdChange={(e) => setShowClientId(e.target.checked)}
      />

      {/* AppBar */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {device?.name || 'Device Dashboard'}
        </Typography>
        <IconButton onClick={handleSettingsOpen}>
          <SettingsIcon />
        </IconButton>
      </Paper>

      <Container 
        maxWidth={false} 
        disableGutters 
        sx={{ 
          p: { xs: 2, sm: 3 },
          flexGrow: 1,
          width: '100%'
        }}
      >
        <DeviceInfoCard
          clientID={device?.client_id || "Unknown"}
          deviceName={device?.device_name || "Unknown"}
          deviceType={device?.device_type || device?.latest_data?.device || 'Unknown'}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : 
            device?.latest_data?.timestamp ? new Date(device.latest_data.timestamp).toLocaleString() : "N/A"}
          batteryLevel={metricsData?.data_latest?.[0]?.battery || 0}
          signalStrength={metricsData?.data_latest?.[0]?.signal_quality || 0}
          showClientId={showClientId}
          onToggleClientId={() => setShowClientId(!showClientId)}
          batteryState={batteryState}
        />

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 2,
              py: 1.5
            }
          }}
        >
          <Tab 
            label="Overview" 
            icon={<DashboardIcon />} 
            iconPosition="start" 
            {...a11yProps(0)}
          />
          <Tab 
            label="Charts" 
            icon={<ShowChartIcon />} 
            iconPosition="start" 
            {...a11yProps(1)}
          />
          <Tab 
            label="Statistics" 
            icon={<TimelineIcon />} 
            iconPosition="start" 
            {...a11yProps(2)}
          />
          <Tab 
            label="Commands" 
            icon={<BuildIcon />} 
            iconPosition="start" 
            {...a11yProps(3)}
          />
          <Tab 
            label="Alarms" 
            icon={<WarningIcon />} 
            iconPosition="start" 
            {...a11yProps(4)}
          />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={selectedTab} index={0}>
          {renderTabContent(selectedTab)}
        </TabPanel>
        <TabPanel value={selectedTab} index={1}>
          {renderTabContent(selectedTab)}
        </TabPanel>
        <TabPanel value={selectedTab} index={2}>
          {renderTabContent(selectedTab)}
        </TabPanel>
        <TabPanel value={selectedTab} index={3}>
          {renderTabContent(selectedTab)}
        </TabPanel>
        <TabPanel value={selectedTab} index={4}>
          {renderTabContent(selectedTab)}
        </TabPanel>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 