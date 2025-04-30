import React, { useState } from 'react';
import { Box, Grid, Typography, Paper, useTheme, FormControlLabel, Switch } from '@mui/material';
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import SharedControls from './SharedControls';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const DashboardChartsTab = ({ 
  metricsData, 
  metricsConfig, 
  timeRange, 
  chartConfig,
  selectedVariables,
  availableVariables,
  onVariableChange,
  onTimeRangeChange,
  onApply
}) => {
  const theme = useTheme();
  const chartRef = React.useRef(null);
  const [combinedView, setCombinedView] = useState(false);

  const renderCombinedChart = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const datasets = selectedVariables
      .filter(key => metricsConfig[key] && data[0][key] !== undefined)
      .map(key => {
        const config = metricsConfig[key];
        return {
          label: `${config.label} (${config.unit})`,
          data: data.map(d => parseFloat(d[key])),
          borderColor: config.color,
          backgroundColor: `${config.color}40`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: chartConfig.showPoints ? 3 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: config.color,
          pointBorderColor: config.color,
          pointBorderWidth: 2
        };
      });

    const chartData = {
      labels: data.map(d => new Date(d.timestamp)),
      datasets
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: "top", 
          labels: { 
            color: theme.palette.text.primary,
            boxWidth: window.innerWidth < 600 ? 10 : 40,
            padding: window.innerWidth < 600 ? 8 : 10,
            font: {
              size: window.innerWidth < 600 ? 10 : 12
            }
          },
          display: true
        },
        title: { 
          display: true, 
          text: "Combined Metrics", 
          color: theme.palette.text.primary,
          font: {
            size: window.innerWidth < 600 ? 14 : 16,
            weight: 'bold'
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: true,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "time",
          time: { 
            unit: timeRange === 'live' ? 'second' :
                  timeRange === '15m' ? 'minute' :
                  timeRange === '1h' ? 'minute' :
                  timeRange === '24h' || timeRange === '2d' || timeRange === '3d' ? 'hour' : 'minute',
            tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                          (timeRange === '24h' || timeRange === '2d' || timeRange === '3d') ? "MMM dd, HH:mm" : "HH:mm",
            displayFormats: {
              second: 'HH:mm:ss',
              minute: 'HH:mm',
              hour: 'MMM dd, HH:mm',
              day: 'MMM dd'
            }
          },
          title: { 
            display: true, 
            text: "Time", 
            color: theme.palette.text.primary,
            font: { weight: 'bold' }
          },
          ticks: {
            maxRotation: window.innerWidth < 600 ? 60 : 45,
            minRotation: window.innerWidth < 600 ? 60 : 45,
            source: 'data',
            autoSkip: true,
            maxTicksLimit: timeRange === '15m' ? 15 : 
                          timeRange === 'live' ? 4 : 10,
            font: {
              size: window.innerWidth < 600 ? 8 : 10
            }
          },
          grid: {
            display: chartConfig.showGrid
          }
        },
        y: {
          beginAtZero: true,
          ticks: { 
            color: theme.palette.text.primary,
            font: {
              size: window.innerWidth < 600 ? 8 : 10
            },
            maxTicksLimit: window.innerWidth < 600 ? 5 : 10,
            callback: function(value) {
              // Get all unique units from the selected variables
              const units = [...new Set(selectedVariables
                .filter(key => metricsConfig[key])
                .map(key => metricsConfig[key].unit))];
              
              // If all metrics have the same unit, show it once
              if (units.length === 1) {
                return `${value} ${units[0]}`;
              }
              
              // Otherwise, just show the value
              return value;
            }
          },
          grid: { 
            color: chartConfig.showGrid ? "rgba(255,255,255,0.1)" : "transparent",
            drawBorder: false
          },
        },
      }
    };

    return (
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Line 
          data={chartData} 
          options={chartOptions} 
          ref={chartEl => {
            if (chartEl) {
              chartRef.current = chartEl;
            }
          }} 
        />
      </Box>
    );
  };

  const renderChart = (data, metricKey) => {
    const config = metricsConfig[metricKey];
    if (!config || !data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const chartData = {
      labels: data.map(d => new Date(d.timestamp)),
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data: data.map(d => parseFloat(d[metricKey])),
          borderColor: config.color,
          backgroundColor: `${config.color}40`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: chartConfig.showPoints ? 3 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: config.color,
          pointBorderColor: config.color,
          pointBorderWidth: 2
        }
      ]
    };

    const chartSpecificOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: "top", 
          labels: { 
            color: theme.palette.text.primary,
            boxWidth: window.innerWidth < 600 ? 10 : 40,
            padding: window.innerWidth < 600 ? 8 : 10,
            font: {
              size: window.innerWidth < 600 ? 10 : 12
            }
          },
          display: true
        },
        title: { 
          display: true, 
          text: config.label, 
          color: theme.palette.text.primary,
          font: {
            size: window.innerWidth < 600 ? 14 : 16,
            weight: 'bold'
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: true,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}${config.unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: "time",
          time: { 
            unit: timeRange === 'live' ? 'second' :
                  timeRange === '15m' ? 'minute' :
                  timeRange === '1h' ? 'minute' :
                  timeRange === '24h' || timeRange === '2d' || timeRange === '3d' ? 'hour' : 'minute',
            tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                          (timeRange === '24h' || timeRange === '2d' || timeRange === '3d') ? "MMM dd, HH:mm" : "HH:mm",
            displayFormats: {
              second: 'HH:mm:ss',
              minute: 'HH:mm',
              hour: 'MMM dd, HH:mm',
              day: 'MMM dd'
            }
          },
          title: { 
            display: true, 
            text: "Time", 
            color: theme.palette.text.primary,
            font: { weight: 'bold' }
          },
          ticks: {
            maxRotation: window.innerWidth < 600 ? 60 : 45,
            minRotation: window.innerWidth < 600 ? 60 : 45,
            source: 'data',
            autoSkip: true,
            maxTicksLimit: timeRange === '15m' ? 15 : 
                          timeRange === 'live' ? 4 : 10,
            font: {
              size: window.innerWidth < 600 ? 8 : 10
            }
          },
          grid: {
            display: chartConfig.showGrid
          }
        },
        y: {
          beginAtZero: true,
          ticks: { 
            color: theme.palette.text.primary,
            font: {
              size: window.innerWidth < 600 ? 8 : 10
            },
            maxTicksLimit: window.innerWidth < 600 ? 5 : 10,
            callback: function(value) {
              // Get all unique units from the selected variables
              const units = [...new Set(selectedVariables
                .filter(key => metricsConfig[key])
                .map(key => metricsConfig[key].unit))];
              
              // If all metrics have the same unit, show it once
              if (units.length === 1) {
                return `${value} ${units[0]}`;
              }
              
              // Otherwise, just show the value
              return value;
            }
          },
          grid: { 
            color: chartConfig.showGrid ? "rgba(255,255,255,0.1)" : "transparent",
            drawBorder: false
          },
        },
      }
    };

    return (
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Line 
          data={chartData} 
          options={chartSpecificOptions} 
          ref={chartEl => {
            if (chartEl) {
              chartRef.current = chartEl;
            }
          }} 
        />
      </Box>
    );
  };

  const renderCharts = () => {
    // If we have data, show charts for the selected variables
    if (metricsData?.data && metricsData.data.length > 0) {
      // Get the variables that actually exist in the data
      const dataVariables = Object.keys(metricsData.data[0]).filter(key => key !== 'timestamp');
      
      // Only render charts for variables that exist in the data
      if (combinedView) {
        return (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, height: '400px', bgcolor: theme.palette.background.paper }}>
              <Box sx={{ height: '100%' }}>
                {renderCombinedChart(metricsData.data)}
              </Box>
            </Paper>
          </Grid>
        );
      }

      const charts = selectedVariables
        .filter(key => dataVariables.includes(key))
        .map((key) => {
          const config = metricsConfig[key];
          const data = metricsData.data;
          if (!data || !Array.isArray(data) || data.length === 0) return null;

          const chart = renderChart(data, key);
          if (!chart) return null;

          return (
            <Grid item xs={12} key={key}>
              <Paper sx={{ p: 3, height: '400px', bgcolor: theme.palette.background.paper }}>
                <Typography variant="h6" gutterBottom>
                  {config.label} ({config.unit})
                </Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  {chart}
                </Box>
              </Paper>
            </Grid>
          );
        }).filter(Boolean);

      if (charts.length > 0) {
        return charts;
      }
    }

    // If we don't have any data, show the "No data" message
    return (
      <Grid item xs={12}>
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.paper }}>
          <Typography variant="h6" color="text.secondary">
            No data available. Please select variables and click Apply to fetch data.
          </Typography>
        </Paper>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        mb: 3 
      }}>
        <Box sx={{ flex: 1 }}>
          <SharedControls
            selectedVariables={selectedVariables}
            availableVariables={availableVariables}
            onVariableChange={onVariableChange}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            onApply={onApply}
          />
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={combinedView}
              onChange={(e) => setCombinedView(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label="Combined View"
          sx={{
            m: 0,
            height: '40px',
            alignItems: 'center',
            '& .MuiFormControlLabel-label': {
              color: theme.palette.text.secondary,
              fontSize: '0.875rem'
            }
          }}
        />
      </Box>
      <Grid container spacing={3}>
        {renderCharts()}
      </Grid>
    </Box>
  );
};

export default DashboardChartsTab; 