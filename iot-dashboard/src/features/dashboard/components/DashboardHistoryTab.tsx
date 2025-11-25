import React from 'react';
import { Box, Typography } from '@mui/material';
import DashboardHistory from './DashboardHistory';
import { MetricsConfig } from '../../../types';

interface DashboardHistoryTabProps {
  metricsData: any[];
  metricsConfig: MetricsConfig;
}

const DashboardHistoryTab: React.FC<DashboardHistoryTabProps> = ({ metricsData, metricsConfig }) => {
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

