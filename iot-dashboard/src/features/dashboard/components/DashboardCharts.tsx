import React from 'react';
import { Paper, Box, Typography, CircularProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { crosshairPlugin } from '../../../utils/chartCrosshairPlugin';
import { MetricsConfig } from '../../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  crosshairPlugin
);

interface DashboardChartsProps {
  metricsData: { [key: string]: number[] };
  metricsConfig: MetricsConfig;
  isLoading: boolean;
}

export default function DashboardCharts({ metricsData, metricsConfig, isLoading }: DashboardChartsProps) {
  const firstMetricKey = Object.keys(metricsData)[0];
  const chartData = {
    labels: Array.from({ length: metricsData[firstMetricKey]?.length || 0 }, (_, i) => {
      const now = new Date();
      const timeAgo = now.getTime() - (i * 60000); // Assuming 1-minute intervals
      return new Date(timeAgo).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }),
    datasets: Object.entries(metricsConfig)
      .filter(([key]) => !['client_id', 'ClientID'].includes(key))
      .map(([key, config]) => ({
        label: config.label || key,
        data: metricsData[key] || [],
        borderColor: config.color || '#2196f3',
        backgroundColor: config.color ? `${config.color}20` : '#2196f320',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2
      }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      axis: 'x',
      intersect: false
    },
    onHover: (event: any, activeElements: any[]) => {
      if (event.native?.target) {
        (event.native.target as HTMLElement).style.cursor = activeElements.length > 0 ? 'crosshair' : 'default';
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        }
      },
      // @ts-ignore - crosshair plugin typing issues
      crosshair: {
        width: 2,
        color: 'rgba(255, 255, 255, 0.6)',
        dash: [5, 5]
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      }
    },
  };

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Metrics History
      </Typography>
      <Box sx={{ flex: 1, position: 'relative' }}>
        {isLoading ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              opacity: 0.7
            }}
          >
            <CircularProgress />
          </Box>
        ) : Object.keys(metricsData).length === 0 ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography color="text.secondary">
              No data available for the selected time range
            </Typography>
          </Box>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </Box>
    </Paper>
  );
}

