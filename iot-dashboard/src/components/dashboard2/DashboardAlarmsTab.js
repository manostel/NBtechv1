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

      await fetchAlarms();
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Alarm Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewAlarmDialog(true)}
        >
          Add Alarm
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Active Alarms */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Active Alarms
            </Typography>
            <List>
              {alarms.map(alarm => {
                console.log('Rendering alarm:', alarm);
                return (
                  <ListItem
                    key={alarm.alarm_id}
                    secondaryAction={
                      <Box>
                        <Switch
                          edge="end"
                          checked={alarm.enabled}
                          onChange={() => handleToggleAlarm(alarm.alarm_id, alarm.enabled)}
                          disabled={isLoading}
                        />
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteAlarm(alarm.alarm_id)}
                          disabled={isLoading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      {getSeverityIcon(alarm.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography>
                          {metricsConfig[alarm.variable_name]?.label || alarm.variable_name} {alarm.condition} {alarm.threshold}{metricsConfig[alarm.variable_name]?.unit || ''}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {alarm.description || ''}
                          </Typography>
                          <Typography 
                            component="span" 
                            variant="body2" 
                            sx={{ 
                              color: getSeverityColor(alarm.severity),
                              ml: 1,
                              fontWeight: 'medium'
                            }}
                          >
                            {getSeverityText(alarm.severity)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Triggered Alarms */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Triggered Alarms
            </Typography>
            <List>
              {triggeredAlarms.map(alarm => (
                <ListItem key={alarm.alarm_id}>
                  <ListItemIcon>
                    {getSeverityIcon(alarm.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography>
                        {metricsConfig[alarm.variable_name]?.label || alarm.variable_name} {alarm.condition} {alarm.threshold}{metricsConfig[alarm.variable_name]?.unit || ''}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography component="span" variant="body2" color="text.primary">
                          Current value: {alarm.current_value}{metricsConfig[alarm.variable_name]?.unit || ''}
                        </Typography>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ 
                            color: getSeverityColor(alarm.severity),
                            ml: 1,
                            fontWeight: 'medium'
                          }}
                        >
                          {getSeverityText(alarm.severity)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {triggeredAlarms.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No triggered alarms"
                    secondary="All metrics are within normal range"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* New Alarm Dialog */}
      <Dialog open={newAlarmDialog} onClose={() => setNewAlarmDialog(false)}>
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