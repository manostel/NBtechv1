import React from 'react';
import { Typography, Box, Paper, useTheme } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string | number | boolean | null | undefined;
  unit?: string;
  isText?: boolean;
  icon?: React.ReactElement;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, isText = false, icon, color }) => {
  const theme = useTheme();

  let displayValue: string | number;
  if (isText) {
    displayValue = String(value);
  } else if (typeof value === 'number') {
    displayValue = value.toFixed(1);
  } else {
    displayValue = String(value);
  }

  return (
    <Paper
      elevation={0}
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
        } as any)}
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

export default MetricCard;

