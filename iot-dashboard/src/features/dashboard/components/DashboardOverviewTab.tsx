import React from 'react';
import { Box, Grid, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon, ShowChart as ShowChartIcon } from '@mui/icons-material';
import OverviewTiles from './OverviewTiles';
import OverviewChart from './OverviewChart';
import VariableSelector from './VariableSelector';
import MetricCard from './MetricCard';
import type { DashboardData, MetricsConfig, Alarm, Device, User, DeviceData, DeviceStartTimeInfo } from '../../../types';

interface TriggeredAlarmsProps {
  triggeredAlarms: Alarm[];
  metricsConfig: MetricsConfig;
}

const TriggeredAlarms: React.FC<TriggeredAlarmsProps> = ({ triggeredAlarms, metricsConfig }) => {
  if (!triggeredAlarms || triggeredAlarms.length === 0) {
    return null;
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
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

  const getSeverityText = (severity?: string) => {
    if (!severity) return 'Info';
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Active Alarms
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
                      color: alarm.severity === 'error' ? 'error.main' : 
                            alarm.severity === 'warning' ? 'warning.main' : 'info.main',
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
      </List>
    </Paper>
  );
};

interface DashboardOverviewTabProps {
  metricsData: DashboardData | null;
  metricsConfig: MetricsConfig | null;
  selectedVariables: string[];
  availableVariables: string[];
  deviceState: DeviceData | null;
  isLoading: boolean;
  onVariableChange: (event: any) => void; // TODO: Better event type
  triggeredAlarms: Alarm[];
  deviceStartTimeInfo?: DeviceStartTimeInfo | null;
  device: Device;
  user: User;
}

const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({ 
  metricsData, 
  metricsConfig,
  selectedVariables,
  availableVariables,
  deviceState,
  isLoading,
  onVariableChange,
  triggeredAlarms,
  deviceStartTimeInfo,
  device,
  user
}) => {
  if (!metricsData || !metricsConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  const renderOverviewCards = () => {
    if (!metricsData || !metricsConfig) return null;

    // Get the latest data point
    const latestData = metricsData.data_latest?.[0] || metricsData.data?.[0] || {};
    
    return Object.entries(metricsConfig).map(([key, config]) => {
      if (key === 'client_id' || key === 'ClientID') return null;
      
      const value = latestData[key];
      if (value === undefined || value === null) return null;

      const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
      
      return (
        <Grid item xs={6} sm={6} md={4} lg={3} key={key}>
          <MetricCard
            title={config.label}
            value={displayValue}
            unit={config.unit}
            color={config.color}
          />
        </Grid>
      );
    }).filter(Boolean); // Remove null entries
  };

  return (
    <Box sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Section 1: Metrics Tiles */}
      <Box sx={{ 
        position: 'relative',
        mb: 3,
      }}>
        {/* Section Header - Matching Tile Style */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          px: 2,
          py: 1.5,
          background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.85) 0%, rgba(31, 37, 71, 0.92) 50%, rgba(26, 31, 60, 0.85) 100%)',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              p: 0.5, 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4caf50, #2196f3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <ShowChartIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
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
              Live Metrics
            </Typography>
          </Box>
          <VariableSelector
            variables={availableVariables}
            selectedVariables={selectedVariables}
            onVariableChange={onVariableChange}
            showTitle={false}
          />
        </Box>

        {/* Metrics Tiles */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <OverviewTiles
            metricsData={metricsData}
            metricsConfig={metricsConfig}
            selectedVariables={selectedVariables}
            isLoading={isLoading}
            triggeredAlarms={triggeredAlarms}
            deviceState={deviceState}
          />
        </Box>
      </Box>

      {/* Section 2: Data Visualization */}
      <Box sx={{ 
        position: 'relative',
      }}>
        {/* Section Header - Matching Tile Style */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          px: 2,
          py: 1.5,
          background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.85) 0%, rgba(31, 37, 71, 0.92) 50%, rgba(26, 31, 60, 0.85) 100%)',
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
          },
        }}>
          <Box sx={{ 
            p: 0.5, 
            borderRadius: 2,
          background: 'linear-gradient(135deg, #4caf50, #2196f3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <ShowChartIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
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
            Data Visualization
          </Typography>
        </Box>

        {/* Chart Section */}
        <OverviewChart
          metricsConfig={metricsConfig}
          selectedVariables={selectedVariables}
          isLoading={isLoading}
          device={device}
          user={user}
        />
      </Box>

    </Box>
  );
};

export default DashboardOverviewTab;
