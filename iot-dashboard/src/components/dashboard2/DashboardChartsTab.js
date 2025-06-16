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

  // Debug logging for chart issues
  console.log('DashboardChartsTab selectedVariables:', selectedVariables);
  console.log('DashboardChartsTab metricsConfig:', metricsConfig);
  console.log('DashboardChartsTab first data object:', metricsData?.data?.[0]);

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
      labels: data.map(d => new Date(d.timestamp.replace('Z', ''))),
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
                  timeRange === '24h' || timeRange === '3d' || timeRange === '7d' || timeRange === '30d' ? 'hour' : 'minute',
            tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                          (timeRange === '24h' || timeRange === '3d' || timeRange === '7d' || timeRange === '30d') ? "MMM dd, HH:mm" : "HH:mm",
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
            font: { 
              weight: 'bold',
              size: window.innerWidth < 600 ? 8 : 10
            }
          },
          ticks: {
            maxRotation: window.innerWidth < 600 ? 60 : 45,
            minRotation: window.innerWidth < 600 ? 60 : 45,
            source: 'data',
            autoSkip: true,
            maxTicksLimit: timeRange === '15m' ? 15 : 
                          timeRange === 'live' ? 4 : 
                          timeRange === '3d' ? 8 :
                          timeRange === '7d' || timeRange === '30d' ? 7 : 10,
            color: theme.palette.text.primary,
            font: {
              size: window.innerWidth < 600 ? 8 : 10,
              weight: 'normal'
            },
            padding: 5
          },
          grid: {
            display: chartConfig.showGrid,
            color: theme.palette.divider,
            drawBorder: true,
            borderColor: theme.palette.divider
          },
          border: {
            display: true,
            color: theme.palette.divider
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
    if (!data || data.length === 0) return null;
    const config = metricsConfig[metricKey];
    const chartData = {
      labels: data.map(d => new Date(d.timestamp.replace('Z', ''))),
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data: data.map(d => parseFloat(d.value)),
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
                  timeRange === '24h' || timeRange === '3d' || timeRange === '7d' || timeRange === '30d' ? 'hour' : 'minute',
            tooltipFormat: timeRange === 'live' ? "HH:mm:ss" : 
                          (timeRange === '24h' || timeRange === '3d' || timeRange === '7d' || timeRange === '30d') ? "MMM dd, HH:mm" : "HH:mm",
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
            font: { 
              weight: 'bold',
              size: window.innerWidth < 600 ? 8 : 10
            }
          },
          ticks: {
            maxRotation: window.innerWidth < 600 ? 60 : 45,
            minRotation: window.innerWidth < 600 ? 60 : 45,
            source: 'data',
            autoSkip: true,
            maxTicksLimit: timeRange === '15m' ? 15 : 
                          timeRange === 'live' ? 4 : 
                          timeRange === '3d' ? 8 :
                          timeRange === '7d' || timeRange === '30d' ? 7 : 10,
            color: theme.palette.text.primary,
            font: {
              size: window.innerWidth < 600 ? 8 : 10,
              weight: 'normal'
            },
            padding: 5
          },
          grid: {
            display: chartConfig.showGrid,
            color: theme.palette.divider,
            drawBorder: true,
            borderColor: theme.palette.divider
          },
          border: {
            display: true,
            color: theme.palette.divider
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
    if (!metricsData || !metricsData.data || metricsData.data.length === 0 || !metricsConfig || selectedVariables.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ p: { xs: 0, sm: 2 } }}>No data available to display charts for the selected period or variables.</Typography>
      );
    }

      if (combinedView) {
        return (
          <Grid item xs={12}>
          <Paper sx={{ p: { xs: 0, sm: 2 }, height: 400 }}>
                {renderCombinedChart(metricsData.data)}
            </Paper>
          </Grid>
        );
      }

    return selectedVariables.map(key => {
      const metricData = metricsData.data.map(d => ({ timestamp: d.timestamp, value: d[key] })).filter(d => d.value !== undefined && d.value !== null);
      if (!metricsConfig[key] || metricData.length === 0) return null;

          return (
        <Grid item xs={12} sm={6} md={4} lg={3} key={key}>
          <Paper sx={{ p: { xs: 0, sm: 2 }, height: 300 }}>
            {renderChart(metricData, key)}
              </Paper>
            </Grid>
          );
        }).filter(Boolean);
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <SharedControls
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onApply={onApply}
            selectedVariables={selectedVariables}
            availableVariables={availableVariables}
            onVariableChange={onVariableChange}
          />

      <Box sx={{ mt: 2, flexGrow: 1 }}>
        <FormControlLabel
          control={<Switch checked={combinedView} onChange={(e) => setCombinedView(e.target.checked)} />}
          label="Combined View"
          sx={{ mb: 1 }}
        />
        <Grid container spacing={2}>
          {renderCharts()}
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardChartsTab; 