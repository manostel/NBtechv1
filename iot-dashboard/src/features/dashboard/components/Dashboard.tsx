import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
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
  useTheme,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useMediaQuery
} from "@mui/material";
import { 
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
  ShowChart as ShowChartIcon,
  Map as MapIcon,
  Notifications as NotificationsIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon
} from '@mui/icons-material';
// @ts-ignore
import SettingsDrawer from "./SettingsDrawer";
// @ts-ignore
import DeviceInfoCard from "../../devices/components/DeviceInfoCard";
import DashboardSkeleton from "./DashboardSkeleton";
import DashboardChartsTab from './DashboardChartsTab';
import DashboardCommandsTab from './DashboardCommandsTab';
import DashboardOverviewTab from './DashboardOverviewTab';
import DashboardAlarmsTab from './DashboardAlarmsTab';
import DashboardSubscriptionsTab from './DashboardSubscriptionsTab';
import DeviceNotificationService from '../../../utils/DeviceNotificationService';
import NotificationService from '../../../utils/NotificationService';
import { useGlobalTimer } from '../../../hooks/useGlobalTimer';
import { Device, User, MetricsConfig, DeviceData } from '../../../types';
import './Dashboard.css';

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

const DASHBOARD_DATA_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
const DASHBOARD_LATEST_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-latest";
const STATUS_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/data-dashboard-state";
const VARIABLES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-variables";
const COMMAND_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/send-command";
const BATTERY_STATE_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-battery-state";
const FETCH_ALARMS_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-alarms";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 0, px: { xs: 0, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

interface DashboardProps {
  user: User;
  device: Device | null;
  onLogout: () => void;
  onBack: () => void;
}

