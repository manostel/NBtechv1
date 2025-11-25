import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Switch, 
  FormControlLabel,
  Chip,
  Tooltip,
  useTheme,
  Card,
  CardContent,
  CardActions,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  InputAdornment,
  alpha,
  CircularProgress,
  Alert,
  Snackbar,
  Slider
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Schedule as ScheduleIcon, 
  Event as EventIcon,
  Repeat as RepeatIcon,
  PlayArrow as PlayArrowIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  CalendarMonth as CalendarMonthIcon,
  CalendarToday as CalendarTodayIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  Speed as SpeedIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Device, User } from '../../../types';
import notificationManager from '../../../services/NotificationManager';

const SCHEDULER_API_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/manage-scheduler";

interface ScheduledTask {
  task_id: string;
  user_email: string;
  name: string;
  command: string;
  device_id: string;
  target: string; // e.g., 'output1', 'motor_speed'
  value: string | number;
  type: 'one_time' | 'recurring';
  schedule: string; // ISO date for one_time, cron expression for recurring
  enabled: boolean;
  last_run?: number;
  next_run_timestamp?: number;
  created_at: number;
}

interface DashboardSchedulerTabProps {
  device: Device;
  user?: User;
}

type RecurrenceType = 'every_minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';

const DashboardSchedulerTab: React.FC<DashboardSchedulerTabProps> = ({ device, user }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const [schedules, setSchedules] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const previousTasksRef = useRef<Map<string, number>>(new Map()); // Track last_run timestamps
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState<Partial<ScheduledTask>>({
    name: '',
    command: 'set_output',
    target: 'output1',
    value: '',
    type: 'one_time',
    schedule: '',
    enabled: true,
    device_id: device.client_id
  });

  // Enhanced Recurring Schedule State
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [selectedMonthDay, setSelectedMonthDay] = useState<number>(1);

  const DAYS_OF_WEEK = [
    { value: '1', label: t('scheduler.days.mon') },
    { value: '2', label: t('scheduler.days.tue') },
    { value: '3', label: t('scheduler.days.wed') },
    { value: '4', label: t('scheduler.days.thu') },
    { value: '5', label: t('scheduler.days.fri') },
    { value: '6', label: t('scheduler.days.sat') },
    { value: '0', label: t('scheduler.days.sun') },
  ];

  // Fetch tasks on mount and poll for updates
  useEffect(() => {
    if (user?.email) {
      fetchTasks();
      
      // Poll every 30 seconds to check for new scheduler executions
      const interval = setInterval(() => {
        fetchTasks();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user?.email) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SCHEDULER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'get_tasks',
          user_email: user.email
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const tasks = data.tasks || [];
        
        // Check for new scheduler executions
        tasks.forEach((task: ScheduledTask) => {
          if (task.last_run) {
            const previousLastRun = previousTasksRef.current.get(task.task_id);
            // If last_run changed and is recent (within last 2 minutes), notify
            if (previousLastRun !== task.last_run) {
              const now = Math.floor(Date.now() / 1000);
              const timeSinceExecution = now - task.last_run;
              
              // Only notify if execution happened in the last 2 minutes
              if (timeSinceExecution < 120 && previousLastRun !== undefined) {
                const success = task.last_status === 'success';
                notificationManager.notifySchedulerTrigger(
                  task,
                  success,
                  device
                );
              }
              
              // Update tracking
              previousTasksRef.current.set(task.task_id, task.last_run);
            } else if (previousLastRun === undefined) {
              // First time seeing this task, just track it
              previousTasksRef.current.set(task.task_id, task.last_run);
            }
          }
        });
        
        setSchedules(tasks);
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Parse cron expression to state
  const parseCronToState = (cron: string) => {
    try {
      const parts = cron.split(' ');
      if (parts.length < 5) throw new Error('Invalid cron format');

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      // 1. Check for "Every X minutes" -> "*/15 * * * *"
      if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        setRecurrenceType('every_minute');
        setRecurrenceInterval(parseInt(minute.split('/')[1]));
        return;
      }

      // 2. Check for "Every X hours" -> "0 */2 * * *" or "15 */1 * * *"
      if (hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        setRecurrenceType('hourly');
        setRecurrenceInterval(parseInt(hour.split('/')[1]));
        setSelectedMinute(parseInt(minute));
        return;
      }

      // 3. Check for Weekly (specific days) -> "30 14 * * 1,3"
      if (dayOfWeek !== '*' && dayOfMonth === '*') {
        setRecurrenceType('weekly');
        setSelectedTime(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
        setSelectedDays(dayOfWeek.split(','));
        return;
      }

      // 4. Check for Monthly (specific day of month) -> "30 14 1 * *"
      if (dayOfMonth !== '*' && dayOfWeek === '*') {
        setRecurrenceType('monthly');
        setSelectedTime(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
        setSelectedMonthDay(parseInt(dayOfMonth));
        return;
      }

      // 5. Default to Daily -> "30 14 * * *"
      setRecurrenceType('daily');
      setSelectedTime(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
      
    } catch (e) {
      console.error('Error parsing cron:', e);
      // Fallback defaults
      setRecurrenceType('daily');
      setSelectedTime('12:00');
      setSelectedDays([]);
    }
  };

  // Generate cron expression from state
  const generateCronFromState = () => {
    switch (recurrenceType) {
      case 'every_minute':
        // Every X minutes
        return `*/${recurrenceInterval} * * * *`;
      
      case 'hourly':
        // At minute X past every Y hours
        return `${selectedMinute} */${recurrenceInterval} * * *`;
      
      case 'daily':
        // Every day at HH:mm
        const [dHour, dMinute] = selectedTime.split(':');
        return `${parseInt(dMinute)} ${parseInt(dHour)} * * *`;
      
      case 'weekly':
        // Specific days at HH:mm
        if (selectedDays.length === 0) return '';
        const [wHour, wMinute] = selectedTime.split(':');
        const daysString = selectedDays.length === 7 ? '*' : selectedDays.sort().join(',');
        return `${parseInt(wMinute)} ${parseInt(wHour)} * * ${daysString}`;
      
      case 'monthly':
        // Specific day of month at HH:mm
        const [mHour, mMinute] = selectedTime.split(':');
        return `${parseInt(mMinute)} ${parseInt(mHour)} ${selectedMonthDay} * *`;
        
      default:
        return '';
    }
  };

  // Update formData.schedule when recurring state changes
  useEffect(() => {
    if (formData.type === 'recurring' && openDialog) {
      const cron = generateCronFromState();
      setFormData(prev => ({ ...prev, schedule: cron }));
    }
  }, [recurrenceType, recurrenceInterval, selectedDays, selectedTime, selectedMinute, selectedMonthDay, formData.type, openDialog]);

  const handleOpenDialog = (task?: ScheduledTask) => {
    if (task) {
      setEditingId(task.task_id);
      setFormData({ ...task });
      
      if (task.type === 'recurring') {
        parseCronToState(task.schedule);
      } else {
        // Reset defaults for recurring
        setRecurrenceType('daily');
        setSelectedTime('12:00');
        setSelectedDays([]);
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        command: 'set_output',
        target: 'output1',
        value: 'ON',
        type: 'one_time',
        schedule: '',
        enabled: true,
        device_id: device.client_id
      });
      // Reset defaults
      setRecurrenceType('daily');
      setSelectedTime('12:00');
      setSelectedDays([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!user?.email) return;

    // Validation
    if (!formData.name || !formData.schedule) {
      alert('Please fill in all required fields');
      return;
    }

    // Construct the correct command payload
    let finalCommand = formData.command;
    let finalValue = formData.value;

    if (formData.command === 'set_output') {
      // Example: TOGGLE_1_ON
      if (formData.target === 'output1') {
        finalCommand = formData.value === 'ON' ? 'TOGGLE_1_ON' : 'TOGGLE_1_OFF';
      } else if (formData.target === 'output2') {
        finalCommand = formData.value === 'ON' ? 'TOGGLE_2_ON' : 'TOGGLE_2_OFF';
      }
      // Clear value as it's encoded in command
      finalValue = ''; 
    } else if (formData.command === 'set_motor') {
      finalCommand = 'SET_SPEED';
      // Value is the speed number
    }

    setLoading(true);
    try {
      const action = editingId ? 'update_task' : 'create_task';
      const payload = {
        action,
        user_email: user.email,
        task_id: editingId,
        task: {
          ...formData,
          command: finalCommand,
          value: finalValue,
          device_id: device.client_id
        }
      };

      const response = await fetch(SCHEDULER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && (data.success || data.statusCode === 200)) {
        setSuccessMessage(editingId ? 'Task updated successfully' : 'Task created successfully');
        handleCloseDialog();
        fetchTasks();
      } else {
        throw new Error(data.error || 'Operation failed');
      }
    } catch (err: any) {
      console.error('Error saving task:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!user?.email || !window.confirm(t('common.confirmDelete'))) return;

    setLoading(true);
    try {
      const response = await fetch(SCHEDULER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'delete_task',
          user_email: user.email,
          task_id: taskId
        })
      });

      const data = await response.json();
      if (response.ok && (data.success || data.statusCode === 200)) {
        setSuccessMessage('Task deleted successfully');
        fetchTasks();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (taskId: string, currentStatus: boolean) => {
    if (!user?.email) return;

    // Optimistic update
    setSchedules(prev => prev.map(s => s.task_id === taskId ? { ...s, enabled: !currentStatus } : s));

    try {
      const response = await fetch(SCHEDULER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'toggle_task',
          user_email: user.email,
          task_id: taskId,
          enabled: !currentStatus
        })
      });

      const data = await response.json();
      if (!response.ok || (!data.success && data.statusCode !== 200)) {
        // Revert on failure
        setSchedules(prev => prev.map(s => s.task_id === taskId ? { ...s, enabled: currentStatus } : s));
        throw new Error(data.error || 'Toggle failed');
      }
    } catch (err: any) {
      console.error('Error toggling task:', err);
      setError(err.message);
      // Revert on error
      setSchedules(prev => prev.map(s => s.task_id === taskId ? { ...s, enabled: currentStatus } : s));
    }
  };

  const formatScheduleDisplay = (type: string, schedule: string) => {
    if (type === 'one_time') {
      try {
        return new Date(schedule).toLocaleString();
      } catch (e) {
        return schedule;
      }
    }
    
    // Parse logic to show friendly text based on our improved cron handling
    try {
      const parts = schedule.split(' ');
      if (parts.length >= 5) {
        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

        // Every X minutes
        if (minute.startsWith('*/') && hour === '*') {
           return `Every ${minute.split('/')[1]} minutes`;
        }
        
        // Every X hours
        if (hour.startsWith('*/')) {
           return `At :${minute.padStart(2,'0')} past every ${hour.split('/')[1]} hour(s)`;
        }
        
        // Weekly
        if (dayOfWeek !== '*' && dayOfMonth === '*') {
           const dayMap: {[key: string]: string} = {
            '0': t('scheduler.days.sun'),
            '1': t('scheduler.days.mon'),
            '2': t('scheduler.days.tue'),
            '3': t('scheduler.days.wed'),
            '4': t('scheduler.days.thu'),
            '5': t('scheduler.days.fri'),
            '6': t('scheduler.days.sat'),
          };
          const daysDisplay = dayOfWeek.split(',').map(d => dayMap[d]).join(', ');
          return `${daysDisplay} @ ${hour.padStart(2,'0')}:${minute.padStart(2,'0')}`;
        }
        
        // Monthly
        if (dayOfMonth !== '*' && dayOfWeek === '*') {
           return `Day ${dayOfMonth} of month @ ${hour.padStart(2,'0')}:${minute.padStart(2,'0')}`;
        }

        // Daily (default fallback)
        if (dayOfWeek === '*' && dayOfMonth === '*' && hour !== '*' && minute !== '*') {
           return `Daily @ ${hour.padStart(2,'0')}:${minute.padStart(2,'0')}`;
        }
      }
    } catch (e) {
      return schedule;
    }
    
    return schedule;
  };

  const handleDaysChange = (event: React.MouseEvent<HTMLElement>, newDays: string[]) => {
    setSelectedDays(newDays);
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Success/Error Snackbars */}
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            width: '100%',
            px: 2,
            py: 1.5,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.8) 0%, rgba(31, 37, 71, 0.9) 50%, rgba(26, 31, 60, 0.8) 100%)',
            borderRadius: 3,
            border: 'none',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)',
              borderRadius: '3px 3px 0 0',
              opacity: 0.4
            }
          }}>
            <Box sx={{ 
              p: 0.5, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #4caf50, #2196f3)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <ScheduleIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
            </Box>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '0.95rem', sm: '1rem' }, 
              fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
              fontWeight: 600,
              letterSpacing: '0.2px',
              textTransform: 'none',
              background: 'linear-gradient(45deg, #4caf50, #2196f3)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {t('scheduler.title')}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                ml: 'auto',
                borderColor: 'text.secondary',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'text.primary',
                  backgroundColor: 'rgba(0,0,0,0.04)'
                }
              }}
            >
              {t('scheduler.addTask')}
            </Button>
          </Box>
        </Box>
      </Box>

      {loading && schedules.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : schedules.length === 0 ? (
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(12px)',
            border: theme.palette.mode === 'dark' ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed rgba(0,0,0,0.15)',
            boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)'
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
            <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            {t('scheduler.noTasks')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            {t('scheduler.createFirstTask')}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {t('scheduler.addTask')}
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {schedules.map((task) => (
            <Grid item xs={12} md={6} lg={4} key={task.task_id}>
              <Card sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                color: (theme) => theme.palette.text.primary,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)',
                  transition: 'background 0.3s ease',
                },
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)',
                  '&::before': {
                    background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #5cbf60, #3399f3)' : 'linear-gradient(90deg, #1e88e5, #43a047)',
                  }
                }
              }}>
                <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        bgcolor: task.enabled ? 'success.dark' : 'grey.800',
                        mr: 2
                      }}>
                        <Box sx={{ color: 'white' }}>
                          {task.type === 'recurring' ? <RepeatIcon /> : <EventIcon />}
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: '#E0E0E0' }}>
                          {task.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
                          {task.type === 'recurring' ? t('scheduler.recurring') : t('scheduler.oneTime')}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={task.enabled ? t('scheduler.active') : 'Inactive'}
                      color={task.enabled ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  {/* Content Section */}
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <PlayArrowIcon fontSize="small" /> 
                      {t('scheduler.command')}: <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{task.command} {task.value ? `(${task.value})` : ''}</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ScheduleIcon fontSize="small" /> 
                      {t('scheduler.schedule')}: <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{formatScheduleDisplay(task.type, task.schedule)}</Box>
                    </Typography>
                    
                    {/* Next Run Info */}
                    {task.next_run_timestamp && (
                      <Box sx={{ 
                        mt: 'auto',
                        pt: 2, 
                        borderTop: '1px solid', 
                        borderColor: 'grey.200' 
                      }}>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          {t('scheduler.nextRun')}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: 'success.main',
                          fontWeight: 500
                        }}>
                          {new Date(task.next_run_timestamp * 1000).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>

                {/* Actions */}
                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(task)}
                      sx={{ textTransform: 'none', fontWeight: 500 }}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(task.task_id)}
                      sx={{ textTransform: 'none', fontWeight: 500 }}
                    >
                      {t('common.delete')}
                    </Button>
                  </Box>
                  <Button
                    size="small"
                    variant={task.enabled ? 'outlined' : 'contained'}
                    startIcon={task.enabled ? <NotificationsOffIcon /> : <NotificationsActiveIcon />}
                    onClick={() => handleToggle(task.task_id, task.enabled)}
                    sx={{ textTransform: 'none', fontWeight: 500 }}
                  >
                    {task.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 3,
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.98) 0%, rgba(31, 37, 71, 0.99) 50%, rgba(26, 31, 60, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.99) 50%, rgba(255, 255, 255, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: (theme) => theme.palette.text.primary,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4caf50, #2196f3)',
              borderRadius: '3px 3px 0 0'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            background: 'linear-gradient(135deg, #4caf50, #2196f3)',
            display: 'flex',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
          }}>
            <EditIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {editingId ? t('scheduler.editTask') : t('scheduler.newTask')}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* General Settings Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SettingsIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                  General Settings
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label={t('scheduler.taskName')}
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>{t('scheduler.scheduleType')}</InputLabel>
                    <Select
                      value={formData.type}
                      label={t('scheduler.scheduleType')}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      startAdornment={
                        <InputAdornment position="start">
                          {formData.type === 'recurring' ? <RepeatIcon fontSize="small" /> : <TimerIcon fontSize="small" />}
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="one_time">{t('scheduler.oneTime')}</MenuItem>
                      <MenuItem value="recurring">{t('scheduler.recurring')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* Command Settings Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
                <PlayArrowIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                  Command Configuration
                </Typography>
              </Box>
              <Paper elevation={0} sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: '1px solid', borderColor: (theme) => alpha(theme.palette.primary.main, 0.1) }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>{t('scheduler.commandType')}</InputLabel>
                      <Select
                        value={formData.command}
                        label={t('scheduler.commandType')}
                        onChange={(e) => {
                          const newCommand = e.target.value;
                          // Reset related fields when switching command types
                          setFormData({
                            ...formData, 
                            command: newCommand,
                            target: newCommand === 'set_output' ? 'output1' : '',
                            value: newCommand === 'set_output' ? 'ON' : ''
                          });
                        }}
                        startAdornment={
                          <InputAdornment position="start">
                            {formData.command === 'set_output' ? <PowerSettingsNewIcon fontSize="small" /> : <SpeedIcon fontSize="small" />}
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="set_output">{t('scheduler.setOutput')}</MenuItem>
                        <MenuItem value="set_motor">{t('scheduler.setMotor')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.command === 'set_output' && (
                    <>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>{t('scheduler.target')}</InputLabel>
                          <Select
                            value={formData.target}
                            label={t('scheduler.target')}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                          >
                            <MenuItem value="output1">Output 1</MenuItem>
                            <MenuItem value="output2">Output 2</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <InputLabel>{t('scheduler.value')}</InputLabel>
                          <Select
                            value={formData.value}
                            label={t('scheduler.value')}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            startAdornment={
                              <InputAdornment position="start">
                                {formData.value === 'ON' ? <ToggleOnIcon color="success" /> : <ToggleOffIcon color="error" />}
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="ON">ON</MenuItem>
                            <MenuItem value="OFF">OFF</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </>
                  )}

                  {formData.command === 'set_motor' && (
                    <Grid item xs={12} md={8}>
                      <TextField
                        label="Motor Speed (0-100)"
                        fullWidth
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        InputProps={{
                          inputProps: { min: 0, max: 100 },
                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                        }}
                        helperText="Enter speed percentage"
                      />
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* Schedule Settings Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 1 }}>
                <ScheduleIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                  Schedule Details
                </Typography>
              </Box>
              
              <Paper elevation={0} sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4), borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                {formData.type === 'one_time' ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        type="datetime-local"
                        label={t('scheduler.executionTime')}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={formData.schedule}
                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Frequency</InputLabel>
                        <Select
                          value={recurrenceType}
                          label="Frequency"
                          onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                        >
                           <MenuItem value="every_minute">Every Minute(s)</MenuItem>
                           <MenuItem value="hourly">Hourly</MenuItem>
                           <MenuItem value="daily">Daily</MenuItem>
                           <MenuItem value="weekly">Weekly</MenuItem>
                           <MenuItem value="monthly">Monthly</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Dynamic Fields based on Recurrence Type */}
                    <Grid item xs={12} md={8}>
                      {recurrenceType === 'every_minute' && (
                        <TextField
                          type="number"
                          label="Minutes Interval"
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value)))}
                          fullWidth
                          helperText="Runs every X minutes"
                          InputProps={{
                             inputProps: { min: 1 }
                          }}
                        />
                      )}

                      {recurrenceType === 'hourly' && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                           <TextField
                            type="number"
                            label="Hours Interval"
                            value={recurrenceInterval}
                            onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value)))}
                            fullWidth
                            helperText="Every X hours"
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                          <TextField
                            type="number"
                            label="Minute offset"
                            value={selectedMinute}
                            onChange={(e) => setSelectedMinute(Math.min(59, Math.max(0, parseInt(e.target.value))))}
                            fullWidth
                            helperText="At minute (0-59)"
                            InputProps={{ inputProps: { min: 0, max: 59 } }}
                          />
                        </Box>
                      )}

                      {(recurrenceType === 'daily' || recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
                         <TextField
                          type="time"
                          label="At Time"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                        />
                      )}
                    </Grid>

                    {/* Weekly Days Selector */}
                    {recurrenceType === 'weekly' && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary', mb: 1.5 }}>
                          {t('scheduler.selectDays')}
                        </Typography>
                        <ToggleButtonGroup
                          value={selectedDays}
                          onChange={handleDaysChange}
                          aria-label="days of week"
                          size="medium"
                          fullWidth
                          sx={{ 
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            '& .MuiToggleButton-root': {
                              flex: 1,
                              border: '1px solid !important',
                              borderRadius: '8px !important',
                              py: 1,
                              px: 0.5,
                              minWidth: 40,
                              borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                              '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                borderColor: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                }
                              }
                            }
                          }}
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <ToggleButton key={day.value} value={day.value}>
                              {day.label}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Grid>
                    )}

                    {/* Monthly Day Selector */}
                    {recurrenceType === 'monthly' && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Day of Month</Typography>
                        <Slider
                          value={selectedMonthDay}
                          onChange={(_, val) => setSelectedMonthDay(val as number)}
                          min={1}
                          max={31}
                          valueLabelDisplay="auto"
                          marks={[
                            { value: 1, label: '1st' },
                            { value: 15, label: '15th' },
                            { value: 31, label: '31st' },
                          ]}
                        />
                        <Typography align="center" sx={{ mt: 1 }}>
                           On the {selectedMonthDay}{selectedMonthDay === 1 ? 'st' : selectedMonthDay === 2 ? 'nd' : selectedMonthDay === 3 ? 'rd' : 'th'} day
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            </Grid>

            {/* Active Switch */}
            <Grid item xs={12}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: formData.enabled ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.action.disabledBackground, 0.3),
                  border: '1px solid',
                  borderColor: formData.enabled ? alpha(theme.palette.success.main, 0.3) : 'transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                <FormControlLabel
                  control={
                    <Switch 
                      checked={formData.enabled} 
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      color="success"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={600}>
                        {t('scheduler.active')}
                      </Typography>
                      {formData.enabled && <CheckCircleIcon color="success" fontSize="small" />}
                    </Box>
                  }
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCloseDialog} size="large" sx={{ color: 'text.secondary' }}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            disabled={loading}
            sx={{ 
              px: 4,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4caf50, #2196f3)',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
            }}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardSchedulerTab;