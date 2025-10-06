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
  Tab
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
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
  const [isLoading, setIsLoading] = useState(false);
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

  const fetchAlarms = useCallback(async () => {
    if (!device?.client_id) {
      console.log('No device ID available for fetching alarms');
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
      console.log('Fetched alarms data:', data);
      
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
        console.log('Notifications are disabled');
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
        console.log('No device ID available');
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
      console.log('Creating alarm with data:', newAlarm);
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

      // Fetch updated alarms immediately
      const alarmsResponse = await fetch(FETCH_ALARMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: device.client_id
        })
      });

      if (!alarmsResponse.ok) {
        throw new Error('Failed to fetch updated alarms');
      }

      const data = await alarmsResponse.json();
      setAlarms(data.alarms || []);
      setTriggeredAlarms(data.triggered_alarms || []);
      
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

  const handleDeleteAlarm = async (alarmId) => {
    try {
      setIsLoading(true);
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

      await fetchAlarms();
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
      setIsLoading(false);
    }
  };

  const handleToggleAlarm = async (alarmId, currentEnabled) => {
    try {
      setIsLoading(true);
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

      await fetchAlarms();
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
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    console.log('Getting icon for severity:', severity);
    const severityLevel = severity?.toLowerCase() || 'info';
    switch (severityLevel) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        console.log('Using default icon for severity:', severityLevel);
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityText = (severity) => {
    console.log('Getting text for severity:', severity);
    const severityLevel = severity?.toLowerCase() || 'info';
    return severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1);
  };

  const getSeverityColor = (severity) => {
    console.log('Getting color for severity:', severity);
    const severityLevel = severity?.toLowerCase() || 'info';
    switch (severityLevel) {
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        console.log('Using default color for severity:', severityLevel);
        return theme.palette.info.main;
    }
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
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', mb: 2 }}>
            <WarningIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Triggered Alarms
          </Typography>
          {isLoading && !triggeredAlarms.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading && triggeredAlarms.length === 0 ? (
            <Typography variant="body2" color="textSecondary">No alarms currently triggered.</Typography>
          ) : (
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {triggeredAlarms.map((alarm) => (
                <ListItem key={alarm.alarm_id}>
                  <ListItemIcon>
                    {getSeverityIcon(alarm.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
                        {formatAlarmValue(alarm)}
                      </Typography>
                    }
                    secondary={
                      <Typography component="div" variant="body2" color="text.primary" sx={{ fontSize: '0.75rem' }}>
                        <Box component="span" sx={{ display: 'inline' }}>
                          Current value: {formatCurrentValue(alarm)}
                        </Box>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ 
                            color: getSeverityColor(alarm.severity),
                            ml: 1,
                            fontWeight: 'medium',
                            fontSize: '0.75rem'
                          }}
                        >
                          {getSeverityText(alarm.severity)}
                        </Typography>
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
      {activeTab === 1 && (
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Manage Alarms
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setNewAlarmDialog(true)}
              size="small"
            >
              Add Alarm
            </Button>
          </Box>
          {isLoading && !alarms.length && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading && alarms.length === 0 ? (
            <Typography variant="body2" color="textSecondary">No alarms configured.</Typography>
          ) : (
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {alarms.map((alarm) => (
                <ListItem
                  key={alarm.alarm_id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={alarm.enabled}
                            onChange={() => handleToggleAlarm(alarm.alarm_id, alarm.enabled)}
                            name={`enable-alarm-${alarm.alarm_id}`}
                            size="small"
                          />
                        }
                        label={alarm.enabled ? 'Enabled' : 'Disabled'}
                        labelPlacement="start"
                        sx={{ mr: 1, '.MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                      />
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAlarm(alarm.alarm_id)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
                        {formatAlarmValue(alarm)}
                      </Typography>
                    }
                    secondary={
                      <Typography component="div" variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <Box component="span" sx={{ display: 'inline' }}>
                          {alarm.description}
                        </Box>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ 
                            color: getSeverityColor(alarm.severity),
                            ml: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          {getSeverityText(alarm.severity)}
                        </Typography>
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
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