import React from 'react';
import { Box, Grid, Paper, Skeleton } from '@mui/material';

const DashboardSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="300px" height={40} />
        <Skeleton variant="text" width="200px" height={24} />
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Main Metrics Card */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Skeleton variant="text" width="200px" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={300} />
          </Paper>
        </Grid>

        {/* Side Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '400px' }}>
            <Skeleton variant="text" width="150px" height={32} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Box key={i}>
                  <Skeleton variant="text" width="140px" height={24} />
                  <Skeleton variant="rectangular" height={50} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Bottom Cards */}
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={4} key={i}>
            <Paper sx={{ p: 2, height: '200px' }}>
              <Skeleton variant="text" width="150px" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={120} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardSkeleton; 