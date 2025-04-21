import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function DashboardHistory({ metricsData, metricsConfig }) {
  const theme = useTheme();

  if (!metricsData || metricsData.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography color="text.secondary">
          No historical data available
        </Typography>
      </Paper>
    );
  }

  // Get all metric keys except timestamp
  const metricKeys = Object.keys(metricsConfig).filter(key => !['client_id', 'ClientID'].includes(key));

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
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
                  {new Date(row.timestamp).toLocaleTimeString()}
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