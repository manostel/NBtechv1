import React from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';

const OverviewTile = ({ title, value, unit, icon, color, isLoading }) => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[2]
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <Typography variant="h4" component="div" sx={{ mt: 1 }}>
          {value}
          {unit && (
            <Typography 
              component="span" 
              variant="body2" 
              color="textSecondary"
              sx={{ ml: 0.5 }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
      )}
    </Paper>
  );
};

const OverviewTiles = ({ 
  metricsData, 
  metricsConfig, 
  selectedVariables, 
  isLoading 
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Grid container spacing={2}>
        {selectedVariables.map((variable) => {
          const config = metricsConfig[variable];
          if (!config) return null;

          const latestData = metricsData?.data_latest?.[0];
          const value = latestData?.[variable] || 0;

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={variable}>
              <OverviewTile
                title={config.label}
                value={value.toFixed(1)}
                unit={config.unit}
                icon={config.icon}
                color={config.color}
                isLoading={isLoading}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

OverviewTile.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  icon: PropTypes.node,
  color: PropTypes.string,
  isLoading: PropTypes.bool
};

OverviewTiles.propTypes = {
  metricsData: PropTypes.object,
  metricsConfig: PropTypes.object,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  isLoading: PropTypes.bool
};

export default OverviewTiles; 