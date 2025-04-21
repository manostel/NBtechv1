import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const MetricCard = ({ title, value, unit, isText = false }) => {
  const theme = useTheme();

  const displayValue = isText 
    ? value 
    : typeof value === 'number' 
      ? value.toFixed(1) 
      : value;

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
          <Typography 
            variant="subtitle2" 
            color="text.secondary"
            sx={{ textTransform: 'uppercase' }}
          >
            {title}
          </Typography>
        </Box>
        <Typography 
          variant="h5" 
          component="div"
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.main
          }}
        >
          {displayValue}
          {!isText && unit && (
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
};

export default MetricCard; 