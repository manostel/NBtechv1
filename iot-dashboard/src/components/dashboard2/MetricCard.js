import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function MetricCard({ label, value, unit, color, icon: Icon }) {
  const theme = useTheme();

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          boxShadow: theme.shadows[4],
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {Icon && (
            <Icon 
              sx={{ 
                mr: 1,
                color: color || theme.palette.primary.main,
                fontSize: '1.5rem'
              }} 
            />
          )}
          <Typography 
            variant="subtitle2" 
            color="text.secondary"
            sx={{ textTransform: 'uppercase' }}
          >
            {label}
          </Typography>
        </Box>
        <Typography 
          variant="h4" 
          component="div"
          sx={{ 
            fontWeight: 'bold',
            color: color || theme.palette.primary.main
          }}
        >
          {value !== undefined && value !== null ? value.toFixed(1) : '--'}
          {unit && (
            <Typography 
              component="span" 
              variant="body2"
              sx={{ 
                ml: 0.5,
                color: 'text.secondary',
                fontWeight: 'normal'
              }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );
} 