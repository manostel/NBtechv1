import React from 'react';
import { Box, Grid, Paper, Skeleton, useTheme } from '@mui/material';

const DashboardSkeleton: React.FC = () => {
  const theme = useTheme();
  const paperSx = {
    p: 2,
    height: '100%',
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
    borderRadius: 3,
    backdropFilter: 'blur(12px)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 6px 24px rgba(0, 0, 0, 0.35)'
      : '0 6px 24px rgba(0, 0, 0, 0.08)'
  };

  const skeletonBase = {
    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  };

  return (
    <Box sx={{ 
      p: 3,
      minHeight: '100vh',
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #141829 0%, #1a1f3c 50%, #141829 100%)'
        : 'linear-gradient(135deg, #f5f5f5 0%, #e8f4fd 50%, #f5f5f5 100%)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.08) 0%, transparent 50%)'
          : 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.04) 0%, transparent 50%)',
        pointerEvents: 'none'
      }
    }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="300px" height={40} sx={skeletonBase} />
        <Skeleton variant="text" width="200px" height={24} sx={skeletonBase} />
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Main Metrics Card */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ ...paperSx, height: '400px' }}>
            <Skeleton variant="text" width="200px" height={32} sx={{ mb: 2, ...skeletonBase }} />
            <Skeleton variant="rectangular" height={300} sx={skeletonBase} />
          </Paper>
        </Grid>

        {/* Side Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...paperSx, height: '400px' }}>
            <Skeleton variant="text" width="150px" height={32} sx={{ mb: 2, ...skeletonBase }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Box key={i}>
                  <Skeleton variant="text" width="140px" height={24} sx={skeletonBase} />
                  <Skeleton variant="rectangular" height={50} sx={skeletonBase} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Bottom Cards */}
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={4} key={i}>
            <Paper sx={{ ...paperSx, height: '200px' }}>
              <Skeleton variant="text" width="150px" height={32} sx={{ mb: 2, ...skeletonBase }} />
              <Skeleton variant="rectangular" height={120} sx={skeletonBase} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardSkeleton;


