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
  ChartOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { crosshairPlugin } from '../../../utils/chartCrosshairPlugin';
import { isMobileDevice } from '../../../utils/deviceDetection';
import SharedControls from './SharedControls';
import { Fullscreen as FullscreenIcon, TrendingUp as TrendingUpIcon, ZoomOut as ZoomOutIcon, RotateRight as RotateRightIcon, Download as DownloadIcon, Close as CloseIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { MetricsConfig } from '../../../types';
import { useTranslation } from 'react-i18next';

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

interface DashboardChartsTabProps {
  metricsData: any; // Using any for now as structure is complex
  metricsConfig: MetricsConfig;
  timeRange: string;
  chartConfig?: any;
  selectedVariables: string[];
  availableVariables: string[];
  onVariableChange: (event: any) => void;
  onTimeRangeChange: (value: string) => void;
  onApply: () => void;
}

const DashboardChartsTab: React.FC<DashboardChartsTabProps> = ({ 
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
  const { t } = useTranslation();
  const theme = useTheme();
  const chartRefs = useRef<{[key: string]: any}>({});
  const chartInstancesRef = useRef<{[key: string]: any}>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState<any>(null);
  const [zoomedCharts, setZoomedCharts] = useState<{[key: string]: boolean}>({});
  const isMobile = isMobileDevice();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggleChart = async (chartData: any) => {
    setFullscreenChart(chartData);
    setIsFullscreen(true);
    
    // On mobile, force landscape orientation for better chart viewing
    if (isMobile) {
      // Use setTimeout to ensure dialog is rendered first
      setTimeout(async () => {
        try {
          // Screen Orientation API - try multiple landscape options
          if ('orientation' in screen && 'lock' in screen.orientation) {
            try {
              await (screen.orientation as any).lock('landscape');
            } catch (err1: any) {
              // Try landscape-primary if landscape fails
              try {
                await (screen.orientation as any).lock('landscape-primary');
              } catch (err2: any) {
                // Try landscape-secondary as last resort
                try {
                  await (screen.orientation as any).lock('landscape-secondary');
                } catch (err3: any) {
                  console.log('Orientation lock not available. User may need to rotate manually.');
                }
              }
            }
          } else {
            console.log('Screen Orientation API not supported');
          }
        } catch (error) {
          console.log('Orientation lock error:', error);
        }
      }, 100);
    }
  };

  const handleFullscreenClose = async () => {
    setIsFullscreen(false);
    setFullscreenChart(null);
    
    // On mobile, unlock orientation when exiting fullscreen
    if (isMobile) {
      try {
        // Unlock orientation
        if ('orientation' in screen && 'unlock' in screen.orientation) {
          await (screen.orientation as any).unlock().catch(() => {
            // Ignore errors
          });
        }
        // Exit fullscreen if we entered it
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {
            // Ignore errors
          });
        }
      } catch (error) {
        console.log('Orientation unlock error:', error);
      }
    }
  };

  const getTimeUnit = (): 'minute' | 'hour' | 'day' => {
    switch (timeRange) {
      case '1h':
        return 'minute';
      case '6h':
      case '24h':
        return 'hour';
      case '7d':
      case '30d':
        return 'day';
      default:
        return 'minute';
    }
  };

  const getTimeFormat = () => {
    switch (timeRange) {
      case '1h':
      case '6h':
        return 'HH:mm';
      case '24h':
        return 'MMM dd, HH:mm';
      case '7d':
      case '30d':
        return 'MMM dd';
      default:
        return 'HH:mm';
    }
  };

  // Calculate data boundaries for zoom limits
  const getDataBoundaries = (data: any) => {
    if (!data || !data.labels || data.labels.length === 0) {
      return {
        xMin: null,
        xMax: null,
        yMin: 0,
        yMax: null
      };
    }

    // Get time boundaries (x-axis)
    const timestamps = data.labels.map((label: any) => new Date(label).getTime());
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);

    // Get value boundaries (y-axis)
    let yMin = Infinity;
    let yMax = -Infinity;

    data.datasets.forEach((dataset: any) => {
      const values = dataset.data.filter((v: any) => v !== null && v !== undefined && !isNaN(v));
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

  const chartOptions: ChartOptions<'line'> = {
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
    onHover: (event: any, activeElements: any[]) => {
      if (event.native?.target) {
        (event.native.target as HTMLElement).style.cursor = activeElements.length > 0 ? 'crosshair' : 'default';
      }
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
        display: false, // Hide legend since we have title in header
      },
      tooltip: {
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.95)' 
          : 'rgba(255, 255, 255, 0.98)',
        borderColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.2)' 
          : 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
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
        titleColor: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
        bodyColor: theme.palette.mode === 'dark' ? '#E0E0E0' : '#333333',
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}`;
          },
          title: function(context: any) {
            const date = new Date(context[0].parsed.x);
            return format(date, getTimeFormat());
          }
        },
        animation: {
          duration: 150,
          easing: 'easeOutQuad',
        },
        // @ts-ignore
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
          color: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.15)',
          lineWidth: 1
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          },
          color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
        },
        title: {
          display: true,
          text: t('dashboard.time'),
          font: {
            size: 12,
            weight: 'bold'
          },
          color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.15)',
          lineWidth: 1
        },
        ticks: { 
          font: {
            size: 11
          },
          color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
          callback: function(value) {
            if (typeof value === 'number') {
              return value.toFixed(1);
            }
            return value;
          }
        },
        title: {
          display: true,
          text: t('dashboard.value'),
          font: {
            size: 12,
            weight: 'bold'
          },
          color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
        }
      }
    }
  };


  const renderChart = (data: any[], metricKey: string) => {
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
          label: config.unit || '', // Only show unit in legend, label is in header
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
    const interactiveOptions: any = {
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        tooltip: {
          // @ts-ignore
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
            onZoom: ({ chart }: { chart: any }) => {
              // Store chart instance for reset zoom functionality
              if (chart && chart.resetZoom) {
                chartInstancesRef.current[metricKey] = chart;
              }
              // Enable button immediately when zoom starts
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
            onZoomComplete: ({ chart }: { chart: any }) => {
              // Store chart instance for reset zoom functionality
              if (chart && chart.resetZoom) {
                chartInstancesRef.current[metricKey] = chart;
              }
              // Check if back to original zoom level
              const xScale = chart?.scales?.x;
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
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
          backdropFilter: 'blur(12px)',
          borderRadius: 3,
          p: 0,
          m: 0,
          mt: 0,
          mb: 0,
          px: 0,
          touchAction: isMobile ? 'pan-y' : 'auto',
          overscrollBehavior: 'contain',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
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
          ref={(chartComponent) => {
            if (localChartRef) {
              localChartRef.current = chartComponent;
            }
            // Store chart instance for zoom reset
            // react-chartjs-2 exposes the chart instance after mount
            if (chartComponent) {
              // Use setTimeout to ensure chart is fully initialized
              setTimeout(() => {
                const chart = (chartComponent as any)?.chartInstance || 
                             (chartComponent as any)?.chart ||
                             (localChartRef.current?.canvas && ChartJS.getChart(localChartRef.current.canvas)) ||
                             null;
                if (chart && typeof chart.resetZoom === 'function') {
                  chartInstancesRef.current[metricKey] = chart;
                }
              }, 100);
            }
          }}
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
            {t('tabs.graphs')}
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
              {/* Chart Header with Controls */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderBottom: theme.palette.mode === 'dark' 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  mb: 0.5
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                    fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif'
                  }}
                >
                  {metricsConfig[metricKey]?.label ? `${metricsConfig[metricKey].label} (${metricsConfig[metricKey].unit || ''})` : metricKey}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    alignItems: 'center'
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => {
                      // Get chart instance from multiple possible sources
                      const localRef = chartRefs.current[metricKey]?.current;
                      let chart = chartInstancesRef.current[metricKey];
                      
                      // Try to get from ref if not in instances
                      if (!chart && localRef) {
                        // react-chartjs-2 v4+ uses chartInstance
                        chart = (localRef as any)?.chartInstance || 
                                (localRef as any)?.chart ||
                                (localRef?.canvas && ChartJS.getChart(localRef.canvas)) ||
                                null;
                      }
                      
                      // Reset zoom if chart instance found
                      if (chart && typeof chart.resetZoom === 'function') {
                        chart.resetZoom();
                        setZoomedCharts(prev => ({
                          ...prev,
                          [metricKey]: false
                        }));
                      }
                    }}
                    disabled={!zoomedCharts[metricKey]}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      },
                      '&:disabled': {
                        opacity: 0.3,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        cursor: 'not-allowed'
                      },
                      transition: 'all 0.2s ease-in-out',
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem'
                      }
                    }}
                    title={t('dashboard.resetZoom') || 'Reset Zoom'}
                  >
                    <ZoomOutIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const chartData = {
                        labels: (metricsData?.data || []).map((d: any) => new Date(d.timestamp.replace('Z', ''))),
                        datasets: [{
                          label: metricsConfig[metricKey]?.unit || '', // Only show unit in legend, label is in header
                          data: (metricsData?.data || []).map((d: any) => parseFloat(d[metricKey])),
                          borderColor: metricsConfig[metricKey]?.color || '#2196f3',
                          backgroundColor: `${metricsConfig[metricKey]?.color || '#2196f3'}20`,
                          fill: true,
                          tension: 0.4,
                          borderWidth: 2,
                          pointRadius: 1,
                          pointHoverRadius: 2,
                          pointBackgroundColor: metricsConfig[metricKey]?.color || '#2196f3',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          pointStyle: 'circle'
                        }],
                        // Store metadata for CSV export
                        metricKey: metricKey,
                        metricLabel: metricsConfig[metricKey]?.label || metricKey,
                        metricUnit: metricsConfig[metricKey]?.unit || '',
                        rawData: metricsData?.data || []
                      };
                      handleFullscreenToggleChart(chartData);
                    }}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      },
                      transition: 'all 0.2s ease-in-out',
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem'
                      }
                    }}
                    title={isMobile ? (t('dashboard.fullscreenRotate') || 'Fullscreen (Rotate)') : (t('dashboard.fullscreen') || 'Fullscreen')}
                  >
                    {isMobile ? <RotateRightIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Box>
              </Box>
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
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #141829 0%, #1a1f3c 50%, #141829 100%)'
              : 'linear-gradient(135deg, #f5f5f5 0%, #e8f4fd 50%, #f5f5f5 100%)',
            backgroundImage: theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.1) 0%, transparent 50%)'
              : 'radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(33, 150, 243, 0.05) 0%, transparent 50%)',
          },
        }}
      >
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Professional Header */}
          <Box sx={{ 
            p: 3,
            borderBottom: theme.palette.mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid rgba(0, 0, 0, 0.1)',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.95) 0%, rgba(31, 37, 71, 0.98) 50%, rgba(26, 31, 60, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(90deg, #4caf50, #2196f3)'
                : 'linear-gradient(90deg, #1976d2, #388e3c)',
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ 
                fontSize: '1.75rem',
                color: theme.palette.mode === 'dark' ? '#4caf50' : '#1976d2'
              }} />
              <Typography variant="h5" sx={{ 
                fontWeight: 600,
                fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #4caf50, #2196f3)'
                  : 'linear-gradient(45deg, #1976d2, #388e3c)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {(fullscreenChart as any)?.metricLabel || fullscreenChart?.datasets?.[0]?.label?.split(' (')[0] || 'Chart'} {(fullscreenChart as any)?.metricUnit ? `(${(fullscreenChart as any).metricUnit})` : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton
                onClick={() => {
                  // Export chart data as CSV
                  if (fullscreenChart && (fullscreenChart as any).rawData) {
                    const rawData = (fullscreenChart as any).rawData;
                    const metricKey = (fullscreenChart as any).metricKey || 'metric';
                    const metricLabel = (fullscreenChart as any).metricLabel || metricKey;
                    const metricUnit = (fullscreenChart as any).metricUnit || '';
                    
                    // Create CSV content
                    const headers = ['Timestamp', `${metricLabel}${metricUnit ? ` (${metricUnit})` : ''}`];
                    const csvRows = [headers.join(',')];
                    
                    // Add data rows
                    rawData.forEach((d: any) => {
                      const timestamp = d.timestamp ? new Date(d.timestamp.replace('Z', '')).toISOString() : '';
                      const value = d[metricKey] !== null && d[metricKey] !== undefined ? parseFloat(d[metricKey]) : '';
                      csvRows.push(`${timestamp},${value}`);
                    });
                    
                    // Create and download CSV file
                    const csvContent = csvRows.join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${metricLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }
                }}
                sx={{
                  color: theme.palette.text.primary,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
                title={t('dashboard.export') || 'Export Chart as CSV'}
              >
                <DownloadIcon />
              </IconButton>
              <IconButton 
                onClick={handleFullscreenClose} 
                sx={{
                  color: theme.palette.text.primary,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease-in-out',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.5rem'
                  }
                }}
                title={t('common.close') || 'Close'}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          
          {/* Fullscreen Chart Area */}
          <Box sx={{ 
            flex: 1, 
            position: 'relative',
            p: { xs: 3, sm: 4 },
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.6) 0%, rgba(31, 37, 71, 0.7) 50%, rgba(26, 31, 60, 0.6) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 250, 252, 0.8) 50%, rgba(255, 255, 255, 0.7) 100%)',
            backdropFilter: 'blur(20px)',
          }}>
            {fullscreenChart && (() => {
              const fullscreenBoundaries = getDataBoundaries(fullscreenChart);
              const fullscreenOptions: any = {
                ...chartOptions,
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    display: false, // Hide legend in fullscreen for cleaner view
                  },
                  tooltip: {
                    ...chartOptions.plugins?.tooltip,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(0, 0, 0, 0.95)' 
                      : 'rgba(255, 255, 255, 0.98)',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.3)',
                    borderWidth: 1,
                    titleFont: {
                      size: 16,
                      weight: 'bold'
                    },
                    bodyFont: {
                      size: 14
                    },
                    padding: 16,
                    cornerRadius: 12,
                    displayColors: true,
                    titleColor: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000',
                    bodyColor: theme.palette.mode === 'dark' ? '#E0E0E0' : '#333333',
                  },
                  zoom: {
                    limits: {
                      x: fullscreenBoundaries.xMin !== null && fullscreenBoundaries.xMax !== null
                        ? {min: fullscreenBoundaries.xMin, max: fullscreenBoundaries.xMax}
                        : {min: 'original', max: 'original'},
                      y: fullscreenBoundaries.yMax !== null
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
                    },
                  },
                },
                scales: {
                  ...chartOptions.scales,
                  x: {
                    ...chartOptions.scales?.x,
                    grid: {
                      ...chartOptions.scales?.x?.grid,
                      color: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(0, 0, 0, 0.2)',
                      lineWidth: 1
                    },
                    ticks: {
                      ...chartOptions.scales?.x?.ticks,
                      font: {
                        size: 13
                      },
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
                    },
                    title: {
                      ...chartOptions.scales?.x?.title,
                      font: {
                        size: 15,
                        weight: 'bold'
                      },
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
                    }
                  },
                  y: {
                    ...chartOptions.scales?.y,
                    grid: {
                      ...chartOptions.scales?.y?.grid,
                      color: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.2)' 
                        : 'rgba(0, 0, 0, 0.2)',
                      lineWidth: 1
                    },
                    ticks: {
                      ...chartOptions.scales?.y?.ticks,
                      font: {
                        size: 13
                      },
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
                    },
                    title: {
                      ...chartOptions.scales?.y?.title,
                      font: {
                        size: 15,
                        weight: 'bold'
                      },
                      color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#000000'
                    }
                  }
                }
              };
              
              return (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  position: 'relative',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.4) 0%, rgba(31, 37, 71, 0.5) 50%, rgba(26, 31, 60, 0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(248, 250, 252, 0.6) 50%, rgba(255, 255, 255, 0.5) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  p: 2,
                  border: theme.palette.mode === 'dark' 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  <Line
                    data={fullscreenChart}
                    options={fullscreenOptions}
                  />
                </Box>
              );
            })()}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default DashboardChartsTab;

