import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper, 
  useTheme,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  NotificationsOff as NotificationsOffIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import NotificationService from '../../utils/NotificationService';

// API endpoints
const MANAGE_ALARMS_API_URL = "https://ueqnh8082k.execute-api.eu-central-1.amazonaws.com/default/manage-alarms";
const FETCH_ALARMS_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-alarms";

// Default metrics configuration
const defaultMetricsConfig = {
  battery: { label: 'Battery', unit: '%' },
  temperature: { label: 'Temperature', unit: '°C' },
  humidity: { label: 'Humidity', unit: '%' },
  pressure: { label: 'Pressure', unit: 'hPa' },
  signal_quality: { label: 'Signal Quality', unit: '%' },
  thermistor_temp: { label: 'Thermistor Temperature', unit: '°C' }
};

const DashboardAlarmsTab = ({ device, metricsConfig = defaultMetricsConfig, onAlarmToggle }) => {
  const theme = useTheme();
  const [alarms, setAlarms] = useState([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState([]);
  const [newAlarmDialog, setNewAlarmDialog] = useState(false);
  const [editAlarmDialog, setEditAlarmDialog] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAlarmId, setLoadingAlarmId] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isInitializing, setIsInitializing] = useState(true);
  const lastAlarmNotificationRef = useRef({});
  const [newAlarm, setNewAlarm] = useState({
    variable_name: '',
    condition: 'above',
    threshold: '',
    description: '',
    enabled: true,
    severity: 'warning'
  });
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    variable: 'all'
  });
  const [triggeredFilters, setTriggeredFilters] = useState({
    severity: 'all',
    variable: 'all',
    timeRange: 'all'
  });

  const fetchAlarms = useCallback(async () => {
    if (!device?.client_id) {
      return;
    }

    try {
      setIsLoading(true);
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
        throw new Error(`Failed to fetch alarms: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('No data received from server');
      }

      // Check for newly triggered alarms with debounce
      const previousTriggeredIds = new Set(triggeredAlarms.map(a => a.alarm_id));
      const now = Date.now();
      const newTriggeredAlarms = (data.triggered_alarms || []).filter(alarm => {
        const isNew = !previousTriggeredIds.has(alarm.alarm_id);
        const lastNotification = lastAlarmNotificationRef.current[alarm.alarm_id] || 0;
        const timeSinceLastNotification = now - lastNotification;
        const shouldNotify = isNew && timeSinceLastNotification > 180000; // 3 minutes debounce
        
        if (shouldNotify) {
          lastAlarmNotificationRef.current[alarm.alarm_id] = now;
        }
        
        return shouldNotify;
      });
      
      // Show notifications for newly triggered alarms
      for (const alarm of newTriggeredAlarms) {
        try {
          await NotificationService.showAlarmNotification(alarm);
        } catch (error) {
          console.error('Error showing notification for alarm:', error);
        }
      }
      
      setAlarms(data.alarms || []);
      setTriggeredAlarms(data.triggered_alarms || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching alarms:', err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: 'Failed to fetch alarms. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [device?.client_id]);

  useEffect(() => {
    const initializeNotifications = async () => {
      const notificationsEnabled = await NotificationService.initialize();
      if (!notificationsEnabled) {
      }
    };

    initializeNotifications();
  }, []);

  const handleAlarmTriggered = useCallback((alarm) => {
    setTriggeredAlarms(prev => {
      const exists = prev.some(a => a.alarm_id === alarm.alarm_id);
      if (!exists) {
        NotificationService.showAlarmNotification(alarm);
        return [...prev, alarm];
      }
      return prev;
    });
  }, []);

  // Fetch alarms on component mount and when device changes
  useEffect(() => {
    let isMounted = true;

    const initializeAlarms = async () => {
      if (!device?.client_id) {
        return;
      }

      try {
        setIsInitializing(true);
        // Fetch alarms
        if (isMounted) {
          await fetchAlarms();
        }
      } catch (error) {
        console.error('Error initializing alarms:', error);
        if (isMounted) {
          setSnackbar({
            open: true,
            message: 'Failed to initialize alarms.',
            severity: 'error'
          });
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAlarms();

    return () => {
      isMounted = false;
    };
  }, [device?.client_id, fetchAlarms]);

  const handleAddAlarm = async () => {
    if (!newAlarm.variable_name || !newAlarm.threshold) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(MANAGE_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          operation: 'create',
          alarm: {
            ...newAlarm,
            threshold: parseFloat(newAlarm.threshold)
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create alarm');
      }

      // Update local state directly instead of refetching
      const newAlarmData = {
        alarm_id: `temp_${Date.now()}`, // Temporary ID, will be updated on next fetch
        ...newAlarm,
        threshold: parseFloat(newAlarm.threshold)
      };
      setAlarms(prevAlarms => [...prevAlarms, newAlarmData]);
      
      // Call the callback to refresh alarms in parent component
      if (onAlarmToggle) {
        onAlarmToggle();
      }

    setNewAlarmDialog(false);
    setNewAlarm({
        variable_name: '',
      condition: 'above',
        threshold: '',
        description: '',
        enabled: true,
        severity: 'warning'
      });
      setSnackbar({
        open: true,
        message: 'Alarm created successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error creating alarm:', err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: 'Failed to create alarm',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAlarm = (alarm) => {
    setEditingAlarm(alarm);
    setEditAlarmDialog(true);
  };

  const handleUpdateAlarm = async () => {
    if (!editingAlarm.variable_name || !editingAlarm.threshold) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    try {
      setLoadingAlarmId(editingAlarm.alarm_id);
      
      // First delete the old alarm
      const deleteResponse = await fetch(MANAGE_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          operation: 'delete',
          alarm_id: editingAlarm.alarm_id
        })
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete old alarm');
      }

      // Then create the new alarm with updated properties
      const createResponse = await fetch(MANAGE_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          operation: 'create',
          alarm: {
            variable_name: editingAlarm.variable_name,
            condition: editingAlarm.condition,
            threshold: parseFloat(editingAlarm.threshold),
            description: editingAlarm.description,
            enabled: editingAlarm.enabled,
            severity: editingAlarm.severity
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create updated alarm');
      }

      const createResult = await createResponse.json();
      
      // Update the alarm in local state with new alarm_id
      setAlarms(prevAlarms => 
        prevAlarms.map(alarm => 
          alarm.alarm_id === editingAlarm.alarm_id ? {
            ...editingAlarm,
            alarm_id: createResult.alarm_id,
            threshold: parseFloat(editingAlarm.threshold)
          } : alarm
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Alarm updated successfully',
        severity: 'success'
      });
      setEditAlarmDialog(false);
      setEditingAlarm(null);
    } catch (err) {
      console.error('Error updating alarm:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update alarm',
        severity: 'error'
      });
    } finally {
      setLoadingAlarmId(null);
    }
  };

  const handleDeleteAlarm = async (alarmId) => {
    try {
      setLoadingAlarmId(alarmId);
      const response = await fetch(MANAGE_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          operation: 'delete',
          alarm_id: alarmId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete alarm');
      }

      // Update local state directly instead of refetching all alarms
      setAlarms(prevAlarms => prevAlarms.filter(alarm => alarm.alarm_id !== alarmId));
      setTriggeredAlarms(prevTriggered => prevTriggered.filter(alarm => alarm.alarm_id !== alarmId));

      setSnackbar({
        open: true,
        message: 'Alarm deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: 'Failed to delete alarm',
        severity: 'error'
      });
    } finally {
      setLoadingAlarmId(null);
    }
  };

  const handleToggleAlarm = async (alarmId, currentEnabled) => {
    try {
      setLoadingAlarmId(alarmId);
      const response = await fetch(MANAGE_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id,
          operation: 'update',
          alarm_id: alarmId,
          enabled: !currentEnabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update alarm');
      }

      // Update local state directly instead of refetching all alarms
      setAlarms(prevAlarms => 
        prevAlarms.map(alarm => 
          alarm.alarm_id === alarmId 
            ? { ...alarm, enabled: !currentEnabled }
            : alarm
        )
      );

      // Call the callback to refresh alarms in parent component
      if (onAlarmToggle) {
        onAlarmToggle();
      }
      setSnackbar({
        open: true,
        message: `Alarm ${currentEnabled ? 'disabled' : 'enabled'} successfully`,
        severity: 'success'
      });
    } catch (err) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: 'Failed to update alarm',
        severity: 'error'
      });
    } finally {
      setLoadingAlarmId(null);
    }
  };

  const getSeverityIcon = (severity) => {
    const severityLevel = severity?.toLowerCase() || 'info';
    switch (severityLevel) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityText = (severity) => {
    const severityLevel = severity?.toLowerCase() || 'info';
    return severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1);
  };

  const getSeverityColor = (severity) => {
    const severityLevel = severity?.toLowerCase() || 'info';
    switch (severityLevel) {
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Filter alarms based on selected filters
  const getFilteredAlarms = (alarmList) => {
    return alarmList.filter(alarm => {
      // Severity filter
      if (filters.severity !== 'all' && alarm.severity !== filters.severity) {
        return false;
      }
      
      // Status filter (enabled/disabled)
      if (filters.status !== 'all') {
        const isEnabled = alarm.enabled;
        if (filters.status === 'enabled' && !isEnabled) return false;
        if (filters.status === 'disabled' && isEnabled) return false;
      }
      
      // Variable filter
      if (filters.variable !== 'all' && alarm.variable_name !== filters.variable) {
        return false;
      }
      
      return true;
    });
  };

  // Filter triggered alarms based on selected filters
  const getFilteredTriggeredAlarms = (alarmList) => {
    return alarmList.filter(alarm => {
      // Severity filter
      if (triggeredFilters.severity !== 'all' && alarm.severity !== triggeredFilters.severity) {
        return false;
      }
      
      // Variable filter
      if (triggeredFilters.variable !== 'all' && alarm.variable_name !== triggeredFilters.variable) {
        return false;
      }
      
      // Time range filter
      if (triggeredFilters.timeRange !== 'all') {
        const now = new Date();
        const triggeredTime = new Date(alarm.triggered_at || alarm.timestamp);
        const timeDiff = now - triggeredTime;
        
        switch (triggeredFilters.timeRange) {
          case 'last_hour':
            if (timeDiff > 60 * 60 * 1000) return false;
            break;
          case 'last_6_hours':
            if (timeDiff > 6 * 60 * 60 * 1000) return false;
            break;
          case 'last_24_hours':
            if (timeDiff > 24 * 60 * 60 * 1000) return false;
            break;
          case 'last_week':
            if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
            break;
        }
      }
      
      return true;
    });
  };

  const formatAlarmValue = (alarm) => {
    const config = metricsConfig[alarm.variable_name] || { label: alarm.variable_name, unit: '' };
    return `${config.label} ${alarm.condition} ${alarm.threshold}${config.unit}`;
  };

  const formatCurrentValue = (alarm) => {
    const config = metricsConfig[alarm.variable_name] || { unit: '' };
    return `${alarm.current_value}${config.unit}`;
  };

  // Add error boundary render
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          Error Loading Alarms
        </Typography>
        <Typography color="textSecondary" paragraph>
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAlarms}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Add loading state
  if (isInitializing || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0, px: 0.5 }}>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 2, minHeight: 32, '& .MuiTab-root': { minHeight: 32, fontSize: '1rem', textTransform: 'none' } }}
      >
        <Tab label="Triggered Alarms" />
        <Tab label="Manage Alarms" />
      </Tabs>
      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            <WarningIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Triggered Alarms
          </Typography>
          
          {/* Filter Controls for Triggered Alarms */}
          {triggeredAlarms.length > 0 && (
            <Box sx={{ 
              mb: 1.5, 
              p: 1, 
              borderRadius: 1.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transform: 'translateY(-1px)'
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FilterListIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '0.9rem' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Filter Triggered Alarms
                </Typography>
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4} key="severity-filter">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Severity</InputLabel>
                    <Select
                      value={triggeredFilters.severity}
                      onChange={(e) => setTriggeredFilters({ ...triggeredFilters, severity: e.target.value })}
                      label="Severity"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Severities</MenuItem>
                      <MenuItem value="error" sx={{ fontSize: '0.75rem' }}>Error</MenuItem>
                      <MenuItem value="warning" sx={{ fontSize: '0.75rem' }}>Warning</MenuItem>
                      <MenuItem value="info" sx={{ fontSize: '0.75rem' }}>Info</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} key="variable-filter">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Variable</InputLabel>
                    <Select
                      value={triggeredFilters.variable}
                      onChange={(e) => setTriggeredFilters({ ...triggeredFilters, variable: e.target.value })}
                      label="Variable"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Variables</MenuItem>
                      {Object.entries(metricsConfig).map(([key, config]) => (
                        <MenuItem key={key} value={key} sx={{ fontSize: '0.75rem' }}>
                          {config.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} key="time-range-filter">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Time Range</InputLabel>
                    <Select
                      value={triggeredFilters.timeRange}
                      onChange={(e) => setTriggeredFilters({ ...triggeredFilters, timeRange: e.target.value })}
                      label="Time Range"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Time</MenuItem>
                      <MenuItem value="last_hour" sx={{ fontSize: '0.75rem' }}>Last Hour</MenuItem>
                      <MenuItem value="last_6_hours" sx={{ fontSize: '0.75rem' }}>Last 6 Hours</MenuItem>
                      <MenuItem value="last_24_hours" sx={{ fontSize: '0.75rem' }}>Last 24 Hours</MenuItem>
                      <MenuItem value="last_week" sx={{ fontSize: '0.75rem' }}>Last Week</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<ClearIcon sx={{ fontSize: '0.8rem' }} />}
                  onClick={() => setTriggeredFilters({ severity: 'all', variable: 'all', timeRange: 'all' })}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    py: 0.3,
                    px: 1
                  }}
                  variant="outlined"
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          )}
          
          {isLoading && !triggeredAlarms.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading && triggeredAlarms.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'grey.50'
            }}>
              <WarningIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Active Alarms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All systems are operating normally
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Filter Summary for Triggered Alarms */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {getFilteredTriggeredAlarms(triggeredAlarms).length} of {triggeredAlarms.length} triggered alarms
                </Typography>
                {(triggeredFilters.severity !== 'all' || triggeredFilters.variable !== 'all' || triggeredFilters.timeRange !== 'all') && (
                  <Chip
                    label="Filtered"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              
              <Grid container spacing={2}>
                {getFilteredTriggeredAlarms(triggeredAlarms).map((alarm) => (
                <Grid item xs={12} sm={6} md={4} key={alarm.alarm_id}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.95rem' }}>
                            {formatAlarmValue(alarm)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            {alarm.description || 'No description'}
                          </Typography>
                        </Box>
                        <Chip
                          label={getSeverityText(alarm.severity)}
                          color={alarm.severity === 'error' ? 'error' : alarm.severity === 'warning' ? 'warning' : 'info'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, fontSize: '0.85rem' }}>
                          Current Value: {formatCurrentValue(alarm)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Threshold: {alarm.condition} {alarm.threshold} {metricsConfig[alarm.variable_name]?.unit || ''}
                        </Typography>
                      </Box>
                      
                      {/* Last Triggered Information */}
                      <Box sx={{ 
                        borderTop: '1px solid',
                        borderColor: 'grey.200',
                        pt: 1.5,
                        mt: 'auto'
                      }}>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          Last Triggered
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'text.primary',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {alarm.last_triggered ? 
                            new Date(alarm.last_triggered).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : 
                            'Just triggered'
                          }
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Manage Alarms
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewAlarmDialog(true)}
              size="small"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Add Alarm
            </Button>
          </Box>
          
          {/* Filter Controls */}
          {alarms.length > 0 && (
            <Box sx={{ 
              mb: 1.5, 
              p: 1, 
              borderRadius: 1.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transform: 'translateY(-1px)'
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FilterListIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: '0.9rem' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Filter Alarms
                </Typography>
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4} key="severity-filter-manage">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Severity</InputLabel>
                    <Select
                      value={filters.severity}
                      onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                      label="Severity"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Severities</MenuItem>
                      <MenuItem value="error" sx={{ fontSize: '0.75rem' }}>Error</MenuItem>
                      <MenuItem value="warning" sx={{ fontSize: '0.75rem' }}>Warning</MenuItem>
                      <MenuItem value="info" sx={{ fontSize: '0.75rem' }}>Info</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} key="status-filter-manage">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      label="Status"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Status</MenuItem>
                      <MenuItem value="enabled" sx={{ fontSize: '0.75rem' }}>Enabled</MenuItem>
                      <MenuItem value="disabled" sx={{ fontSize: '0.75rem' }}>Disabled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} key="variable-filter-manage">
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ fontSize: '0.7rem' }}>Variable</InputLabel>
                    <Select
                      value={filters.variable}
                      onChange={(e) => setFilters({ ...filters, variable: e.target.value })}
                      label="Variable"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All Variables</MenuItem>
                      {Object.entries(metricsConfig).map(([key, config]) => (
                        <MenuItem key={key} value={key} sx={{ fontSize: '0.75rem' }}>
                          {config.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<ClearIcon sx={{ fontSize: '0.8rem' }} />}
                  onClick={() => setFilters({ severity: 'all', status: 'all', variable: 'all' })}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    py: 0.3,
                    px: 1
                  }}
                  variant="outlined"
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          )}
          
          {isLoading && !alarms.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading && alarms.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'grey.50'
            }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Alarms Configured
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set up alarms to monitor your device parameters
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewAlarmDialog(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Create First Alarm
              </Button>
            </Box>
          ) : (
            <Box>
              {/* Filter Summary */}
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {getFilteredAlarms(alarms).length} of {alarms.length} alarms
                </Typography>
                {(filters.severity !== 'all' || filters.status !== 'all' || filters.variable !== 'all') && (
                  <Chip
                    label="Filtered"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              
              <Grid container spacing={2}>
                {getFilteredAlarms(alarms).map((alarm) => (
                <Grid item xs={12} sm={6} md={4} key={alarm.alarm_id}>
                  <Card sx={{ 
                    height: '100%',
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.95rem' }}>
                            {formatAlarmValue(alarm)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                            {alarm.description || 'No description'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Chip
                            label={alarm.enabled ? 'Active' : 'Inactive'}
                            color={alarm.enabled ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip
                            label={getSeverityText(alarm.severity)}
                            color={alarm.severity === 'error' ? 'error' : alarm.severity === 'warning' ? 'warning' : 'info'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, fontSize: '0.85rem' }}>
                            Threshold: {alarm.condition} {alarm.threshold} {metricsConfig[alarm.variable_name]?.unit || ''}
                          </Typography>
                        </Box>
                        
                        {/* Last Triggered Information */}
                        <Box sx={{ 
                          borderTop: '1px solid',
                          borderColor: 'grey.200',
                          pt: 1.5,
                          mt: 'auto'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                            Last Triggered
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: 'text.primary',
                            fontSize: '0.75rem',
                            fontWeight: 500
                          }}>
                            {alarm.last_triggered ? 
                              new Date(alarm.last_triggered).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              }) : 
                              'Not triggered yet'
                            }
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ p: 1.5, pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditAlarm(alarm)}
                          sx={{ textTransform: 'none', fontWeight: 500 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={loadingAlarmId === alarm.alarm_id ? <CircularProgress size={16} /> : <DeleteIcon />}
                          onClick={() => handleDeleteAlarm(alarm.alarm_id)}
                          disabled={loadingAlarmId === alarm.alarm_id}
                          sx={{ textTransform: 'none', fontWeight: 500 }}
                        >
                          Delete
                        </Button>
                      </Box>
                      <Button
                        size="small"
                        variant={alarm.enabled ? 'outlined' : 'contained'}
                        startIcon={loadingAlarmId === alarm.alarm_id ? <CircularProgress size={16} /> : (alarm.enabled ? <NotificationsOffIcon /> : <NotificationsIcon />)}
                        onClick={() => handleToggleAlarm(alarm.alarm_id, alarm.enabled)}
                        disabled={loadingAlarmId === alarm.alarm_id}
                        sx={{ textTransform: 'none', fontWeight: 500 }}
                      >
                        {loadingAlarmId === alarm.alarm_id ? 'Processing...' : (alarm.enabled ? 'Disable' : 'Enable')}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {/* Add New Alarm Dialog */}
      <Dialog open={newAlarmDialog} onClose={() => setNewAlarmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Alarm</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Variable</InputLabel>
              <Select
                value={newAlarm.variable_name}
                onChange={(e) => setNewAlarm({ ...newAlarm, variable_name: e.target.value })}
                label="Variable"
              >
                {metricsConfig && Object.entries(metricsConfig).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
              ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select
              value={newAlarm.condition}
              onChange={(e) => setNewAlarm({ ...newAlarm, condition: e.target.value })}
                label="Condition"
            >
                <MenuItem value="above">Above</MenuItem>
                <MenuItem value="below">Below</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={newAlarm.severity}
                onChange={(e) => setNewAlarm({ ...newAlarm, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Threshold"
              type="number"
              value={newAlarm.threshold}
              onChange={(e) => setNewAlarm({ ...newAlarm, threshold: e.target.value })}
              fullWidth
              InputProps={{
                endAdornment: newAlarm.variable_name && metricsConfig[newAlarm.variable_name]?.unit ? 
                  <Typography variant="body2" color="text.secondary">
                    {metricsConfig[newAlarm.variable_name].unit}
                  </Typography> : null
              }}
            />

            <TextField
              label="Description"
              value={newAlarm.description}
              onChange={(e) => setNewAlarm({ ...newAlarm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={newAlarm.enabled}
                  onChange={(e) => setNewAlarm({ ...newAlarm, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAlarmDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAlarm} variant="contained">Add Alarm</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Alarm Dialog */}
      <Dialog open={editAlarmDialog} onClose={() => setEditAlarmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Alarm</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Variable</InputLabel>
              <Select
                value={editingAlarm?.variable_name || ''}
                onChange={(e) => setEditingAlarm({ ...editingAlarm, variable_name: e.target.value })}
                label="Variable"
              >
                {Object.entries(metricsConfig).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select
                value={editingAlarm?.condition || 'above'}
                onChange={(e) => setEditingAlarm({ ...editingAlarm, condition: e.target.value })}
                label="Condition"
              >
                <MenuItem value="above">Above</MenuItem>
                <MenuItem value="below">Below</MenuItem>
                <MenuItem value="equals">Equals</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={editingAlarm?.severity || 'warning'}
                onChange={(e) => setEditingAlarm({ ...editingAlarm, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Threshold"
              type="number"
              value={editingAlarm?.threshold || ''}
              onChange={(e) => setEditingAlarm({ ...editingAlarm, threshold: e.target.value })}
              fullWidth
              InputProps={{
                endAdornment: editingAlarm?.variable_name && metricsConfig[editingAlarm.variable_name]?.unit ? 
                  <Typography variant="body2" color="text.secondary">
                    {metricsConfig[editingAlarm.variable_name].unit}
                  </Typography> : null
              }}
            />

            <TextField
              label="Description"
              value={editingAlarm?.description || ''}
              onChange={(e) => setEditingAlarm({ ...editingAlarm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingAlarm?.enabled || false}
                  onChange={(e) => setEditingAlarm({ ...editingAlarm, enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAlarmDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateAlarm} 
            variant="contained"
            disabled={loadingAlarmId === editingAlarm?.alarm_id}
          >
            {loadingAlarmId === editingAlarm?.alarm_id ? 'Updating...' : 'Update Alarm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardAlarmsTab; 