export default function Dashboard2({ user, device, onLogout, onBack }: DashboardProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  // @ts-ignore
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Global timer hook
  const { updateDeviceStatus, getDeviceStatus } = useGlobalTimer();
  const [selectedTab, setSelectedTab] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [deviceState, setDeviceState] = useState<DeviceData | null>(null);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [chartConfig, setChartConfig] = useState({
    showPoints: false,
    showGrid: true
  });
  const [metricsConfig, setMetricsConfig] = useState<MetricsConfig | null>(null);
  const [variablesLoaded, setVariablesLoaded] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [alertThresholds, setAlertThresholds] = useState<any>({
    temperature: { min: 10, max: 30 },
    humidity: { min: 30, max: 70 },
    battery: { min: 20 },
    signal: { min: 30 }
  });

  // Add error state
  const [error, setError] = useState<string | null>(null);

  // API & IoT data states
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  
  // UI visibility states
  const [showBatterySignal, setShowBatterySignal] = useState(true);
  const [showClientId, setShowClientId] = useState(false);

  // State tracking
  const [pendingChanges, setPendingChanges] = useState<{ timeRange: string | null, variables: string[] | null }>({
    timeRange: null,
    variables: null
  });

  const [batteryState, setBatteryState] = useState('idle');

  // Add a ref to track if we're already fetching
  const isFetching = useRef(false);

  // State for logout confirmation dialog
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // State for device start time and uptime
  const [deviceStartTimeInfo, setDeviceStartTimeInfo] = useState<any>(null);

  // Add new state variable for last status change
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  // Add cleanup ref for component unmount
  const isMounted = useRef(true);

  // Separate state for overview tab
  const [selectedVariablesOverview, setSelectedVariablesOverview] = useState<string[]>([]);
  
  // Shared state for charts and statistics tabs
  const [selectedVariablesChartsStats, setSelectedVariablesChartsStats] = useState<string[]>([]);
  
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);

  useEffect(() => {
    if (metricsConfig) {
      const variables = Object.keys(metricsConfig);
      setAvailableVariables(variables);
      setSelectedVariablesChartsStats(variables);
      setSelectedVariablesOverview(variables);
    }
  }, [metricsConfig]);

  const handleVariableChange = (event: any, isOverview = false) => {
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
      const newMetricsConfig: MetricsConfig = {};
      result.variables.forEach((variable: string) => {
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
    } catch (error: any) {
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
          // @ts-ignore
          return fetchBatteryState(retryCount + 1);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result || typeof result.battery_state !== 'string') {
        console.error('Invalid response format from battery state API:', result);
        throw new Error('Invalid response format from battery state API');
      }

      // Only update battery state if it's different
      if (batteryState !== result.battery_state) {
        setBatteryState(result.battery_state);
      }
    } catch (error: any) {
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

      if (result.data_latest && Array.isArray(result.data_latest) && result.data_latest.length > 0) {
        const latestData = result.data_latest[0];
        const summary = result.summary_latest || {};

        // Use global timer for status monitoring
        const deviceData = {
          latest_data: latestData
        } as DeviceData;
        
        console.log(`Dashboard: Updating device ${device.client_id} with data:`, deviceData);
        
        // Update device status using global timer
        updateDeviceStatus(device.client_id, deviceData);
        
        // Get the current status from global timer
        const newStatus = getDeviceStatus(device.client_id);
        
        console.log(`Dashboard: Device ${device.client_id} status from global timer: ${newStatus}`);
        
        // Update local state
        setDeviceStatus(newStatus);
        
        // Update metrics data with latest values
        setMetricsData((prevData: any) => ({
          ...prevData,
          data_latest: result.data_latest,
          summary_latest: summary
        }));

        // Update device info
        setLastSeen(new Date(latestData.timestamp));
        
        // Set device name and type from the latest data - removed local state updates for these as they are not used directly here
      }
    } catch (error: any) {
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
          points: timeRange === 'live' ? 60 :
                 timeRange === '15m' ? 15 :
                 timeRange === '1h' ? 60 :
                 timeRange === '2h' ? 120 :
                 timeRange === '4h' ? 240 :
                 timeRange === '6h' ? 360 :
                 timeRange === '8h' ? 480 :
                 timeRange === '16h' ? 960 :
                 timeRange === '24h' ? 288 :
                 timeRange === '3d' ? 432 :
                 timeRange === '7d' ? 336 :
                 timeRange === '30d' ? 720 :
                 60,
          include_state: true,
          selected_variables: variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Process the data to round all numeric values to 2 decimal places
        const processedData = result.data.map((item: any) => {
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
    } catch (error: any) {
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
      console.error('❌ No device or client_id available');
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
      
      if (deviceState) {
        setDeviceState(deviceState);
        return deviceState;
      } else {
        console.warn('⚠️ No device state found for device:', device.client_id);
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error fetching device state:', error);
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.warn('⚠️ CORS error - Lambda might not be deployed to this API Gateway');
      }
      setError(error.message || 'Failed to fetch device state');
      return null;
    }
  };

  const fetchAlarms = async () => {
    if (!device?.client_id) return;
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
      setAlarms(data.alarms || []);
      setTriggeredAlarms(data.triggered_alarms || []);
    } catch (err: any) {
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
      await fetchVariables();
      
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
      
    } catch (error: any) {
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

  // Initialize notifications and fetch initial data
  useEffect(() => {
    if (device && device.client_id) {
      const initialize = async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
          // Initialize notifications first
          await DeviceNotificationService.initialize();
          
          // Then fetch all other data
          await fetchInitialData();
          await fetchBatteryState();
          await fetchAlarms();
          await fetchDeviceStartTimeInfo();
        } catch (error: any) {
          console.error('Error during initialization:', error);
          setError(error.message || 'Failed to initialize dashboard');
        } finally {
          isFetching.current = false;
        }
      };

      initialize();
      
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
      }, 60000); // 1 minute for latest data and device state (reduced frequency)

      const batteryStateInterval = setInterval(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
          await fetchBatteryState();
        } finally {
          isFetching.current = false;
        }
      }, 300000); // 5 minutes for battery state (reduced frequency)

      // Cleanup intervals on unmount
      return () => {
        clearInterval(latestDataInterval);
        clearInterval(batteryStateInterval);
      };
    }
  }, [device]);

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('Dashboard tab changed to:', newValue);
    setSelectedTab(newValue);
  };

  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
    setPendingChanges(prev => ({
      ...prev,
      timeRange: newTimeRange
    }));
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleChartConfigChange = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setChartConfig(prev => ({
      ...prev,
      [key]: event.target.checked
    }));
  };

  const handleAlertThresholdChange = (metric: string, type: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setAlertThresholds((prev: any) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [type]: parseFloat(event.target.value)
      }
    }));
  };

  const handleSnackbarClose = (event: any, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Single, complete version of onCommandSend
  const onCommandSend = async (command: string, params = {}) => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return; // Return type is void
    }

    try {
      setIsLoading(true);
      const response = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          command: command,
          params: params
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send command');
      }

      const data = await response.json();

      // Notify successful command execution
      DeviceNotificationService.notifyCommandExecuted(device, command, true);

      setSnackbar({
        open: true,
        message: 'Command sent successfully',
        severity: 'success'
      });

      // Refresh device state after command
      await fetchDeviceState();
    } catch (error) {
      console.error('Error sending command:', error);
      
      // Notify failed command execution
      DeviceNotificationService.notifyCommandExecuted(device, command, false);
      
      setSnackbar({
        open: true,
        message: 'Failed to send command',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
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
                 timeRange === '2h' ? 120 :
                 timeRange === '4h' ? 240 :
                 timeRange === '6h' ? 360 :
                 timeRange === '8h' ? 480 :
                 timeRange === '16h' ? 960 :
                 timeRange === '24h' ? 288 :
                 timeRange === '3d' ? 432 :
                 timeRange === '7d' ? 336 :
                 timeRange === '30d' ? 720 :
                 60,
          include_state: true,
          selected_variables: selectedVariablesChartsStats
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        // Update the metrics data while preserving latest data
        setMetricsData((prevData: any) => ({
          ...prevData,
          data: result.data,
          summary: result.summary || {}
        }));
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = (tabValue: number) => {
    console.log('renderTabContent called with tabValue:', tabValue);
    switch (tabValue) {
      case 0:
        return (
          <DashboardOverviewTab
            metricsData={metricsData}
            metricsConfig={metricsConfig!}
            selectedVariables={selectedVariablesOverview}
            availableVariables={availableVariables}
            deviceState={deviceState}
            isLoading={isLoading}
            onVariableChange={e => handleVariableChange(e, true)}
            triggeredAlarms={triggeredAlarms}
            deviceStartTimeInfo={deviceStartTimeInfo}
            device={device}
            user={user}
          />
        );
      case 1:
        return (
          <DashboardChartsTab
            metricsData={metricsData}
            metricsConfig={metricsConfig!}
            timeRange={timeRange}
            chartConfig={chartConfig}
            selectedVariables={selectedVariablesChartsStats}
            availableVariables={availableVariables}
            onVariableChange={e => handleVariableChange(e, false)}
            onTimeRangeChange={(e) => handleTimeRangeChange(e.target.value)}
            onApply={handleApply}
          />
        );
      case 2:
        return (
          <DashboardCommandsTab
            device={device}
            deviceState={deviceState}
            onCommandSend={onCommandSend}
            commandHistory={commandHistory}
            setCommandHistory={setCommandHistory}
            metricsConfig={metricsConfig!}
            metricsData={metricsData}
            setSnackbar={setSnackbar}
            fetchDeviceState={fetchDeviceState}
          />
        );
      case 3:
        return (
          <DashboardAlarmsTab
            device={device!}
            metricsConfig={metricsConfig!}
            onAlarmToggle={fetchAlarms}
          />
        );
      case 4:
        console.log('Rendering DashboardSubscriptionsTab with props:', { device, user, onNotification: setSnackbar });
        return (
          <DashboardSubscriptionsTab
            device={device!}
            user={user}
            onNotification={setSnackbar}
          />
        );
      default:
        return null;
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    try {
      // Trigger a refresh of all dashboard data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
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
      
      const response = await fetch('https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-start-time', {
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
      
      console.log('Device start time API response:', result);
      
      if (!result || (result.timestamp === undefined && result.uptime === undefined)) {
        console.warn('Invalid response format from start time API:', result);
        // Don't throw an error, just set to null or handle appropriately
        setDeviceStartTimeInfo(null);
        return;
      }

      console.log('Setting device start time info:', result);
      setDeviceStartTimeInfo(result);

    } catch (error) {
      console.error('Error fetching device start time info:', error);
      // Do not set error state for this fetch as it's not critical for the whole dashboard
      setDeviceStartTimeInfo(null);
    }
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      const notificationsEnabled = await NotificationService.initialize();
      if (!notificationsEnabled) {
      }
    };

    initializeNotifications();
  }, []);

  // Block rendering until core data is ready
  if (isLoading || !variablesLoaded || !metricsData) {
    return <DashboardSkeleton />;
  }

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        pt: 0,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #141829 0%, #1a1f3c 50%, #141829 100%)'
          : 'linear-gradient(135deg, #f5f5f5 0%, #e8f4fd 50%, #f5f5f5 100%)',
        color: theme.palette.text.primary,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Helmet>
        <title>IoT Dashboard</title>
        <meta name="description" content="IoT Dashboard with Dark Mode" />
        <style>{`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
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
        onShowBatterySignalChange={(e: any) => setShowBatterySignal(e.target.checked)}
        showClientId={showClientId}
        onShowClientIdChange={(e: any) => setShowClientId(e.target.checked)}
      />

      {/* AppBar */}
      <AppBar 
        position="static" 
        color="default" 
        elevation={2}
        sx={{
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar sx={{ 
          px: { xs: 1.5, sm: 3 }, 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minHeight: '64px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back"
              onClick={onBack}
              sx={{ 
                mr: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ 
                  fontWeight: 700,
                  fontStyle: 'italic',
                  letterSpacing: '0.5px',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #4caf50, #2196f3)'
                    : 'linear-gradient(45deg, #1976d2, #388e3c)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {device?.device_name || "Unknown"}
              </Typography>
            </Box>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                display: { xs: 'none', sm: 'block' },
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                fontWeight: 500,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              {device?.device || "N/A"}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="refresh"
              onClick={handleRefresh}
              sx={{ 
                mr: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="settings"
              onClick={handleSettingsOpen}
              sx={{ 
                mr: 1,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
            <IconButton
              edge="end"
              color="inherit"
              aria-label="logout"
              onClick={handleLogoutClick}
              sx={{ 
                mr: 0.5,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #f44336, #ff9800)',
              borderRadius: '3px 3px 0 0'
            }
          }
        }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ color: '#E0E0E0' }}>{"Confirm Logout"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
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
          p: { xs: 1, sm: 1.5 },
          flexGrow: 1,
          width: '100%',
        }}
      >
        {/* Add Snackbar component */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity} 
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Grid container spacing={1}>
          <Grid item xs={12}>
            <DeviceInfoCard
              clientID={device?.client_id || "Unknown"}
              deviceName={device?.device_name || "Unknown"}
              deviceType={device?.device_type || device?.latest_data?.device || 'Unknown'}
              status={deviceStatus || "Offline"}
              batteryLevel={metricsData?.data_latest?.[0]?.battery || 0}
              signalStrength={metricsData?.data_latest?.[0]?.signal_quality || 0}
              showClientId={showClientId}
              onToggleClientId={() => setShowClientId(!showClientId)}
              batteryState={batteryState}
              charging={deviceState?.charging}
              lastTimestamp={device?.latest_data?.timestamp || lastSeen?.toISOString()}
              deviceStartTimeInfo={deviceStartTimeInfo}
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ 
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.8) 0%, rgba(31, 37, 71, 0.9) 50%, rgba(26, 31, 60, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.9) 50%, rgba(255, 255, 255, 0.8) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.2)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.1)',
          mt: 2,
          mb: 2,
          overflowX: 'auto',
          width: 'fit-content',
          maxWidth: '100%',
          pl: { xs: 0, sm: 0 },
          pr: { xs: 0, sm: 0 },
          '&::-webkit-scrollbar': {
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(0,0,0,0.3)',
            },
          },
        }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 38, sm: 44 },
            ml: 0,
            pl: 0,
            '& .MuiTab-root': {
              minHeight: { xs: 38, sm: 46 },
              fontSize: { xs: '0.9rem', sm: '1rem' },
              textTransform: 'none',
              fontWeight: 500,
              letterSpacing: '0.2px',
              px: { xs: 1, sm: 2 },
              color: theme.palette.text.secondary,
              borderRadius: 2,
              margin: { xs: '2px', sm: '4px' },
              transition: 'all 0.3s ease',
              '&.Mui-selected': {
                color: theme.palette.mode === 'dark' ? '#4caf50' : '#1976d2',
                fontWeight: 600,
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(76, 175, 80, 0.15)'
                  : 'rgba(25, 118, 210, 0.08)',
              },
              '&:hover': {
                color: theme.palette.mode === 'dark' ? '#4caf50' : '#1976d2',
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(25, 118, 210, 0.04)',
                transform: 'translateY(-1px)'
              }
            },
            '& .MuiTabs-indicator': {
              height: '3px',
              borderRadius: '3px 3px 0 0',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, #4caf50, #2196f3)'
                : 'linear-gradient(90deg, #1976d2, #388e3c)'
            }
          }}
        >
            <Tab label="Overview" {...a11yProps(0)} />
            <Tab label="Graphs" {...a11yProps(1)} />
            <Tab label="Commands" {...a11yProps(2)} />
            <Tab label="Alarms" {...a11yProps(3)} />
            <Tab label="Subscriptions" {...a11yProps(4)} />
        </Tabs>
        </Box>


        {/* Tab Content */}
        <TabPanel value={selectedTab} index={0}>
          {renderTabContent(0)}
        </TabPanel>
        <TabPanel value={selectedTab} index={1}>
          {renderTabContent(1)}
        </TabPanel>
        <TabPanel value={selectedTab} index={2}>
          {renderTabContent(2)}
        </TabPanel>
        <TabPanel value={selectedTab} index={3}>
          {renderTabContent(3)}
        </TabPanel>
        <TabPanel value={selectedTab} index={4}>
          {renderTabContent(4)}
        </TabPanel>
      </Container>
    </Box>
  );
}

