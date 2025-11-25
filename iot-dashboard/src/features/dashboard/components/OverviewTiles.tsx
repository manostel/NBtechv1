import React from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { DashboardData, MetricsConfig, Alarm } from '../../../types';

const getSeverityIcon = (severity?: string) => {
  switch (severity?.toLowerCase()) {
    case 'error':
      return <ErrorIcon color="error" sx={{ fontSize: '1rem' }} />;
    case 'warning':
      return <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />;
    case 'info':
      return <InfoIcon color="info" sx={{ fontSize: '1rem' }} />;
    default:
      return <InfoIcon color="info" sx={{ fontSize: '1rem' }} />;
  }
};

interface OverviewTileProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  triggeredAlarmsList: Alarm[];
  isStatus?: boolean;
}

const OverviewTile: React.FC<OverviewTileProps> = ({ title, value, unit, icon, color, isLoading, triggeredAlarmsList, isStatus = false }) => {
  const theme = useTheme();
  const alarmActive = Array.isArray(triggeredAlarmsList) && triggeredAlarmsList.length > 0;
  const [alarmDialogOpen, setAlarmDialogOpen] = React.useState(false);

  const getHighestSeverity = (alarms: Alarm[]) => {
    if (!alarms || alarms.length === 0) return 'info';
    if (alarms.some(alarm => alarm.severity?.toLowerCase() === 'error')) return 'error';
    if (alarms.some(alarm => alarm.severity?.toLowerCase() === 'warning')) return 'warning';
    return 'info';
  };

  const getTooltipTitle = (alarms: Alarm[]) => {
    if (!alarms || alarms.length === 0) return 'No alarms triggered';
    if (alarms.length === 1) return alarms[0].description || 'Alarm triggered';
    return (
      <>
        <Typography color="inherit">Multiple Alarms Triggered:</Typography>
        {alarms.map((alarm, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            {getSeverityIcon(alarm.severity)}
            <Typography variant="caption" display="block" color="inherit" sx={{ ml: 0.5 }}>
              {alarm.description || `Alarm ${index + 1} triggered`}
            </Typography>
          </Box>
        ))}
      </>
    );
  };

  const overallAlarmSeverity = getHighestSeverity(triggeredAlarmsList);
  const tooltipTitle = getTooltipTitle(triggeredAlarmsList);

  return (
    <Paper 
      elevation={0}
      onClick={alarmActive ? () => setAlarmDialogOpen(true) : undefined}
      sx={{ 
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        color: theme.palette.text.primary,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: alarmActive ? 'pointer' : 'default',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)',
          transition: 'background 0.3s ease',
        },
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          '&::before': {
            background: theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #5cbf60, #3399f3)' : 'linear-gradient(90deg, #1e88e5, #43a047)',
          }
        }
      }}
    >
      {/* Icon, title, and alarm indicator in one row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minHeight: 24 }}>
        {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
        {isStatus && (
          <FiberManualRecordIcon 
            sx={{ 
              mr: 1, 
              fontSize: '1.2rem',
              color: value === 'ON' ? '#4caf50' : '#9e9e9e'
            }} 
          />
        )}
        <Typography variant="subtitle2" sx={{ 
          fontWeight: 400, 
          fontSize: '0.95rem', 
          textAlign: 'left',
          color: 'rgba(224, 224, 224, 0.8)'
        }}>
          {title}
        </Typography>
        {alarmActive && (
          <Tooltip 
            title={tooltipTitle}
            arrow
            placement="top"
          >
            <Box sx={{ ml: 1, cursor: 'help', display: 'flex', alignItems: 'center' }}>
              {getSeverityIcon(overallAlarmSeverity)}
            </Box>
          </Tooltip>
        )}
      </Box>
      {/* Value and unit */}
      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 0.5, ml: 0 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{ fontSize: '1.2rem', fontWeight: 400, lineHeight: 1 }}
          >
            {value}
          </Typography>
          {unit && (
            <Typography component="span" variant="body2" sx={{ 
              fontSize: '0.9rem', 
              ml: 0,
              color: 'rgba(224, 224, 224, 0.7)'
            }}>
              {unit}
            </Typography>
          )}
        </Box>
      )}
      <Dialog 
        open={alarmDialogOpen} 
        onClose={() => setAlarmDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)',
            color: '#E0E0E0',
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
        <DialogTitle sx={{ color: '#E0E0E0' }}>{`Alarms - ${title}`}</DialogTitle>
        <DialogContent dividers sx={{ color: '#E0E0E0' }}>
          {alarmActive ? (
            <List dense>
              {triggeredAlarmsList.map((alarm, index) => (
                <ListItem key={index} alignItems="flex-start">
                  <ListItemIcon>
                    {getSeverityIcon(alarm.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={alarm.description || 'Alarm triggered'}
                    secondary={`Severity: ${alarm.severity || 'info'}${alarm.threshold !== undefined ? ` • Threshold: ${alarm.threshold}` : ''}${alarm.current_value !== undefined ? ` • Current: ${alarm.current_value}` : ''}`}
                    primaryTypographyProps={{ sx: { color: '#E0E0E0' } }}
                    secondaryTypographyProps={{ sx: { color: 'rgba(224, 224, 224, 0.7)' } }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>No alarms triggered.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAlarmDialogOpen(false);
            }} 
            variant="contained"
            sx={{ color: '#E0E0E0' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

interface OverviewTilesProps {
  metricsData: DashboardData | null;
  metricsConfig: MetricsConfig | null;
  selectedVariables: string[];
  isLoading: boolean;
  triggeredAlarms: Alarm[];
  deviceState?: any; // TODO: Define precise DeviceState type
}

const OverviewTiles: React.FC<OverviewTilesProps> = ({ 
  metricsData, 
  metricsConfig, 
  selectedVariables, 
  isLoading,
  triggeredAlarms,
  deviceState
}) => {

  if (!metricsData || !metricsConfig || !selectedVariables) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={1}>
        {selectedVariables.map((variable) => {
          const config = metricsConfig[variable];
          if (!config) return null;

          // Get the latest data point
          const latestData = metricsData.data_latest?.[0] || metricsData.data?.[0] || {};

          const value = latestData[variable];
          if (value === undefined || value === null) {
            return null;
          }

          // Find ALL triggered alarms for this variable
          const triggeredAlarmsList = Array.isArray(triggeredAlarms) 
            ? triggeredAlarms.filter(alarm => alarm.variable_name === variable)
            : [];


          return (
            <Grid item xs={6} sm={6} md={4} lg={3} key={variable}>
              <OverviewTile
                title={config.label}
                value={typeof value === 'number' ? value.toFixed(1) : '0.0'}
                unit={config.unit}
                icon={config.icon}
                color={config.color}
                isLoading={isLoading}
                triggeredAlarmsList={triggeredAlarmsList}
              />
            </Grid>
          );
        })}

        {/* Device Status Tiles */}
        {deviceState ? (
          <>
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2, 
                mt: 2, 
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
                  opacity: 0.6 
                } 
              }}>
                <Box sx={{ 
                  p: 0.5, 
                  borderRadius: 2, 
                  background: 'linear-gradient(135deg, #4caf50, #2196f3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)' 
                }}>
                  <SettingsIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
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
                  WebkitTextFillColor: 'transparent', 
                  lineHeight: 1.2 
                }}>
                  Device Status
                </Typography>
              </Box>
            </Grid>
            {/* Input States - Grouped together (2 per row) */}
            <Grid item xs={6} sm={6}>
              <OverviewTile
                title="Input 1"
                value={deviceState.in1_state === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>

            <Grid item xs={6} sm={6}>
              <OverviewTile
                title="Input 2"
                value={deviceState.in2_state === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>

            {/* Output States - Grouped together (2 per row) */}
            <Grid item xs={6} sm={6}>
              <OverviewTile
                title="Output 1"
                value={deviceState.out1_state === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>

            <Grid item xs={6} sm={6}>
              <OverviewTile
                title="Output 2"
                value={deviceState.out2_state === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>

            {/* Charging Status */}
            <Grid item xs={6} sm={6} md={4} lg={3}>
              <OverviewTile
                title="Charging"
                value={deviceState.charging === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>

            {/* Motor Speed */}
            <Grid item xs={6} sm={6} md={4} lg={3}>
              <OverviewTile
                title="Motor Speed"
                value={deviceState.motor_speed || 0}
                unit="%"
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
              />
            </Grid>

            {/* Power Saving */}
            <Grid item xs={6} sm={6} md={4} lg={3}>
              <OverviewTile
                title="Power Saving"
                value={deviceState.power_saving === 1 ? 'ON' : 'OFF'}
                icon={undefined}
                color="#2196f3"
                isLoading={isLoading}
                triggeredAlarmsList={[]}
                isStatus={true}
              />
            </Grid>
          </>
        ) : (
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
              No device state data available
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default OverviewTiles;

