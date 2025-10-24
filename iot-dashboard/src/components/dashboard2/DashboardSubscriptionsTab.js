import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Settings as SettingsIcon,
  DeviceHub as DeviceIcon,
  TrendingUp as TrendingUpIcon,
  Power as PowerIcon,
  Input as InputIcon,
  Output as OutputIcon,
  Speed as SpeedIcon,
  Battery90 as BatteryIcon,
  SignalCellular4Bar as SignalIcon,
  Thermostat as TemperatureIcon,
  WaterDrop as HumidityIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import SubscriptionNotificationService from '../../utils/SubscriptionNotificationService';

// API Configuration
const SUBSCRIPTIONS_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/manage-subscriptions";
const DEVICES_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/devices";

// Parameter type configurations
const PARAMETER_TYPES = {
  inputs: {
    label: 'Inputs',
    icon: <InputIcon />,
    parameters: ['inputs.IN1', 'inputs.IN2']
  },
  outputs: {
    label: 'Outputs', 
    icon: <OutputIcon />,
    parameters: ['outputs.OUT1', 'outputs.OUT2', 'outputs.speed', 'outputs.charging']
  },
  metrics: {
    label: 'Metrics',
    icon: <TrendingUpIcon />,
    parameters: ['temperature', 'humidity', 'battery', 'signal_quality', 'pressure']
  },
  variables: {
    label: 'Variables',
    icon: <SettingsIcon />,
    parameters: ['motor_speed', 'power_saving', 'outputs.power_saving']
  },
  status: {
    label: 'Status',
    icon: <DeviceIcon />,
    parameters: ['status']
  }
};

// Condition types for subscriptions
const CONDITION_TYPES = [
  { value: 'change', label: 'Any Change', description: 'Notify on any value change' },
  { value: 'above', label: 'Above Threshold', description: 'Notify when value exceeds threshold' },
  { value: 'below', label: 'Below Threshold', description: 'Notify when value falls below threshold' },
  { value: 'equals', label: 'Equals Value', description: 'Notify when value equals specific value' },
  { value: 'not_equals', label: 'Not Equals Value', description: 'Notify when value does not equal specific value' }
];

// Notification methods
const NOTIFICATION_METHODS = [
  { value: 'in_app', label: 'In-App Notification', description: 'Show notification in dashboard' },
  { value: 'email', label: 'Email Alert', description: 'Send email notification' },
  { value: 'both', label: 'Both', description: 'In-app and email notifications' }
];

