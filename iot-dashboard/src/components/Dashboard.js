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
  DialogContentText,
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
  Warning as WarningIcon,
  Bluetooth as BluetoothIcon
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
const FETCH_ALARMS_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-alarms";

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
  const [triggeredAlarms, setTriggeredAlarms] = useState([]);
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
  const [deviceType, setDeviceType] = useState("N/A");
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

  // Add a ref to track if we're already fetching
  const isFetching = useRef(false);

  // Shared state for charts and statistics tabs
  const [sharedChartsData, setSharedChartsData] = useState([]);

  // State for logout confirmation dialog
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // State for device start time and uptime
  const [deviceStartTimeInfo, setDeviceStartTimeInfo] = useState(null);

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

      // Store the available variables
      setAvailableVariables(result.variables);

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

      // Set initial selected variables for overview
      setSelectedVariablesOverview(result.variables);
      // Set initial selected variables for charts and stats
      setSelectedVariablesChartsStats(result.variables);

      // Return the variables for immediate use
      return result.variables;
    } catch (error) {
      console.error('Error fetching variables:', error);
      setError(error.message || 'Failed to fetch available variables');
      setVariablesLoaded(false);
      return [];
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
      // Only update battery state if it's different
      if (batteryState !== result.battery_state) {
      setBatteryState(result.battery_state);
      }
    } catch (error) {
      console.error('Error fetching battery state:', error);
      if (error.name === 'AbortError') {
        console.warn('Request timed out');
      }
      // Don't update battery state on error
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
        
        // Device is active if last seen within 7 minutes
        setDeviceStatus(timeDiffSeconds <= 420 ? "Active" : "Inactive");

        // Update metrics data with latest values
        setMetricsData(prevData => ({
          ...prevData,
          data_latest: result.data_latest,
          summary_latest: summary
        }));

        // Update device info
        setLastSeen(lastTimestamp);
        setClientID(device.client_id);
        
        // Set device name and type from the latest data
        if (latestData.device_name) {
          setDeviceName(latestData.device_name);
        } else if (device.name) {
          setDeviceName(device.name);
        }
        
        if (latestData.device) {
          setDeviceType(latestData.device);
        } else if (device.device) {
          setDeviceType(device.device);
        }

        console.log('Updated device info:', {
          name: latestData.device_name || device.name,
          type: latestData.device || device.device
        });
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

      // First get the variables
      const variablesResponse = await fetch(VARIABLES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!variablesResponse.ok) {
        throw new Error(`HTTP error! status: ${variablesResponse.status}`);
      }

      const variablesResult = await variablesResponse.json();
      const variables = variablesResult.variables || [];
      
      // Now fetch the dashboard data with these variables
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
          selected_variables: variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Received dashboard data:', result);

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Process the data to round all numeric values to 2 decimal places
        const processedData = result.data.map(item => {
          const processedItem = { ...item };
          // Round all numeric values except timestamp
          Object.keys(processedItem).forEach(key => {
            if (key !== 'timestamp' && typeof processedItem[key] === 'number') {
              processedItem[key] = Number(processedItem[key].toFixed(2));
            }
          });
          return processedItem;
        });

        const newMetricsData = {
          data: processedData,
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

  const fetchAlarms = async () => {
    try {
      const response = await fetch(FETCH_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alarms');
      }

      const data = await response.json();
      console.log('Fetched alarms data:', data);
      setAlarms(data.alarms || []);
      setTriggeredAlarms(data.triggered_alarms || []);
      console.log('Set triggered alarms:', data.triggered_alarms || []);
    } catch (err) {
      console.error('Error fetching alarms:', err);
      setError(err.message);
    }
  };

  const fetchInitialData = async () => {
    if (!device || !device.client_id || !isMounted.current) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. First fetch variables and get them immediately
      const variables = await fetchVariables();
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      // 2. Fetch regular dashboard data with the variables we just got
      await fetchGraphData();
      
      // Check if component is still mounted
      if (!isMounted.current) return;
      
      // 3. Fetch latest data and device state together
      await Promise.all([
        fetchLatestData(),
        fetchDeviceState()
      ]);
      
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
      const fetchData = async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
          await fetchInitialData();
          // Make initial call to fetch battery state
          await fetchBatteryState();
          await fetchAlarms();
          // Fetch device start time and uptime
          await fetchDeviceStartTimeInfo();
        } finally {
          isFetching.current = false;
        }
      };

      fetchData();
      
      // Set up intervals for different data types
      const latestDataInterval = setInterval(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
          // Fetch latest data and device state together every 30 seconds
          await Promise.all([
            fetchLatestData(),
            fetchDeviceState()
          ]);
        } finally {
          isFetching.current = false;
        }
      }, 30000); // 30 seconds for latest data and device state

      const batteryStateInterval = setInterval(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
          await fetchBatteryState();
        } finally {
          isFetching.current = false;
        }
      }, 150000); // 2.5 minutes for battery state

      // Cleanup intervals on unmount
      return () => {
        clearInterval(latestDataInterval);
        clearInterval(batteryStateInterval);
      };
    }
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
    // Immediately fetch and update triggered alarms
    fetchAlarms();
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
          points: timeRange === 'live' ? 60 : 
                 timeRange === '15m' ? 15 :
                 timeRange === '1h' ? 60 :
                 timeRange === '24h' ? 96 : // 15-minute intervals for 24h
                 timeRange === '3d' ? 144 : // 30-minute intervals for 3d
                 timeRange === '7d' ? 168 : // 1-hour intervals for 7d
                 timeRange === '30d' ? 360 : // 2-hour intervals for 30d
                 60,
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
    console.log('Rendering tab content with triggeredAlarms:', triggeredAlarms);
    switch (tabValue) {
      case 0:
        return (
          <DashboardOverviewTab
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            selectedVariables={selectedVariablesOverview}
            availableVariables={availableVariables}
            deviceState={deviceState}
            isLoading={isLoading}
            onVariableChange={(event) => handleVariableChange(event, true)}
            triggeredAlarms={triggeredAlarms}
            deviceStartTimeInfo={deviceStartTimeInfo}
          />
        );
      case 1:
        return (
          <DashboardChartsTab
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            selectedVariables={selectedVariablesChartsStats}
            availableVariables={availableVariables}
            isLoading={isLoading}
            onVariableChange={(event) => handleVariableChange(event, false)}
            timeRange={timeRange}
            chartConfig={chartConfig}
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
            device={device}
            metricsConfig={metricsConfig}
            onAlarmToggle={fetchAlarms}
          />
        );
      default:
        return null;
    }
  };

  // Logout confirmation dialog handlers
  const handleLogoutClick = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = () => {
    onLogout(); // Perform the actual logout
    setLogoutConfirmOpen(false); // Close the dialog
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  // Add a new fetch function for device start time and uptime
  const fetchDeviceStartTimeInfo = async () => {
    if (!device || !device.client_id) {
      console.warn('No device or client_id available for start time fetch');
      return;
    }

    try {
      console.log(`Fetching device start time for device: ${device.client_id}`);
      
      const response = await fetch('https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-start-time', {
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
      
      if (!result || (result.timestamp === undefined && result.uptime === undefined)) {
        console.warn('Invalid response format from start time API:', result);
        // Don't throw an error, just set to null or handle appropriately
        setDeviceStartTimeInfo(null);
        return;
      }

      console.log('Successfully fetched device start time info:', result);
      setDeviceStartTimeInfo(result);

    } catch (error) {
      console.error('Error fetching device start time info:', error);
      // Do not set error state for this fetch as it's not critical for the whole dashboard
      setDeviceStartTimeInfo(null);
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
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={onBack}
            sx={{ mr: 2 }}
          >
          <ArrowBackIcon />
        </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              {device?.device_name || "Unknown"}
        </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {device?.device || "N/A"}
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="settings"
            onClick={handleSettingsOpen}
          >
          <SettingsIcon />
        </IconButton>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="logout"
            onClick={handleLogoutClick}
            sx={{ ml: 1 }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">{"Confirm Logout"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to log out?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel}>Cancel</Button>
          <Button onClick={handleLogoutConfirm} autoFocus>
            Logout
          </Button>
        </DialogActions>
      </Dialog>

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
          lastTimestamp={device?.latest_data?.timestamp || lastSeen?.toISOString()}
          deviceStartTimeInfo={deviceStartTimeInfo}
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