import React, { useState } from 'react';
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
  DialogActions
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const DashboardAlarmsTab = ({ metricsConfig, onAlarmUpdate }) => {
  const theme = useTheme();
  const [alarms, setAlarms] = useState([]);
  const [newAlarmDialog, setNewAlarmDialog] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    metric: '',
    condition: 'above',
    value: '',
    severity: 'warning',
    enabled: true
  });

  const handleAddAlarm = () => {
    if (!newAlarm.metric || !newAlarm.value) return;

    const alarm = {
      id: Date.now(),
      ...newAlarm,
      value: parseFloat(newAlarm.value)
    };

    setAlarms([...alarms, alarm]);
    setNewAlarmDialog(false);
    setNewAlarm({
      metric: '',
      condition: 'above',
      value: '',
      severity: 'warning',
      enabled: true
    });

    if (onAlarmUpdate) {
      onAlarmUpdate([...alarms, alarm]);
    }
  };

  const handleDeleteAlarm = (id) => {
    const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updatedAlarms);
    if (onAlarmUpdate) {
      onAlarmUpdate(updatedAlarms);
    }
  };

  const handleToggleAlarm = (id) => {
    const updatedAlarms = alarms.map(alarm => 
      alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
    );
    setAlarms(updatedAlarms);
    if (onAlarmUpdate) {
      onAlarmUpdate(updatedAlarms);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

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
              {alarms.filter(alarm => alarm.enabled).map(alarm => (
                <ListItem
                  key={alarm.id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleDeleteAlarm(alarm.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    {getSeverityIcon(alarm.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${metricsConfig[alarm.metric]?.label || alarm.metric} ${alarm.condition} ${alarm.value}${metricsConfig[alarm.metric]?.unit || ''}`}
                    secondary={`Severity: ${alarm.severity}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Alarm History */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Alarm History
            </Typography>
            <List>
              {/* Add alarm history items here */}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* New Alarm Dialog */}
      <Dialog open={newAlarmDialog} onClose={() => setNewAlarmDialog(false)}>
        <DialogTitle>Create New Alarm</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              select
              label="Metric"
              value={newAlarm.metric}
              onChange={(e) => setNewAlarm({ ...newAlarm, metric: e.target.value })}
              SelectProps={{
                native: true
              }}
            >
              <option value="">Select a metric</option>
              {Object.entries(metricsConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </TextField>
            <TextField
              select
              label="Condition"
              value={newAlarm.condition}
              onChange={(e) => setNewAlarm({ ...newAlarm, condition: e.target.value })}
              SelectProps={{
                native: true
              }}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </TextField>
            <TextField
              label="Value"
              type="number"
              value={newAlarm.value}
              onChange={(e) => setNewAlarm({ ...newAlarm, value: e.target.value })}
            />
            <TextField
              select
              label="Severity"
              value={newAlarm.severity}
              onChange={(e) => setNewAlarm({ ...newAlarm, severity: e.target.value })}
              SelectProps={{
                native: true
              }}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={newAlarm.enabled}
                  onChange={(e) => setNewAlarm({ ...newAlarm, enabled: e.target.checked })}
                />
              }
              label="Enable Alarm"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAlarmDialog(false)}>Cancel</Button>
          <Button onClick={handleAddAlarm} variant="contained">Add Alarm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardAlarmsTab; 