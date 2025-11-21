import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, useTheme, IconButton, Dialog, Typography, Button } from '@mui/material';
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
import { crosshairPlugin } from '../../utils/chartCrosshairPlugin';
import { isMobileDevice } from '../../utils/deviceDetection';
import SharedControls from './SharedControls';
import { Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon, Refresh as RefreshIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
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
  zoomPlugin,
  crosshairPlugin
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
  const chartInstancesRef = useRef({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [zoomedCharts, setZoomedCharts] = useState({});
  const isMobile = isMobileDevice();

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

  // Calculate data boundaries for zoom limits
  const getDataBoundaries = (data) => {
    if (!data || !data.labels || data.labels.length === 0) {
      return {
        xMin: null,
        xMax: null,
        yMin: 0,
        yMax: null
      };
    }

    // Get time boundaries (x-axis)
    const timestamps = data.labels.map(label => new Date(label).getTime());
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);

    // Get value boundaries (y-axis)
    let yMin = Infinity;
    let yMax = -Infinity;

    data.datasets.forEach(dataset => {
      const values = dataset.data.filter(v => v !== null && v !== undefined && !isNaN(v));
      if (values.length > 0) {
        const datasetMin = Math.min(...values);
        const datasetMax = Math.max(...values);
        yMin = Math.min(yMin, datasetMin);
        yMax = Math.max(yMax, datasetMax);
      }
    });

    return {
      xMin: isFinite(xMin) ? xMin : null,
      xMax: isFinite(xMax) ? xMax : null,
      yMin: isFinite(yMin) && yMin >= 0 ? Math.max(0, yMin * 0.9) : 0,
      yMax: isFinite(yMax) ? yMax * 1.1 : null
    };
  };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      },
      interaction: {
        mode: 'index',
        axis: 'x',
        intersect: false
      },
      onHover: (event, activeElements) => {
        event.native.target.style.cursor = activeElements.length > 0 ? 'crosshair' : 'default';
      },
      layout: {
        padding: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }
      },
      plugins: {
        legend: { 
          position: 'top',
          align: 'start',
          padding: { top: 0, bottom: 24 },
          labels: { 
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#E0E0E0',
            boxWidth: 16,
            boxHeight: 16,
            padding: 64,
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
          },
          animation: {
            duration: 150,
            easing: 'easeOutQuad',
          },
          hideDelay: 100,
        },
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
          pointRadius: 1,
          pointHoverRadius: 2,
          pointBackgroundColor: config.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointStyle: 'circle'
      }]
    };

    // Calculate boundaries for this chart
    const boundaries = getDataBoundaries(chartData);

    // Chart options
    const interactiveOptions = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          ...chartOptions.plugins.tooltip,
          enabled: true,
          mode: 'index',
          intersect: false,
          animation: {
            duration: 150,
            easing: 'easeOutQuad',
          },
          hideDelay: 100,
        },
        crosshair: {
          width: 2,
          color: 'rgba(255, 255, 255, 0.6)',
          dash: [5, 5],
          snapToDataPoints: true,
          highlightPointRadius: 6
        },
        zoom: {
          limits: {
            x: boundaries.xMin !== null && boundaries.xMax !== null
              ? {min: boundaries.xMin, max: boundaries.xMax}
              : {min: 'original', max: 'original'},
            y: boundaries.yMax !== null
              ? {min: 'original', max: 'original'}
              : {min: 0, max: 'original'}
          },
          pan: {
            enabled: !isMobile,
            mode: 'x',
            modifierKey: 'ctrl',
            threshold: 10,
          },
          zoom: {
            wheel: {
              enabled: !isMobile,
              modifierKey: 'ctrl',
            },
            pinch: {
              enabled: isMobile,
            },
            drag: {
              enabled: false,
            },
            mode: 'x',
            onZoom: ({ chart }) => {
              // Enable button immediately when zoom starts
              chartInstancesRef.current[metricKey] = chart;
              setZoomedCharts(prev => {
                // Only update if not already enabled to avoid unnecessary re-renders
                if (prev[metricKey] !== true) {
                  return {
                    ...prev,
                    [metricKey]: true
                  };
                }
                return prev;
              });
            },
            onZoomComplete: ({ chart }) => {
              chartInstancesRef.current[metricKey] = chart;
              // Check if back to original zoom level
              const xScale = chart.scales.x;
              if (xScale && boundaries.xMin !== null && boundaries.xMax !== null) {
                const currentRange = xScale.max - xScale.min;
                const originalRange = boundaries.xMax - boundaries.xMin;
                const rangeDiff = Math.abs(currentRange - originalRange);
                const minDiff = Math.abs(xScale.min - boundaries.xMin);
                const maxDiff = Math.abs(xScale.max - boundaries.xMax);
                
                // Consider at original if range is very close AND both min/max are close
                // Use stricter thresholds to avoid false positives during active zoom
                const isAtOriginal = rangeDiff < (originalRange * 0.02) && minDiff < 2000 && maxDiff < 2000;
                
                // Only update state if it would actually change
                setZoomedCharts(prev => {
                  const currentState = prev[metricKey];
                  if (isAtOriginal && currentState !== false) {
                    // At original and button is enabled - disable it
                    return {
                      ...prev,
                      [metricKey]: false
                    };
                  } else if (!isAtOriginal && currentState !== true) {
                    // Not at original and button is disabled - enable it
                    return {
                      ...prev,
                      [metricKey]: true
                    };
                  }
                  // No state change needed
                  return prev;
                });
              } else {
                // If boundaries not available, assume zoomed
                setZoomedCharts(prev => {
                  if (prev[metricKey] !== true) {
                    return {
                      ...prev,
                      [metricKey]: true
                    };
                  }
                  return prev;
                });
              }
            }
          },
        },
      },
    };

    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? '100vh' : '400px',
          transition: 'height 0.3s ease',
          backgroundColor: '#1a1f3c',
          borderRadius: 3,
          p: 0,
          m: 0,
          mt: 0,
          mb: 0,
          px: 0,
          touchAction: isMobile ? 'pan-y' : 'auto',
          overscrollBehavior: 'contain'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 48,
            right: 8,
            zIndex: 10,
            display: 'flex',
            gap: 0.5,
            alignItems: 'center',
            pointerEvents: 'auto'
          }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              // Try multiple ways to access the chart instance
              const chart = chartInstancesRef.current[metricKey] || 
                           localChartRef.current?.chartInstance || 
                           localChartRef.current?.chart ||
                           (localChartRef.current && ChartJS.getChart(localChartRef.current.canvas)) ||
                           localChartRef.current;
              
              if (chart?.resetZoom) {
                chart.resetZoom();
                setZoomedCharts(prev => ({
                  ...prev,
                  [metricKey]: false
                }));
              }
            }}
            disabled={!zoomedCharts[metricKey]}
            sx={{ 
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              height: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#E0E0E0',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&:disabled': {
                opacity: 0.3,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Reset Zoom
          </Button>
          <IconButton
            onClick={() => handleFullscreenToggleChart(chartData)}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#E0E0E0',
              pointerEvents: 'auto',
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
        </Box>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            '& canvas': {
              touchAction: isMobile ? 'pan-y pinch-zoom' : 'auto',
            }
          }}
        >
          <Line
            ref={localChartRef}
            data={chartData}
            options={interactiveOptions}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* Section Header and Controls in One Row */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: { xs: 0.5, sm: 2 }, 
        mb: 2,
        px: 2,
        py: 2,
        background: 'linear-gradient(135deg, rgba(26, 31, 60, 0.8) 0%, rgba(31, 37, 71, 0.9) 50%, rgba(26, 31, 60, 0.8) 100%)',
        borderRadius: 3,
        border: 'none',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #2196f3, #4caf50)',
          borderRadius: '3px 3px 0 0',
          opacity: 0.4,
          zIndex: 0
        }
      }}>
        {/* Section Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <Box sx={{ 
            p: 0.5, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #2196f3, #4caf50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <TrendingUpIcon sx={{ color: '#ffffff', fontSize: '1.1rem' }} />
          </Box>
          <Typography variant="h6" sx={{ 
            fontSize: { xs: '0.95rem', sm: '1rem' }, 
            fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
            fontWeight: 600,
            letterSpacing: '0.2px',
            textTransform: 'none',
            background: 'linear-gradient(45deg, #2196f3, #4caf50)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Graphs
          </Typography>
        </Box>

        {/* Controls - Responsive Layout */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}>
          <SharedControls
            selectedVariables={selectedVariables}
            availableVariables={availableVariables}
            onVariableChange={onVariableChange}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            onApply={onApply}
            chartConfig={chartConfig}
          />
        </Box>
      </Box>
      
      {/* Remove custom scrollable Box, restore standard layout */}
      <Grid container spacing={1} sx={{ mt: 2 }}>
        {selectedVariables.map(metricKey => (
          <Grid item xs={12} md={6} key={metricKey}>
            <Paper 
              elevation={0}
              sx={{ 
                pl: 0.25,
                pr: 0.25,
                pt: 1,
                pb: 1,
                m: 0,
                mt: 0,
                mb: 0,
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
                border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                color: theme.palette.text.primary,
                transition: 'all 0.3s ease',
                width: '100%',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)'
                },
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  transform: 'translateY(-2px)',
                  '&::before': {
                    background: theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #5cbf60, #3399f3)' : 'linear-gradient(90deg, #1e88e5, #43a047)'
                  }
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