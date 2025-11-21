import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function DashboardHistory({ metricsData, metricsConfig }) {
  const theme = useTheme();

  if (!metricsData || metricsData.length === 0) {
    return (
      <Paper sx={{ 
        p: 3, mt: 3,
        borderRadius: 3,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)'
      }}>
        <Typography color="text.secondary">
          No historical data available
        </Typography>
      </Paper>
    );
  }

  // Get all metric keys except timestamp
  const metricKeys = Object.keys(metricsConfig).filter(key => !['client_id', 'ClientID'].includes(key));

  return (
    <Paper sx={{ 
      p: 3, mt: 3,
      borderRadius: 3,
      background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
      backdropFilter: 'blur(12px)',
      border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
      boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)'
    }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Historical Data
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              {metricKeys.map(key => (
                <TableCell key={key} align="right">
                  {metricsConfig[key]?.label || key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {metricsData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  {new Date(row.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
                </TableCell>
                {metricKeys.map(key => (
                  <TableCell key={key} align="right">
                    {row[key] !== undefined && row[key] !== null 
                      ? `${row[key].toFixed(1)}${metricsConfig[key]?.unit || ''}`
                      : '--'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
} 