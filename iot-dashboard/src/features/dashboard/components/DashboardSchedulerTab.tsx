import React, { useState, useEffect } from 'react';
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
  alpha
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
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Device } from '../../../types';

interface ScheduledTask {
  id: string;
  name: string;
  command: string;
  target: string; // e.g., 'output1', 'motor_speed'
  value: string | number;
  type: 'one_time' | 'recurring';
  schedule: string; // ISO date for one_time, cron expression for recurring
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface DashboardSchedulerTabProps {
  device: Device;
}

const DashboardSchedulerTab: React.FC<DashboardSchedulerTabProps> = ({ device }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // Mock data for now
  const [schedules, setSchedules] = useState<ScheduledTask[]>([
    {
      id: '1',
      name: 'Morning Lights On',
      command: 'set_output',
      target: 'output1',
      value: 'ON',
      type: 'recurring',
      schedule: '0 8 * * *',
      enabled: true,
      nextRun: '2025-11-26T08:00:00'
    },
    {
      id: '2',
      name: 'Evening Shutdown',
      command: 'set_output',
      target: 'all_outputs',
      value: 'OFF',
      type: 'recurring',
      schedule: '0 22 * * *',
      enabled: true,
      nextRun: '2025-11-25T22:00:00'
    }
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ScheduledTask>>({
    name: '',
    command: 'set_output',
    target: 'output1',
    value: '',
    type: 'one_time',
    schedule: '',
    enabled: true
  });

  // Recurring schedule state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  const DAYS_OF_WEEK = [
    { value: '1', label: t('scheduler.days.mon') },
    { value: '2', label: t('scheduler.days.tue') },
    { value: '3', label: t('scheduler.days.wed') },
    { value: '4', label: t('scheduler.days.thu') },
    { value: '5', label: t('scheduler.days.fri') },
    { value: '6', label: t('scheduler.days.sat') },
    { value: '0', label: t('scheduler.days.sun') },
  ];

  // Parse cron expression to state
  const parseCronToState = (cron: string) => {
    try {
      const parts = cron.split(' ');
      if (parts.length >= 5) {
        // Time: minute hour
        const minute = parts[0].padStart(2, '0');
        const hour = parts[1].padStart(2, '0');
        setSelectedTime(`${hour}:${minute}`);

        // Days: part 4 (0-6)
        const days = parts[4];
        if (days === '*') {
          setSelectedDays(['0', '1', '2', '3', '4', '5', '6']);
        } else {
          setSelectedDays(days.split(','));
        }
      }
    } catch (e) {
      console.error('Error parsing cron:', e);
      // Fallback defaults
      setSelectedTime('12:00');
      setSelectedDays([]);
    }
  };

  // Generate cron expression from state
  const generateCronFromState = (time: string, days: string[]) => {
    if (!time || days.length === 0) return '';
    
    const [hour, minute] = time.split(':');
    const daysString = days.length === 7 ? '*' : days.sort().join(',');
    
    // Minute Hour DayOfMonth Month DayOfWeek
    // Using * for DayOfMonth and Month to mean "every"
    // Note: In cron, minute comes first, but leading zeros usually don't matter for value but valid format
    return `${parseInt(minute)} ${parseInt(hour)} * * ${daysString}`;
  };

  // Update formData.schedule when recurring state changes
  useEffect(() => {
    if (formData.type === 'recurring' && openDialog) {
      const cron = generateCronFromState(selectedTime, selectedDays);
      setFormData(prev => ({ ...prev, schedule: cron }));
    }
  }, [selectedDays, selectedTime, formData.type, openDialog]);

  const handleOpenDialog = (task?: ScheduledTask) => {
    if (task) {
      setEditingId(task.id);
      setFormData({ ...task });
      
      if (task.type === 'recurring') {
        parseCronToState(task.schedule);
      } else {
        // Reset defaults for recurring if switching types
        setSelectedTime('12:00');
        setSelectedDays([]);
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        command: 'set_output',
        target: 'output1',
        value: '',
        type: 'one_time',
        schedule: '',
        enabled: true
      });
      // Reset defaults
      setSelectedTime('12:00');
      setSelectedDays([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (editingId) {
      setSchedules(prev => prev.map(s => s.id === editingId ? { ...s, ...formData } as ScheduledTask : s));
    } else {
      const newTask: ScheduledTask = {
        id: Date.now().toString(),
        ...formData as ScheduledTask
      };
      setSchedules(prev => [...prev, newTask]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleToggle = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const formatScheduleDisplay = (type: string, schedule: string) => {
    if (type === 'one_time') {
      return new Date(schedule).toLocaleString();
    }
    
    try {
      const parts = schedule.split(' ');
      if (parts.length >= 5) {
        const minute = parts[0].padStart(2, '0');
        const hour = parts[1].padStart(2, '0');
        const days = parts[4];
        
        let daysDisplay = '';
        if (days === '*') {
          daysDisplay = t('scheduler.everyDay');
        } else {
          const dayMap: {[key: string]: string} = {
            '0': t('scheduler.days.sun'),
            '1': t('scheduler.days.mon'),
            '2': t('scheduler.days.tue'),
            '3': t('scheduler.days.wed'),
            '4': t('scheduler.days.thu'),
            '5': t('scheduler.days.fri'),
            '6': t('scheduler.days.sat'),
          };
          
          daysDisplay = days.split(',').map(d => dayMap[d]).join(', ');
        }
        
        return `${daysDisplay} @ ${hour}:${minute}`;
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

      {schedules.length === 0 ? (
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
            <Grid item xs={12} md={6} lg={4} key={task.id}>
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
                      {t('scheduler.command')}: <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{task.command} ({task.target}: {task.value})</Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ScheduleIcon fontSize="small" /> 
                      {t('scheduler.schedule')}: <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{formatScheduleDisplay(task.type, task.schedule)}</Box>
                    </Typography>
                    
                    {/* Next Run Info */}
                    {task.nextRun && (
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
                          {new Date(task.nextRun).toLocaleString()}
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
                      onClick={() => handleDelete(task.id)}
                      sx={{ textTransform: 'none', fontWeight: 500 }}
                    >
                      {t('common.delete')}
                    </Button>
                  </Box>
                  <Button
                    size="small"
                    variant={task.enabled ? 'outlined' : 'contained'}
                    startIcon={task.enabled ? <NotificationsOffIcon /> : <NotificationsActiveIcon />}
                    onClick={() => handleToggle(task.id)}
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
                        onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      >
                        <MenuItem value="set_output">{t('scheduler.setOutput')}</MenuItem>
                        <MenuItem value="set_motor">{t('scheduler.setMotor')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('scheduler.target')}
                      fullWidth
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      helperText="e.g., output1, motor"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label={t('scheduler.value')}
                      fullWidth
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      helperText="e.g., ON, OFF, 50"
                    />
                  </Grid>
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
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                        <Button 
                          variant="outlined"
                          size="small" 
                          onClick={() => setSelectedDays(['1', '2', '3', '4', '5', '6', '0'])}
                          sx={{ borderRadius: 4, textTransform: 'none' }}
                        >
                          {t('scheduler.everyDay')}
                        </Button>
                        <Button 
                          variant="outlined"
                          size="small" 
                          onClick={() => setSelectedDays(['1', '2', '3', '4', '5'])}
                          sx={{ borderRadius: 4, textTransform: 'none' }}
                        >
                          {t('scheduler.weekdays')}
                        </Button>
                        <Button 
                          variant="outlined"
                          size="small" 
                          onClick={() => setSelectedDays(['6', '0'])}
                          sx={{ borderRadius: 4, textTransform: 'none' }}
                        >
                          {t('scheduler.weekends')}
                        </Button>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        type="time"
                        label={t('scheduler.selectTime')}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        sx={{ 
                          '& input': { fontSize: '1.2rem', fontWeight: 500, letterSpacing: 1 }
                        }}
                      />
                    </Grid>
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
            startIcon={<CheckCircleIcon />}
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