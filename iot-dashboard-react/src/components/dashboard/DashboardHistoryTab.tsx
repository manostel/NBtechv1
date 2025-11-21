import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import DashboardHistory from './DashboardHistory';

const DashboardHistoryTab = ({ metricsData, metricsConfig }) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 3, px: { xs: 0, sm: 3 } }}>
      <Typography variant="h6" gutterBottom>
        Device History
      </Typography>
      <DashboardHistory 
        metricsData={metricsData}
        metricsConfig={metricsConfig}
      />
    </Box>
  );
};

export default DashboardHistoryTab; 