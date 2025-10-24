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
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e3f2fd',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
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