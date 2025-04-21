import React, { useState, useEffect } from "react";
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

const API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
const STATUS_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-status";
const VARIABLES_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-variables";

export default function Dashboard2({ user, device, onLogout, onBack }) {
  const navigate = useNavigate();
  const theme = useTheme();

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

  // Chart customization state
  const [chartConfig, setChartConfig] = useState({
    showGrid: true,
    showPoints: false,
    showLines: true,
    animation: true
  });

  // Alert thresholds state
  const [alertThresholds, setAlertThresholds] = useState({
    temperature: { min: 10, max: 30 },
    humidity: { min: 30, max: 70 },
    battery: { min: 20 },
    signal: { min: 30 }
  });

  // Metrics data and config state
  const [metricsData, setMetricsData] = useState({});
  const [metricsConfig, setMetricsConfig] = useState({});

  // Summary type state
  const [summaryType, setSummaryType] = useState('latest');

  // UI visibility states
  const [showBatterySignal, setShowBatterySignal] = useState(true);
  const [showClientId, setShowClientId] = useState(false);

  // Time range menu state
  const [timeRangeAnchor, setTimeRangeAnchor] = useState(null);

  // Data range warning state
  const [dataRangeWarning, setDataRangeWarning] = useState(null);

  // Initialization state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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

  // Tab tracking state
  const [prevTabValue, setPrevTabValue] = useState(0);

  // Device state
  const [deviceState, setDeviceState] = useState({
    led1_state: 0,
    led2_state: 0,
    motor_speed: 0,
    timestamp: null
  });

  // Add this near the other state declarations
  const [variablesLoaded, setVariablesLoaded] = useState(false);

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

  const fetchData = async () => {
    if (!device || !device.client_id) {
      console.error('No device or client_id available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching dashboard data for device:', device);
      
      // Calculate points based on time range
      const points = timeRange === 'live' ? 20 : 
                    timeRange === '15m' ? 15 : 
                    timeRange === '1h' ? 60 :
                    timeRange === '2h' ? 120 :
                    timeRange === '4h' ? 240 :
                    timeRange === '8h' ? 480 :
                    timeRange === '16h' ? 960 :
                    timeRange === '24h' ? 1440 : 100;

      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.client_id,
        user_email: user.email,
        time_range: timeRange,
        points: points,
        include_state: true
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 
        timeRange === 'live' ? 5000 : 8000
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

      if (Array.isArray(data) && data.length > 0) {
        // Process data based on available metrics from metricsConfig
        const newMetricsData = {};
        Object.keys(metricsConfig).forEach(key => {
          newMetricsData[key] = data.map(entry => ({
            timestamp: entry.timestamp,
            value: parseFloat(entry[key])
          }));
        });

        setMetricsData(newMetricsData);

        // Update last seen
        const lastTimestamp = new Date(data[data.length - 1].timestamp);
        setLastSeen(lastTimestamp);
        
        // Update device status
        const timeDiffSeconds = (new Date() - lastTimestamp) / 1000;
        setDeviceStatus(timeDiffSeconds <= 120 ? "Active" : "Inactive");

        // Update device state from the same response
        if (result.state) {
          setDeviceState(result.state);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the useEffect hooks
  useEffect(() => {
    if (device && device.client_id) {
      fetchVariables();
    }
  }, [device]);

  useEffect(() => {
    if (variablesLoaded) {
      fetchData();
    }
  }, [timeRange, variablesLoaded]);

  // Update the live polling useEffect
  useEffect(() => {
    let intervalId;
    if (timeRange === 'live' && variablesLoaded) {
      intervalId = setInterval(fetchData, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeRange, variablesLoaded]);

  const handleCloseError = () => {
    setError(null);
  };

  // Event handlers
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
    handleTimeRangeClose();
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
    // Add command sending logic here
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

  const renderSummaryCards = () => {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metricsConfig).map(([key, config]) => {
          // Skip client_id
          if (key === 'client_id' || key === 'ClientID') return null;
          
          // Skip signal and battery metrics unless showBatterySignal is true
          if ((key === 'signal' || key === 'battery' || key === 'signal_quality') && !showBatterySignal) return null;

          // Get the appropriate value based on summaryType
          let value;
          if (summaryType === 'latest') {
            // Get the last value from the metrics data
            const lastDataPoint = metricsData[key]?.[metricsData[key]?.length - 1];
            value = lastDataPoint?.value;
          } else {
            value = summary[`${summaryType}_${key}`] || summary[key];
          }
          
          const displayValue = value !== undefined && !isNaN(value) ? value.toFixed(1) : 'N/A';
          
          return (
            <Grid item xs={6} sm={6} md={3} key={key}>
              <Paper 
                elevation={1}
                sx={{ 
                  p: { xs: 1.5, sm: 2 },
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
                  <Typography variant="subtitle1" color="primary">
                    {config.label}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {displayValue}{value !== undefined && !isNaN(value) ? config.unit : ''}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summaryType === 'latest' ? 'Latest' :
                   summaryType === 'avg' ? 'Average' :
                   summaryType === 'min' ? 'Minimum' :
                   'Maximum'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
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

  const renderChart = (data, metricKey) => {
    const config = metricsConfig[metricKey];
    if (!config || !data || !Array.isArray(data) || data.length === 0) {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: theme.palette.text.secondary
        }}>
          <Typography variant="body2">No data available</Typography>
        </Box>
      );
    }

    const chartData = {
      labels: data.map(d => d.timestamp),
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data: data.map(d => d.value),
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
          text: config.label, 
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
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}${config.unit}`;
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
        }
      },
      scales: {
        x: {
          type: "time",
          time: { 
            unit: timeRange === 'live' ? 'second' :
                  timeRange === '15m' ? 'minute' :
                  timeRange === '1h' ? 'minute' :
                  timeRange === '24h' || timeRange === '2d' || timeRange === '3d' ? 'hour' : 'minute',
            tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                          (timeRange === '24h' || timeRange === '2d' || timeRange === '3d') ? "MMM dd, HH:mm" : "HH:mm",
            displayFormats: {
              second: 'HH:mm:ss',
              minute: 'HH:mm',
              hour: 'MMM dd, HH:mm',
              day: 'MMM dd'
            }
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
            maxTicksLimit: timeRange === '15m' ? 15 : 
                          timeRange === 'live' ? 4 : 10,
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
            maxTicksLimit: window.innerWidth < 600 ? 5 : 10,
            callback: function(value) {
              return value + config.unit;
            }
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

    return (
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Line 
          data={chartData} 
          options={chartSpecificOptions} 
          ref={chartEl => {
            if (chartEl) {
              chartRef.current = chartEl;
            }
          }} 
        />
      </Box>
    );
  };

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
      <AppBar 
        position="static" 
        color="primary" 
        elevation={0}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          width: '100%',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {device?.device_name || 'Device Dashboard'}
          </Typography>
          <IconButton
            color="inherit"
            onClick={() => setSettingsOpen(true)}
            sx={{ mr: 1 }}
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={onLogout}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth={false} 
        disableGutters 
        sx={{ 
          p: { xs: 2, sm: 3 },
          flexGrow: 1,
          width: '100%'
        }}
      >
        {/* Device Info Card */}
        <DeviceInfoCard
          clientID={device.client_id}
          deviceName={device.device_name}
          deviceType={device.device_type || device.latest_data?.device || 'Unknown'}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : 
            device.latest_data?.timestamp ? new Date(device.latest_data.timestamp).toLocaleString() : "N/A"}
          batteryLevel={metricsData.battery?.[metricsData.battery.length - 1]?.value}
          signalStrength={metricsData.signal_quality?.[metricsData.signal_quality.length - 1]?.value}
          showClientId={showClientId}
          onToggleClientId={() => setShowClientId(!showClientId)}
        />

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
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
              p: 1.5,
              mb: 2,
              bgcolor: theme.palette.background.paper,
              '& .MuiButton-root': {
                minHeight: 28,
                minWidth: 'auto'
              },
              '& .MuiFormControlLabel-root': {
                mr: { xs: 0, sm: 1 },
                '& .MuiTypography-root': {
                  fontSize: '0.75rem'
                }
              }
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                alignItems: 'center' 
              }}>
                <TimeRangeMenu
                  timeRange={timeRange}
                  setTimeRange={handleTimeRangeChange}
                  timeRanges={[
                    { value: 'live', label: 'Live' },
                    { value: '15m', label: '15 min' },
                    { value: '1h', label: '1 hour' },
                    { value: '2h', label: '2 hours' },
                    { value: '4h', label: '4 hours' },
                    { value: '8h', label: '8 hours' },
                    { value: '16h', label: '16 hours' },
                    { value: '24h', label: '24 hours' }
                  ]}
                />
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
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Device Commands</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchData}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
            <DashboardCommands
              deviceState={deviceState}
              setDeviceState={setDeviceState}
              toggle1={toggle1}
              toggle2={toggle2}
              speedInput={speedInput}
              onToggle1Change={handleToggle1Change}
              onToggle2Change={handleToggle2Change}
              onSpeedInputChange={handleSpeedInputChange}
              onSpeedInputSubmit={handleSpeedInputSubmit}
            />
          </Paper>
        )}

        {/* History Tab */}
        {tabValue === 2 && (
          <Paper sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data History</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setDatePickerOpen(true)}
                >
                  Select Date
                </Button>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={handleExportClick}
                >
                  Export
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportClose}
                >
                  <MenuItem onClick={() => { handleExportData(); handleExportClose(); }}>
                    Export as CSV
                  </MenuItem>
                  <MenuItem onClick={() => { handleExportData('json'); handleExportClose(); }}>
                    Export as JSON
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
            <DashboardHistory
              metricsData={metricsData}
              metricsConfig={metricsConfig}
              selectedDate={selectedDate}
              timeWindow={timeWindow}
              onDateChange={handleDateChange}
              onTimeWindowChange={handleTimeWindowChange}
            />
          </Paper>
        )}
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