export default function DashboardSubscriptionsTab({ 
  device, 
  user, 
  onNotification 
}) {
  console.log('DashboardSubscriptionsTab rendering with:', { device, user, onNotification });
  const theme = useTheme();
  const [subscriptions, setSubscriptions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [success, setSuccess] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [userLimits, setUserLimits] = useState({
    current_subscriptions: 0,
    max_subscriptions: 5,
    remaining_subscriptions: 5,
    can_create_more: true
  });

  // Form state for creating/editing subscriptions
  const [formData, setFormData] = useState({
    device_id: '',
    parameter_type: '',
    parameter_name: '',
    condition_type: 'change',
    threshold_value: '',
    notification_method: 'in_app',
    enabled: true,
    description: '',
    commands: [
      { action: 'none', value: '', target_device: '' },
      { action: 'none', value: '', target_device: '' },
      { action: 'none', value: '', target_device: '' }
    ]
  });

  // Load subscriptions and devices on component mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadSubscriptions(),
          loadDevices(),
          loadUserLimits()
        ]);
      } finally {
        setDataLoaded(true);
      }
    };
    loadAllData();
    
    // Initialize notification service
    SubscriptionNotificationService.connect();
    
    // Listen for notifications
    const handleNotification = (notification) => {
      if (onNotification) {
        onNotification({
          open: true,
          message: notification.message,
          severity: notification.severity || 'info'
        });
      }
    };
    
    SubscriptionNotificationService.on('notification', handleNotification);
    
    // Cleanup on unmount
    return () => {
      SubscriptionNotificationService.off('notification', handleNotification);
      SubscriptionNotificationService.disconnect();
    };
  }, [onNotification]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_subscriptions',
          user_email: user.email
        })
      });

      if (!response.ok) {
        // If API doesn't exist yet, show demo data
        if (response.status === 404 || response.status === 500) {
          console.log('Subscription API not deployed yet, showing demo data');
          setSubscriptions([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSubscriptions(result.subscriptions || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      // Don't show error if API is not deployed yet
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        console.log('Subscription API not available, showing demo interface');
        setSubscriptions([]);
      } else {
        setError('Failed to load subscriptions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_devices',
          user_email: user.email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setDevices(result.devices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadUserLimits = async () => {
    try {
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_user_limits',
          user_email: user.email
        })
      });

      if (!response.ok) {
        // If API doesn't exist yet, use default limits
        if (response.status === 404 || response.status === 500) {
          console.log('Subscription API not deployed yet, using default limits');
          setUserLimits({
            current_subscriptions: 0,
            max_subscriptions: 5,
            remaining_subscriptions: 5,
            can_create_more: true
          });
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setUserLimits(result);
    } catch (error) {
      console.error('Error loading user limits:', error);
      // Use default limits if API is not available
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        console.log('Subscription API not available, using default limits');
        setUserLimits({
          current_subscriptions: 0,
          max_subscriptions: 5,
          remaining_subscriptions: 5,
          can_create_more: true
        });
      }
    }
  };

  const handleCreateSubscription = async () => {
    try {
      // Check limits before creating
      if (!userLimits.can_create_more) {
        setError(`Maximum subscription limit reached (${userLimits.max_subscriptions}). Please delete some subscriptions first.`);
        return;
      }

      // Check for potential loops - only if monitoring outputs AND using output commands on same device
      const hasOutputCommands = formData.commands.some(cmd => 
        cmd.action === 'out1' || cmd.action === 'out2'
      );
      const isMonitoringOutputs = formData.parameter_type === 'outputs';
      const hasOutputCommandsOnSameDevice = formData.commands.some(cmd => 
        (cmd.action === 'out1' || cmd.action === 'out2') && cmd.target_device === formData.device_id
      );
      
      // Check if there are existing subscriptions monitoring outputs on this device
      const existingOutputSubscriptions = subscriptions.filter(sub => 
        sub.device_id === formData.device_id && sub.parameter_type === 'outputs'
      );
      
      if (isMonitoringOutputs && hasOutputCommandsOnSameDevice && existingOutputSubscriptions.length > 0) {
        setError('⚠️ Loop Prevention: Cannot create subscription that monitors outputs on a device that already has output subscriptions. This would create an infinite loop.');
        return;
      }

      setLoading(true);
      
      const subscriptionData = {
        device_id: formData.device_id,
        parameter_type: formData.parameter_type,
        parameter_name: formData.parameter_name,
        condition_type: formData.condition_type,
        threshold_value: formData.threshold_value || null,
        notification_method: formData.notification_method,
        enabled: formData.enabled,
        description: formData.description,
        commands: formData.commands
      };
      
      console.log('Creating subscription with data:', subscriptionData);
      
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'create_subscription',
          user_email: user.email,
          subscription: subscriptionData
        })
      });

      if (!response.ok) {
        // If API doesn't exist yet, show setup message
        if (response.status === 404 || response.status === 500) {
          setError('Subscription API not deployed yet. Please deploy the Lambda functions first.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Subscription created successfully');
        setCreateDialogOpen(false);
        resetForm();
        loadSubscriptions();
        loadUserLimits(); // Refresh limits
      } else {
        throw new Error(result.error || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      if (error.message.includes('Failed to fetch')) {
        setError('Subscription API not available. Please deploy the Lambda functions first.');
      } else {
        setError(error.message || 'Failed to create subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'update_subscription',
          user_email: user.email,
          subscription_id: selectedSubscription.subscription_id,
          subscription: formData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Subscription updated successfully');
        setEditDialogOpen(false);
        resetForm();
        loadSubscriptions();
      } else {
        throw new Error(result.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError(error.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'delete_subscription',
          user_email: user.email,
          subscription_id: subscriptionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Subscription deleted successfully');
        loadSubscriptions();
      } else {
        throw new Error(result.error || 'Failed to delete subscription');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      setError(error.message || 'Failed to delete subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (subscriptionId, enabled) => {
    try {
      setLoading(true);
      const response = await fetch(SUBSCRIPTIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'toggle_subscription',
          user_email: user.email,
          subscription_id: subscriptionId,
          enabled: enabled
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess(`Subscription ${enabled ? 'enabled' : 'disabled'} successfully`);
        loadSubscriptions();
      } else {
        throw new Error(result.error || 'Failed to toggle subscription');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      setError(error.message || 'Failed to toggle subscription');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      device_id: '',
      parameter_type: '',
      parameter_name: '',
      condition_type: 'change',
      threshold_value: '',
      notification_method: 'in_app',
      enabled: true,
      description: '',
      commands: [
        { action: 'none', value: '', target_device: '' },
        { action: 'none', value: '', target_device: '' },
        { action: 'none', value: '', target_device: '' }
      ]
    });
  };

  const handleEditSubscription = (subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      device_id: subscription.device_id,
      parameter_type: subscription.parameter_type,
      parameter_name: subscription.parameter_name,
      condition_type: subscription.condition_type,
      threshold_value: subscription.threshold_value || '',
      notification_method: subscription.notification_method,
      enabled: subscription.enabled,
      description: subscription.description || '',
      commands: subscription.commands || [
        { action: 'none', value: '', target_device: '' },
        { action: 'none', value: '', target_device: '' },
        { action: 'none', value: '', target_device: '' }
      ]
    });
    setEditDialogOpen(true);
  };

  const getParameterIcon = (parameterType, parameterName) => {
    const iconMap = {
      'inputs.IN1': <InputIcon />,
      'inputs.IN2': <InputIcon />,
      'outputs.OUT1': <OutputIcon />,
      'outputs.OUT2': <OutputIcon />,
      'outputs.speed': <SpeedIcon />,
      'outputs.charging': <BatteryIcon />,
      'outputs.power_saving': <PowerIcon />,
      'temperature': <TemperatureIcon />,
      'humidity': <HumidityIcon />,
      'battery': <BatteryIcon />,
      'signal_quality': <SignalIcon />,
      'motor_speed': <SpeedIcon />,
      'power_saving': <PowerIcon />,
      'status': <DeviceIcon />
    };
    return iconMap[parameterName] || <SettingsIcon />;
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.client_id === deviceId);
    return device ? device.device_name : deviceId;
  };

  const getAvailableParameters = (deviceId, parameterType) => {
    // Return a default list of parameters for each type
    const defaultParameters = {
      'inputs': ['inputs.IN1', 'inputs.IN2'],
      'outputs': ['outputs.OUT1', 'outputs.OUT2', 'outputs.speed', 'outputs.charging', 'outputs.power_saving'],
      'metrics': ['temperature', 'humidity', 'battery', 'signal_quality', 'pressure'],
      'variables': ['motor_speed', 'power_saving'],
      'status': ['status']
    };
    
    return defaultParameters[parameterType] || [];
  };

  const getConditionDescription = (subscription) => {
    const { condition_type, threshold_value, parameter_name } = subscription;
    
    switch (condition_type) {
      case 'change':
        return `Notify on any change to ${parameter_name}`;
      case 'above':
        return `Notify when ${parameter_name} > ${threshold_value}`;
      case 'below':
        return `Notify when ${parameter_name} < ${threshold_value}`;
      case 'equals':
        return `Notify when ${parameter_name} = ${threshold_value}`;
      case 'not_equals':
        return `Notify when ${parameter_name} ≠ ${threshold_value}`;
      default:
        return `Monitor ${parameter_name}`;
    }
  };

  const renderSubscriptionCard = (subscription) => (
    <Grid item xs={12} sm={6} lg={4}>
      <Card 
        key={subscription.subscription_id} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e3f2fd',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header Section */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                bgcolor: subscription.enabled ? 'success.dark' : 'grey.800',
                mr: 2
              }}>
                <Box sx={{ color: 'white' }}>
                  {getParameterIcon(subscription.parameter_type, subscription.parameter_name)}
                </Box>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {getDeviceName(subscription.device_id)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {PARAMETER_TYPES[subscription.parameter_type]?.label} • {subscription.parameter_name}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={subscription.enabled ? 'Active' : 'Inactive'}
              color={subscription.enabled ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          
          {/* Content Section - grows to fill available space */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
              {getConditionDescription(subscription)}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subscription.description || 'No description provided'}
              </Typography>
            </Box>
            
            {/* Last Triggered Info */}
            <Box sx={{ 
              mb: 2, 
              pb: 2, 
              borderBottom: '1px solid', 
              borderColor: 'grey.200' 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Last triggered
                </Typography>
                {subscription.trigger_count > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {subscription.trigger_count} times
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 400, color: 'text.primary' }}>
                {subscription.last_triggered 
                  ? new Date(subscription.last_triggered).toLocaleString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })
                  : 'Not triggered yet'
                }
              </Typography>
            </Box>
            
            {/* Tags Section - always at bottom of content */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
              <Chip
                label={subscription.notification_method.replace('_', ' ')}
                size="small"
                variant="outlined"
                color="primary"
              />
              <Chip
                label={subscription.condition_type}
                size="small"
                variant="outlined"
              />
              {subscription.commands && subscription.commands.some(cmd => cmd.action !== 'none') && (
                subscription.commands
                  .filter(cmd => cmd.action !== 'none')
                  .map((cmd, index) => (
                    <Chip
                      key={index}
                      label={`${cmd.action} = ${cmd.value}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  ))
              )}
            </Box>
          </Box>
        </CardContent>
        
        {/* Actions - always at same height */}
        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => handleEditSubscription(subscription)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => handleDeleteSubscription(subscription.subscription_id)}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Delete
            </Button>
          </Box>
          <Button
            size="small"
            variant={subscription.enabled ? 'outlined' : 'contained'}
            startIcon={subscription.enabled ? <NotificationsOffIcon /> : <NotificationsIcon />}
            onClick={() => handleToggleSubscription(subscription.subscription_id, !subscription.enabled)}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            {subscription.enabled ? 'Disable' : 'Enable'}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderCreateDialog = () => (
    <Dialog 
      open={createDialogOpen} 
      onClose={() => setCreateDialogOpen(false)} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Configure Device Subscription
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set up automated monitoring and responses for your device
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Trigger Conditions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure the conditions that will activate this subscription
        </Typography>
        
        {/* Loop Prevention Warning */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>⚠️ Loop Prevention:</strong> Avoid creating subscriptions that monitor outputs on devices that already have output subscriptions, as this can create infinite loops.
          </Typography>
        </Alert>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Device</InputLabel>
              <Select
                value={formData.device_id}
                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                label="Device"
              >
                {devices.map((device) => (
                  <MenuItem key={device.client_id} value={device.client_id}>
                    {device.device_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Parameter Type</InputLabel>
              <Select
                value={formData.parameter_type}
                onChange={(e) => setFormData({ ...formData, parameter_type: e.target.value, parameter_name: '' })}
                label="Parameter Type"
              >
                {Object.entries(PARAMETER_TYPES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {config.icon}
                      <Typography sx={{ ml: 1 }}>{config.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Parameter</InputLabel>
              <Select
                value={formData.parameter_name}
                onChange={(e) => setFormData({ ...formData, parameter_name: e.target.value })}
                label="Parameter"
                disabled={!formData.parameter_type}
              >
                {formData.parameter_type && PARAMETER_TYPES[formData.parameter_type]?.parameters.map((param) => (
                  <MenuItem key={param} value={param}>
                    {param}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select
                value={formData.condition_type}
                onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                label="Condition"
              >
                {CONDITION_TYPES.map((condition) => (
                  <MenuItem key={condition.value} value={condition.value}>
                    <Box>
                      <Typography>{condition.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {condition.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {(formData.condition_type === 'above' || formData.condition_type === 'below' || 
            formData.condition_type === 'equals' || formData.condition_type === 'not_equals') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Threshold Value"
                value={formData.threshold_value}
                onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
                type="number"
                helperText="Enter the threshold value for this condition"
              />
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Notification Method</InputLabel>
              <Select
                value={formData.notification_method}
                onChange={(e) => setFormData({ ...formData, notification_method: e.target.value })}
                label="Notification Method"
              >
                {NOTIFICATION_METHODS.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    <Box>
                      <Typography>{method.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {method.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Rule Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              helperText="Provide a descriptive name for this monitoring rule"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1 }}>
              Command Actions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Define the commands to execute when the subscription is triggered
            </Typography>
          </Grid>
          
          {(formData.commands || []).map((command, index) => (
            <React.Fragment key={index}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Command {index + 1}</InputLabel>
                  <Select
                    value={command.action}
                    onChange={(e) => {
                      const newCommands = [...formData.commands];
                      newCommands[index].action = e.target.value;
                      setFormData({ ...formData, commands: newCommands });
                    }}
                    label={`Command ${index + 1}`}
                  >
                    <MenuItem value="none">No Command</MenuItem>
                    <MenuItem value="out1">Set OUT1</MenuItem>
                    <MenuItem value="out2">Set OUT2</MenuItem>
                    <MenuItem value="motor_speed">Set Motor Speed</MenuItem>
                    <MenuItem value="power_saving">Set Power Saving</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <FormControl fullWidth>
                    <InputLabel>Target Device</InputLabel>
                    <Select
                      value={command.target_device}
                      onChange={(e) => {
                        const newCommands = [...formData.commands];
                        newCommands[index].target_device = e.target.value;
                        setFormData({ ...formData, commands: newCommands });
                      }}
                      label="Target Device"
                    >
                      <MenuItem value={formData.device_id}>Same Device</MenuItem>
                      {devices.filter(d => d.client_id !== formData.device_id).map(device => (
                        <MenuItem key={device.client_id} value={device.client_id}>
                          {device.device_name || device.client_id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <TextField
                    fullWidth
                    label={`Value ${index + 1}`}
                    value={command.value}
                    onChange={(e) => {
                      const newCommands = [...formData.commands];
                      newCommands[index].value = e.target.value;
                      setFormData({ ...formData, commands: newCommands });
                    }}
                    placeholder={command.action === 'motor_speed' ? '0-100' : '0 or 1'}
                    helperText={
                      command.action === 'motor_speed' 
                        ? 'Motor speed (0-100)' 
                        : command.action === 'power_saving'
                        ? 'Power saving mode (0 or 1)'
                        : 'Output state (0 or 1)'
                    }
                  />
                )}
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Chip
                      label={`${command.action} = ${command.value} → ${getDeviceName(command.target_device)}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Grid>
            </React.Fragment>
          ))}
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Activate subscription"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleCreateSubscription} 
          variant="contained"
          disabled={loading || !formData.device_id || !formData.parameter_name}
        >
          {loading ? <CircularProgress size={20} /> : 'Create Subscription'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderEditDialog = () => (
    <Dialog 
      open={editDialogOpen} 
      onClose={() => setEditDialogOpen(false)} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Edit Subscription
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modify your existing subscription configuration
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Trigger Conditions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure the conditions that will activate this subscription
            </Typography>
            
            {/* Loop Prevention Warning */}
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>⚠️ Loop Prevention:</strong> Avoid creating subscriptions that monitor outputs on devices that already have output subscriptions, as this can create infinite loops.
              </Typography>
            </Alert>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Device</InputLabel>
              <Select
                value={formData.device_id}
                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                label="Device"
              >
                {devices.map(device => (
                  <MenuItem key={device.client_id} value={device.client_id}>
                    {device.device_name || device.client_id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Parameter Type</InputLabel>
              <Select
                value={formData.parameter_type}
                onChange={(e) => setFormData({ ...formData, parameter_type: e.target.value, parameter_name: '' })}
                label="Parameter Type"
              >
                {Object.entries(PARAMETER_TYPES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Parameter</InputLabel>
              <Select
                value={formData.parameter_name}
                onChange={(e) => setFormData({ ...formData, parameter_name: e.target.value })}
                label="Parameter"
                disabled={!formData.parameter_type}
              >
                {getAvailableParameters(formData.device_id, formData.parameter_type).map(param => (
                  <MenuItem key={param} value={param}>
                    {param}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Condition</InputLabel>
              <Select
                value={formData.condition_type}
                onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                label="Condition"
              >
                <MenuItem value="change">Any Change</MenuItem>
                <MenuItem value="above">Above Threshold</MenuItem>
                <MenuItem value="below">Below Threshold</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {formData.condition_type !== 'change' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Threshold Value"
                type="number"
                value={formData.threshold_value}
                onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
                placeholder="Enter threshold value"
              />
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Notification Method</InputLabel>
              <Select
                value={formData.notification_method}
                onChange={(e) => setFormData({ ...formData, notification_method: e.target.value })}
                label="Notification Method"
              >
                <MenuItem value="in_app">In-App Only</MenuItem>
                <MenuItem value="email">Email Only</MenuItem>
                <MenuItem value="both">Both</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Rule Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for this rule"
              multiline
              rows={2}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="Activate subscription"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 1 }}>
              Command Actions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Define the commands to execute when the subscription is triggered
            </Typography>
          </Grid>
          
          {(formData.commands || []).map((command, index) => (
            <React.Fragment key={index}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Command {index + 1}</InputLabel>
                  <Select
                    value={command.action}
                    onChange={(e) => {
                      const newCommands = [...(formData.commands || [])];
                      newCommands[index].action = e.target.value;
                      setFormData({ ...formData, commands: newCommands });
                    }}
                    label={`Command ${index + 1}`}
                  >
                    <MenuItem value="none">No Command</MenuItem>
                    <MenuItem value="out1">Set OUT1</MenuItem>
                    <MenuItem value="out2">Set OUT2</MenuItem>
                    <MenuItem value="motor_speed">Set Motor Speed</MenuItem>
                    <MenuItem value="power_saving">Set Power Saving</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <FormControl fullWidth>
                    <InputLabel>Target Device</InputLabel>
                    <Select
                      value={command.target_device}
                      onChange={(e) => {
                        const newCommands = [...(formData.commands || [])];
                        newCommands[index].target_device = e.target.value;
                        setFormData({ ...formData, commands: newCommands });
                      }}
                      label="Target Device"
                    >
                      <MenuItem value={formData.device_id}>Same Device</MenuItem>
                      {devices.filter(d => d.client_id !== formData.device_id).map(device => (
                        <MenuItem key={device.client_id} value={device.client_id}>
                          {device.device_name || device.client_id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <TextField
                    fullWidth
                    label={`Value ${index + 1}`}
                    value={command.value}
                    onChange={(e) => {
                      const newCommands = [...(formData.commands || [])];
                      newCommands[index].value = e.target.value;
                      setFormData({ ...formData, commands: newCommands });
                    }}
                    placeholder={command.action === 'motor_speed' ? '0-100' : '0 or 1'}
                    helperText={
                      command.action === 'motor_speed' 
                        ? 'Motor speed (0-100)' 
                        : command.action === 'power_saving'
                        ? 'Power saving mode (0 or 1)'
                        : 'Output state (0 or 1)'
                    }
                  />
                )}
              </Grid>
              
              <Grid item xs={12} sm={3}>
                {command.action !== 'none' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Chip
                      label={`${command.action} = ${command.value} → ${getDeviceName(command.target_device)}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleUpdateSubscription} 
          variant="contained"
          disabled={loading || !formData.device_id || !formData.parameter_name}
        >
          {loading ? <CircularProgress size={20} /> : 'Update Subscription'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  console.log('DashboardSubscriptionsTab about to render, subscriptions:', subscriptions.length);
  
  // Show loading state until data is fetched
  if (!dataLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            Your Subscriptions
          </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={!userLimits.can_create_more}
          sx={{ 
            textTransform: 'none',
            fontWeight: 600
          }}
        >
            New Subscription
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}


      {subscriptions.length === 0 ? (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: '1px dashed #e0e0e0'
          }}
        >
          <Box sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            bgcolor: 'primary.light', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            No monitoring rules yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            Create your first monitoring rule to get automated alerts and responses when device parameters change.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={!userLimits.can_create_more}
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Create First Subscription
          </Button>
        </Paper>
      ) : (
        <Box>
          <Grid container spacing={3}>
            {subscriptions.map(renderSubscriptionCard)}
          </Grid>
        </Box>
      )}


      {renderCreateDialog()}
      {renderEditDialog()}
    </Box>
  );
}
