import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

const OverviewChart = ({ metricsConfig, selectedVariables, isLoading, device, user }) => {
  const [selectedMetric, setSelectedMetric] = useState('');
  const [timeRange, setTimeRange] = useState('1h');
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const DASHBOARD_DATA_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";

  useEffect(() => {
    if (selectedVariables && selectedVariables.length > 0 && !selectedMetric) {
      setSelectedMetric(selectedVariables[0]);
    }
  }, [selectedVariables, selectedMetric]);

  useEffect(() => {
    if (selectedMetric && metricsConfig && selectedMetric in metricsConfig) {
      fetchChartData();
    }
  }, [selectedMetric, timeRange]);

  const fetchChartData = async () => {
    if (!selectedMetric || !device || !user) return;
    
    setChartLoading(true);
    try {
      const response = await fetch(DASHBOARD_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_dashboard_data',
          client_id: device.client_id,
          user_email: user.email,
          time_range: timeRange,
          points: timeRange === '1h' ? 60 :
                 timeRange === '6h' ? 72 :
                 timeRange === '24h' ? 96 :
                 timeRange === '7d' ? 168 :
                 60,
          include_state: true,
          selected_variables: [selectedMetric]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        const config = metricsConfig[selectedMetric];
        const chartData = {
          labels: result.data.map(d => new Date(d.timestamp.replace('Z', ''))),
          datasets: [{
            label: `${config.label} (${config.unit})`,
            data: result.data.map(d => parseFloat(d[selectedMetric])),
            borderColor: config.color,
            backgroundColor: `${config.color}20`,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: config.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        };
        setChartData(chartData);
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 11
          },
          usePointStyle: true
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM dd'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 10
          },
          color: '#666',
          maxTicksLimit: 6
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 10
          },
          color: '#666',
          callback: function(value) {
            return value.toFixed(1);
          }
        },
        title: {
          display: true,
          text: selectedMetric && metricsConfig[selectedMetric] ? metricsConfig[selectedMetric].unit : '',
          font: {
            size: 11
          },
          color: '#666'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (!metricsConfig || !selectedVariables || selectedVariables.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary' }}>
          Metric Chart
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="1h" sx={{ fontSize: '0.875rem' }}>1 Hour</MenuItem>
              <MenuItem value="6h" sx={{ fontSize: '0.875rem' }}>6 Hours</MenuItem>
              <MenuItem value="24h" sx={{ fontSize: '0.875rem' }}>24 Hours</MenuItem>
              <MenuItem value="7d" sx={{ fontSize: '0.875rem' }}>7 Days</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Select Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Select Metric"
              onChange={(e) => setSelectedMetric(e.target.value)}
              sx={{ fontSize: '0.875rem' }}
            >
              {selectedVariables.map((variable) => {
                const config = metricsConfig[variable];
                return (
                  <MenuItem key={variable} value={variable} sx={{ fontSize: '0.875rem' }}>
                    {config ? config.label : variable}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Box sx={{ height: 200, position: 'relative' }}>
        {(isLoading || chartLoading) ? (
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
              opacity: 0.7,
              borderRadius: 2
            }}
          >
            <CircularProgress size={24} />
          </Box>
        ) : !selectedMetric ? (
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
            <Typography color="text.secondary" variant="body2">
              Select a metric to view chart
            </Typography>
          </Box>
        ) : !chartData ? (
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
            <Typography color="text.secondary" variant="body2">
              No data available for selected time range
            </Typography>
          </Box>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </Box>
    </Paper>
  );
};

export default OverviewChart;
