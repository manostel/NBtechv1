import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, useTheme, IconButton, Dialog, Typography } from '@mui/material';
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
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import SharedControls from './SharedControls';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { format, subMinutes, subHours, subDays } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin
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
  const chartRefs = useRef({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      chartRefs.current.chartRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggleChart = (chartData) => {
    setFullscreenChart(chartData);
    setIsFullscreen(true);
  };

  const handleFullscreenClose = () => {
    setIsFullscreen(false);
    setFullscreenChart(null);
  };

  const getTimeUnit = () => {
    switch (timeRange) {
      case '1h':
        return 'minute';
      case '6h':
        return 'hour';
      case '24h':
        return 'hour';
      case '7d':
        return 'day';
      case '30d':
        return 'day';
      default:
        return 'minute';
    }
  };

  const getTimeFormat = () => {
    switch (timeRange) {
      case '1h':
        return 'HH:mm';
      case '6h':
        return 'HH:mm';
      case '24h':
        return 'MMM dd, HH:mm';
      case '7d':
        return 'MMM dd';
      case '30d':
        return 'MMM dd';
      default:
        return 'HH:mm';
    }
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
      plugins: {
        legend: { 
        position: 'top',
          labels: { 
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#E0E0E0'
          }
        },
        tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}`;
          },
          title: function(context) {
            const date = new Date(context[0].parsed.x);
            return format(date, getTimeFormat());
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'ctrl',
        },
        zoom: {
          wheel: {
            enabled: true,
            modifierKey: 'ctrl',
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
          drag: {
            enabled: true,
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderColor: 'rgba(0,0,0,0.3)',
            borderWidth: 1
          }
        },
        limits: {
          x: {min: 'original', max: 'original'}
          }
        }
      },
      scales: {
        x: {
        type: 'time',
          time: { 
          unit: getTimeUnit(),
          tooltipFormat: getTimeFormat(),
            displayFormats: {
              minute: 'HH:mm',
              hour: 'MMM dd, HH:mm',
              day: 'MMM dd'
            }
          },
        grid: {
            display: true, 
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
          },
          ticks: {
          maxRotation: 45,
          minRotation: 45,
            font: {
            size: 11
          },
          color: '#E0E0E0'
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#E0E0E0'
          }
        },
        y: {
          beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
          ticks: { 
            font: {
            size: 11
            },
          color: '#E0E0E0',
            callback: function(value) {
            return value.toFixed(1);
          }
        },
        title: {
          display: true,
          text: 'Value',
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#E0E0E0'
        }
      }
    }
  };

  const renderChart = (data, metricKey) => {
    if (!chartRefs.current[metricKey]) {
      chartRefs.current[metricKey] = React.createRef();
    }
    const localChartRef = chartRefs.current[metricKey];
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography color="textSecondary">No data available</Typography>
        </Box>
      );
    }

    const config = metricsConfig[metricKey];
    const chartData = {
      labels: data.map(d => new Date(d.timestamp.replace('Z', ''))),
      datasets: [{
          label: `${config.label} (${config.unit})`,
        data: data.map(d => parseFloat(d[metricKey])),
          borderColor: config.color,
        backgroundColor: `${config.color}20`,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: chartConfig.showPoints ? 3 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: config.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle'
      }]
    };

    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? '100vh' : '400px',
          transition: 'height 0.3s ease',
          backgroundColor: '#1a1f3c',
          borderRadius: 1,
          p: 0.5,
          px: 0
        }}
      >
        <IconButton
          onClick={() => {
            if (localChartRef.current && localChartRef.current.resetZoom) {
              localChartRef.current.resetZoom();
            }
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 48,
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#E0E0E0',
            mr: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            transition: 'all 0.2s ease-in-out',
            '& .MuiSvgIcon-root': {
              fontSize: '1.2rem'
            }
          }}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton
          onClick={() => handleFullscreenToggleChart(chartData)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#E0E0E0',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            transition: 'all 0.2s ease-in-out',
            '& .MuiSvgIcon-root': {
              fontSize: '1.2rem'
            }
          }}
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        <Line
          ref={localChartRef}
          data={chartData}
          options={chartOptions}
        />
      </Box>
    );
  };

  return (
    <Box>
          <SharedControls
        selectedVariables={selectedVariables}
        availableVariables={availableVariables}
        onVariableChange={onVariableChange}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onApply={onApply}
        chartConfig={chartConfig}
      />
      
      <Grid container spacing={1} sx={{ mt: 2 }}>
        {selectedVariables.map(metricKey => (
          <Grid item xs={12} md={6} key={metricKey}>
            <Paper 
              elevation={2}
              sx={{ 
                p: 0.5,
                px: 0,
                borderRadius: 1,
                transition: 'transform 0.2s ease-in-out',
                backgroundColor: '#1a1f3c',
                width: '100%',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              {renderChart(metricsData?.data || [], metricKey)}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog
        fullScreen
        open={isFullscreen}
        onClose={handleFullscreenClose}
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: '#1a1f3c',
          },
        }}
      >
        <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton 
              onClick={handleFullscreenClose} 
              sx={{
                color: '#E0E0E0',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                transition: 'all 0.2s ease-in-out',
                '& .MuiSvgIcon-root': {
                  fontSize: '1.2rem'
                }
              }}
            >
              <FullscreenExitIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, position: 'relative' }}>
            {fullscreenChart && (
              <Line
                data={fullscreenChart}
                options={{
                  ...chartOptions,
                  maintainAspectRatio: false,
                  responsive: true,
                }}
              />
            )}
          </Box>
      </Box>
      </Dialog>
    </Box>
  );
};

export default DashboardChartsTab; 