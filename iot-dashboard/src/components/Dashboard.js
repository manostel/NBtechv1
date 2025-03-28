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
  FaChartPie,
  FaThermometerHalf,
  FaTint,
  FaBatteryThreeQuarters,
  FaSignal
} from "react-icons/fa";
import { MdRefresh, MdSettings } from "react-icons/md";
import { Logout as LogoutIcon, ArrowBack as ArrowBackIcon, Visibility, VisibilityOff } from '@mui/icons-material';
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

// Remove the static METRICS_CONFIG and replace with a function to generate config
const generateMetricConfig = (key) => {
  // Default configurations for known metrics
  const defaultConfigs = {
    temperature: {
      label: "Temperature",
      unit: "\u00B0C",
      color: "#FF6B6B",
      icon: <FaThermometerHalf />,
      alertThresholds: { min: 10, max: 30 },
      summaryKey: 'temperature'
    },
    humidity: {
      label: "Humidity",
      unit: "%",
      color: "#4ECDC4",
      icon: <FaTint />,
      alertThresholds: { min: 30, max: 70 },
      summaryKey: 'humidity'
    },
    battery: {
      label: "Battery",
      unit: "%",
      color: "#FFD93D",
      icon: <FaBatteryThreeQuarters />,
      alertThresholds: { min: 20 },
      summaryKey: 'battery_level'
    },
    signal: {
      label: "Signal",
      unit: "%",
      color: "#6C5CE7",
      icon: <FaSignal />,
      alertThresholds: { min: 30 },
      summaryKey: 'signal_quality',
      dataKey: 'signal_quality'
    },
    signal_quality: {
      label: "Signal",
      unit: "%",
      color: "#6C5CE7",
      icon: <FaSignal />,
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
  const [showBatterySignal, setShowBatterySignal] = useState(false);

  // Add new state for clientID visibility
  const [showClientId, setShowClientId] = useState(false);

  // Add the new state for time range menu
  const [timeRangeAnchor, setTimeRangeAnchor] = useState(null);

  // Add this near your other state declarations
  const [dataRangeWarning, setDataRangeWarning] = useState(null);

  const API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";
  const COMMAND_API_URL = "https://61dd7wovqk.execute-api.eu-central-1.amazonaws.com/default/send-command";

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!device || !device.device_id) {
      console.log('No device or device_id available');
      return;
    }

    try {
      console.log('Fetching dashboard data for device:', device);
      const requestBody = {
        action: 'get_dashboard_data',
        client_id: device.device_id,
        user_email: user.email,
        time_range: timeRange,
        points: timeRange === 'live' ? 20 : 100,  // 20 points for live (1 per 6 seconds over 2 minutes)
        live_seconds: timeRange === 'live' ? 120 : null  // Specify 2-minute range for live data
      };

      // Adjust timeout for live data to match publication rate
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 
        timeRange === 'live' ? 8000 : 8000  // Use same timeout for both since data rate is the same
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
        
        showSnackbar(`Limited historical data: ${Math.round(dataRangeHours)} hours available`, 'warning');
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
          if (key !== 'timestamp') {
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
        setClientID(device.device_id);
        setDeviceName(device.device_name || "Unknown");

        // Update last seen and status with time range consideration
        const lastTimestamp = timestamps[timestamps.length - 1];
        setLastSeen(lastTimestamp);
        const now = new Date();
        const timeDiff = (now - lastTimestamp) / 1000;

        // Update status threshold based on time range
        let statusThreshold;
        switch(timeRange) {
          case '3d':  // Changed from 7d to 3d
            statusThreshold = 24 * 60 * 60; // 24 hours threshold
            break;
          case '24h':
            statusThreshold = 2 * 60 * 60; // 2 hours threshold
            break;
          default:
            statusThreshold = 120; // 2 minutes threshold for shorter ranges
        }

        // Only update status for recent time ranges
        if (timeRange === '15m' || timeRange === '1h') {
          setDeviceStatus(timeDiff <= statusThreshold ? "Active" : "Inactive");
        } else {
          // For longer time ranges, use the last known status
          const lastDataPoint = data[data.length - 1];
          const lastTimeDiff = (now - new Date(lastDataPoint.timestamp)) / 1000;
          setDeviceStatus(lastTimeDiff <= statusThreshold ? "Active" : "Inactive");
        }

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
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setDeviceStatus("Error");
      
      if (error.name === 'AbortError') {
        if (timeRange === 'live') {
          console.log('Live data fetch timeout - will retry on next interval');
        } else {
          showSnackbar('Request timeout - try a shorter time range', 'error');
        }
      } else {
        showSnackbar('Error fetching data. Please try again.', 'error');
      }
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

  // Modify the refresh handler to not set loading state
  const handleRefresh = () => {
    fetchData();
  };

  // Update the useEffect for live data interval
  useEffect(() => {
    console.log('Dashboard mounted with device:', device);
    if (device && device.device_id) {
      console.log('Fetching initial data...');
      fetchData();
      
      // Set up intervals for data fetching
      const liveInterval = setInterval(() => {
        if (timeRange === 'live') {
          fetchData();
        }
      }, 60000); // Keep minute interval since that's when new data is published
      
      const historicalInterval = setInterval(() => {
        if (timeRange !== 'live') {
          fetchData();
        }
      }, 60000);

      return () => {
        clearInterval(liveInterval);
        clearInterval(historicalInterval);
      };
    }
  }, [device, timeRange]);

  // Update the getTimeRangeLabel function
  const getTimeRangeLabel = (range) => {
    switch(range) {
      case 'live': return 'Live (30s)';  // Updated to show time range
      case '15m': return '15 Minutes';
      case '1h': return '1 Hour';
      case '24h': return '24 Hours';
      default: return 'Live (30s)';
    }
  };

  // Update the renderTimeRangeMenu function
  const renderTimeRangeMenu = () => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', borderRight: 1, borderColor: 'divider', pr: 2 }}>
      <Button
        variant="outlined"
        startIcon={<MdRefresh />}
        onClick={handleRefresh}
        disabled={isLoading}
        sx={{ minWidth: 120 }}
      >
        Refresh Data
      </Button>
      <Button
        variant="outlined"
        onClick={(e) => setTimeRangeAnchor(e.currentTarget)}
        sx={{ minWidth: 120 }}
      >
        {getTimeRangeLabel(timeRange)}
      </Button>
      <Menu
        anchorEl={timeRangeAnchor}
        open={Boolean(timeRangeAnchor)}
        onClose={() => setTimeRangeAnchor(null)}
      >
        <MenuItem 
          onClick={() => {
            setTimeRange('live');
            setTimeRangeAnchor(null);
          }}
          selected={timeRange === 'live'}
        >
          Live (30s)
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setTimeRange('15m');
            setTimeRangeAnchor(null);
          }}
          selected={timeRange === '15m'}
        >
          15 Minutes
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setTimeRange('1h');
            setTimeRangeAnchor(null);
          }}
          selected={timeRange === '1h'}
        >
          1 Hour
        </MenuItem>
        <MenuItem 
          onClick={() => {
            setTimeRange('24h');
            setTimeRangeAnchor(null);
          }}
          selected={timeRange === '24h'}
        >
          24 Hours
        </MenuItem>
      </Menu>
    </Box>
  );

  // Update the chart options to properly handle 2-minute window and last point animation
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top", 
        labels: { color: theme.palette.text.primary },
        display: true
      },
      title: { 
        display: true, 
        text: "Real-time IoT Data", 
        color: theme.palette.text.primary,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1);
              if (label.includes('Temperature')) {
                label += '\u00B0C';
              } else if (label.includes('Humidity') || 
                       label.includes('Battery') || 
                       label.includes('Signal')) {
                label += '%';
              }
            }
            return label;
          }
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
                timeRange === '24h' ? 'hour' : 'minute',
          tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : "HH:mm",
          displayFormats: {
            second: 'HH:mm:ss',
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
          // Force the exact time range for live mode
          min: timeRange === 'live' ? new Date(Date.now() - 120 * 1000) : undefined,
          max: timeRange === 'live' ? new Date() : undefined,
          bounds: 'ticks'
        },
        title: { 
          display: true, 
          text: "Time", 
          color: theme.palette.text.primary,
          font: { weight: 'bold' }
        },
        ticks: {
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 8
        },
        grid: {
          display: timeRange === 'live' ? true : chartConfig.showGrid
        }
      },
      y: {
        beginAtZero: true,
        ticks: { 
          color: theme.palette.text.primary
        },
        grid: { 
          color: chartConfig.showGrid ? "rgba(255,255,255,0.1)" : "transparent",
          drawBorder: false
        },
      },
    },
    elements: {
      point: {
        radius: timeRange === 'live' ? 3 : 0,
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
          pointRadius: timeRange === 'live' ? 3 : 0,
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

    if (chartType === 'line') {
      return <Line data={chartData} options={chartSpecificOptions} />;
    } else if (chartType === 'bar') {
      return <Bar data={chartData} options={chartSpecificOptions} />;
    }
    return null;
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

  // Update the renderSummaryCards function to handle 'latest' type
  const renderSummaryCards = () => {
    console.log('Rendering summary cards with:', {
      metricsConfig,
      summary,
      summaryType
    });

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(metricsConfig).map(([key, config]) => {
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
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: theme.palette.background.paper,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {config.icon}
                  <Typography variant="h6" color="primary">
                    {config.label}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
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

  // Update the renderCharts function to also check for signal_quality
  const renderCharts = () => (
    <Grid container spacing={3}>
      {Object.entries(metricsConfig).map(([key, config]) => {
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
          
          {/* Updated Title Section - removed clientID visibility toggle */}
          <Typography variant="h6" sx={{ fontWeight: "bold", textAlign: "center" }}>
            {deviceName || "Unknown Device"}
          </Typography>

          <Box sx={{ position: "absolute", right: 16, display: "flex", alignItems: "center", gap: 1 }}>
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
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <DeviceInfoCard
          clientID={clientID}
          device={deviceName}
          status={deviceStatus}
          lastOnline={lastSeen ? lastSeen.toLocaleString() : "N/A"}
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
          <Tab label="Overview" icon={<FaChartLine />} iconPosition="start" />
          <Tab label="Commands" icon={<FaCog />} iconPosition="start" />
          <Tab label="History" icon={<FaHistory />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <>
            {/* Controls Bar */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: theme.palette.background.paper }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                {/* Group 1: Data Controls */}
                {renderTimeRangeMenu()}

                {/* Group 2: Chart Controls */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', borderRight: 1, borderColor: 'divider', pr: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={(e) => setChartMenuAnchor(e.currentTarget)}
                    startIcon={<FaChartLine />}
                    sx={{ minWidth: 120 }}
                  >
                    Chart Options
                  </Button>
                  <Menu
                    anchorEl={chartMenuAnchor}
                    open={Boolean(chartMenuAnchor)}
                    onClose={() => setChartMenuAnchor(null)}
                  >
                    <MenuItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={chartConfig.showGrid}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                          />
                        }
                        label="Show Grid"
                      />
                    </MenuItem>
                    <MenuItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={chartConfig.showPoints}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showPoints: e.target.checked }))}
                          />
                        }
                        label="Show Points"
                      />
                    </MenuItem>
                    <MenuItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={chartConfig.animation}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, animation: e.target.checked }))}
                          />
                        }
                        label="Enable Animation"
                      />
                    </MenuItem>
                    <Divider />
                    <MenuItem>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showBatterySignal}
                            onChange={(e) => setShowBatterySignal(e.target.checked)}
                          />
                        }
                        label="Show Battery & Signal"
                      />
                    </MenuItem>
                  </Menu>
                </Box>

                {/* Group 3: Summary Type Controls */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={cycleSummaryType}
                    startIcon={<FaChartLine />}
                    sx={{ 
                      minWidth: 120,
                      textTransform: 'capitalize'
                    }}
                  >
                    {summaryType === 'latest' ? 'Latest' :
                     summaryType === 'avg' ? 'Average' :
                     summaryType === 'min' ? 'Minimum' :
                     'Maximum'}
                  </Button>
                </Box>

                {/* Additional Controls */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="textSecondary">
                    {`${summary.data_points} points shown (from ${summary.original_points} readings)`}
                    {summary.interval_seconds > 60 && (
                      <span> • {Math.floor(summary.interval_seconds / 60)} minute intervals</span>
                    )}
                  </Typography>
                </Box>
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
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
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
                <Button 
                  variant="contained" 
                  onClick={handleRestart}
                  startIcon={<MdRefresh />}
                  sx={{ 
                    bgcolor: theme.palette.secondary.main,
                    "&:hover": { bgcolor: theme.palette.secondary.dark }
                  }}
                >
                  Restart Device
                </Button>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Set Speed"
                    value={speedInput}
                    onChange={(e) => setSpeedInput(e.target.value)}
                    sx={{
                      width: 120,
                      bgcolor: theme.palette.background.default,
                      input: { color: theme.palette.text.primary },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
                    }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSendSpeed}
                    disabled={!speedInput.trim()}
                    sx={{ 
                      bgcolor: theme.palette.primary.main,
                      "&:hover": { bgcolor: theme.palette.primary.dark }
                    }}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
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
                          color: cmd.status === 'success' ? 'success.main' : 'error.main',
                          bgcolor: cmd.status === 'success' ? 'success.light' : 'error.light',
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
    </Box>
  );
}
