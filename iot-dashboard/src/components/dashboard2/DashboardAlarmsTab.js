import React, { useState, useEffect } from 'react';
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
  MenuItem
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// API endpoints
const MANAGE_ALARMS_API_URL = "https://ueqnh8082k.execute-api.eu-central-1.amazonaws.com/default/manage-alarms";
const FETCH_ALARMS_API_URL = "https://1r9r7s5b01.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data-alarms";

const DashboardAlarmsTab = ({ device, metricsConfig, onAlarmToggle }) => {
  const theme = useTheme();
  const [alarms, setAlarms] = useState([]);
  const [triggeredAlarms, setTriggeredAlarms] = useState([]);
  const [newAlarmDialog, setNewAlarmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newAlarm, setNewAlarm] = useState({
    variable_name: '',
    condition: 'above',
    threshold: '',
    description: '',
    enabled: true,
    severity: 'warning'
  });

  // Fetch alarms on component mount and when device changes
  useEffect(() => {
    if (device?.client_id) {
      fetchAlarms();
    }
  }, [device?.client_id]);

  const fetchAlarms = async () => {
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
        throw new Error('Failed to fetch alarms');
      }

      const data = await response.json();
      console.log('Fetched alarms data:', data);
      setAlarms(data.alarms || []);
      setTriggeredAlarms(data.triggered_alarms || []);
    } catch (err) {
      console.error('Error fetching alarms:', err);
      setError(err.message);
      setSnackbar({
        open: true,
        message: 'Failed to fetch alarms',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={12} md={6} lg={6}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> Current Alarms
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
                          {metricsConfig[alarm.variable_name]?.label || alarm.variable_name} {alarm.condition} {alarm.threshold}{metricsConfig[alarm.variable_name]?.unit || ''}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {alarm.description}
                          </Typography>
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
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={12} md={6} lg={6}>
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
                          {metricsConfig[alarm.variable_name]?.label || alarm.variable_name} {alarm.condition} {alarm.threshold}{metricsConfig[alarm.variable_name]?.unit || ''}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography component="span" variant="body2" color="text.primary" sx={{ fontSize: '0.75rem' }}>
                            Current value: {alarm.current_value}{metricsConfig[alarm.variable_name]?.unit || ''}
                          </Typography>
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
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

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