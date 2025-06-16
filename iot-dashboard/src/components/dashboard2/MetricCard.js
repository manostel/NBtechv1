import React from 'react';
import { Typography, Box, Paper, useTheme } from '@mui/material';
import PropTypes from 'prop-types';

const MetricCard = ({ title, value, unit, isText = false, icon, color }) => {
  const theme = useTheme();

  const displayValue = isText 
    ? value 
    : typeof value === 'number' 
      ? value.toFixed(1) 
      : value;

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
        {icon && React.cloneElement(icon, {
          sx: {
            color: color || theme.palette.primary.main,
            fontSize: 24
          }
        })}
        <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
      <Typography variant="h4" component="div" sx={{ mt: 1 }}>
          {displayValue}
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
    </Paper>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  unit: PropTypes.string,
  isText: PropTypes.bool,
  icon: PropTypes.element,
  color: PropTypes.string,
};

export default MetricCard; 