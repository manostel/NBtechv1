import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DeviceInfoCard from "../DeviceInfoCard";
import MetricCard from "./MetricCard";

export default function DashboardContent({ 
  device, 
  deviceState, 
  metricsData, 
  metricsConfig, 
  isLoading 
}) {
  const theme = useTheme();

  return (
    <>
      <DeviceInfoCard
        clientID={device.client_id}
        deviceName={device.device_name}
        deviceType={device.device_type || device.latest_data?.device || 'Unknown'}
        status={deviceState.status}
        lastOnline={deviceState.timestamp ? new Date(deviceState.timestamp).toLocaleString() : "N/A"}
        batteryLevel={metricsData.battery?.[metricsData.battery.length - 1]}
        signalStrength={metricsData.signal_quality?.[metricsData.signal_quality.length - 1]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(metricsConfig).map(([key, config]) => {
          if (key === 'client_id' || key === 'ClientID') return null;
          
          const value = metricsData[key]?.[metricsData[key].length - 1];
          const displayValue = value !== undefined && !isNaN(value) ? value.toFixed(1) : 'N/A';
          
          return (
            <Grid item xs={6} sm={6} md={3} key={key}>
              <Paper 
                elevation={1}
                sx={{ 
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: theme.palette.background.paper,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {config.icon}
                  <Typography variant="subtitle1" color="primary">
                    {config.label}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {displayValue}{value !== undefined && !isNaN(value) ? config.unit : ''}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Latest
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: value !== undefined && !isNaN(value) ? (
                        config.alertThresholds.max && value > config.alertThresholds.max ? 'error.main' :
                        config.alertThresholds.min && value < config.alertThresholds.min ? 'warning.main' :
                        'success.main'
                      ) : 'grey.500'
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {value !== undefined && !isNaN(value) ? (
                      config.alertThresholds.max && value > config.alertThresholds.max ? 'High' :
                      config.alertThresholds.min && value < config.alertThresholds.min ? 'Low' :
                      'Normal'
                    ) : 'No Data'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
} 