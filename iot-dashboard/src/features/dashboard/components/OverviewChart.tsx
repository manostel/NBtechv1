import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Checkbox, Button, Tabs, Tab, SelectChangeEvent } from '@mui/material';
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
  TimeScale,
  ChartOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { crosshairPlugin } from '../../../utils/chartCrosshairPlugin';
import { isMobileDevice } from '../../../utils/deviceDetection';
import { MetricsConfig, Device, User } from '../../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  zoomPlugin,
  crosshairPlugin
);

// Set global Chart.js defaults for legend text color
ChartJS.defaults.plugins.legend.labels.color = '#ffffff';
// @ts-ignore
ChartJS.defaults.plugins.legend.labels.fontColor = '#ffffff';

interface OverviewChartProps {
  metricsConfig: MetricsConfig;
  selectedVariables: string[];
  isLoading: boolean;
  device: Device;
  user: User;
}

const OverviewChart: React.FC<OverviewChartProps> = ({ metricsConfig, selectedVariables, isLoading, device, user }) => {
  const [metricsTimeRange, setMetricsTimeRange] = useState('1h');
  const [stateTimeRange, setStateTimeRange] = useState('1h');
  const [chartView, setChartView] = useState<'metrics' | 'state'>('metrics'); // 'metrics' or 'state'
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]); // For metrics view checkboxes
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]); // Will be auto-populated
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]); // Will be auto-populated
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const chartRef = useRef<any>(null);
  const chartInstanceRef = useRef<any>(null);
  const isMobile = isMobileDevice();

  const DASHBOARD_DATA_URL = "https://9mho2wb0jc.execute-api.eu-central-1.amazonaws.com/default/fetch/dashboard-data";

  // Calculate data boundaries for zoom limits
  const getDataBoundaries = (data: any) => {
    if (!data || !data.labels || data.labels.length === 0) {
      return {
        xMin: null,
        xMax: null,
        yMin: 0,
        yMax: null,
        y1Min: 0,
        y1Max: null
      };
    }

    // Get time boundaries (x-axis)
    const timestamps = data.labels.map((label: any) => new Date(label).getTime());
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);

    // Get value boundaries (y-axis)
    let yMin = Infinity;
    let yMax = -Infinity;
    let y1Min = Infinity;
    let y1Max = -Infinity;

    data.datasets.forEach((dataset: any) => {
      const values = dataset.data.filter((v: any) => v !== null && v !== undefined && !isNaN(v));
      if (values.length > 0) {
        const datasetMin = Math.min(...values);
        const datasetMax = Math.max(...values);
        
        if (dataset.yAxisID === 'y1') {
          y1Min = Math.min(y1Min, datasetMin);
          y1Max = Math.max(y1Max, datasetMax);
        } else {
          yMin = Math.min(yMin, datasetMin);
          yMax = Math.max(yMax, datasetMax);
        }
      }
    });

    return {
      xMin: isFinite(xMin) ? xMin : null,
      xMax: isFinite(xMax) ? xMax : null,
      yMin: isFinite(yMin) && yMin >= 0 ? Math.max(0, yMin * 0.9) : 0,
      yMax: isFinite(yMax) ? yMax * 1.1 : null,
      y1Min: isFinite(y1Min) && y1Min >= 0 ? Math.max(0, y1Min * 0.9) : 0,
      y1Max: isFinite(y1Max) ? y1Max * 1.1 : null
    };
  };

  const resetZoom = () => {
    // Try multiple ways to access the chart instance
    const chart = chartInstanceRef.current || 
                  chartRef.current?.chartInstance || 
                  chartRef.current?.chart ||
                  (chartRef.current && ChartJS.getChart(chartRef.current.canvas)) ||
                  chartRef.current;
    
    if (chart?.resetZoom) {
      chart.resetZoom();
      setIsZoomed(false);
    }
  };


  // Auto-select defaults on initial load
  useEffect(() => {
    if (initialLoad) {
      // Auto-select metrics (first 2 available, or all if less than 2)
      if (selectedVariables && selectedVariables.length > 0) {
        const defaultMetrics = selectedVariables.slice(0, Math.min(2, selectedVariables.length));
        setSelectedMetrics(defaultMetrics);
      }
      
      // Auto-select outputs dynamically based on what's available
      const outputConfigs: any = {
        'out1_state': { label: 'Output 1', color: '#FF6B6B', unit: '', isBoolean: true },
        'out2_state': { label: 'Output 2', color: '#4ECDC4', unit: '', isBoolean: true },
        'motor_speed': { label: 'Motor Speed', color: '#FFD166', unit: '%', isBoolean: false, min: 0, max: 100 },
        'charging': { label: 'Charging', color: '#06D6A0', unit: '', isBoolean: true },
        'power_saving': { label: 'Power Saving', color: '#E91E63', unit: '', isBoolean: true }
      };
      
      const inputConfigs: any = {
        'in1_state': { label: 'Input 1', color: '#9C27B0', unit: '' },
        'in2_state': { label: 'Input 2', color: '#FF9800', unit: '' }
      };
      
      // Select first 2 outputs that exist in config
      const availableOutputs = Object.keys(outputConfigs);
      const defaultOutputs = availableOutputs.slice(0, 2);
      setSelectedOutputs(defaultOutputs);
      
      // Select first 1 input that exists in config
      const availableInputs = Object.keys(inputConfigs);
      const defaultInputs = availableInputs.slice(0, 1);
      setSelectedInputs(defaultInputs);
      
      setInitialLoad(false);
    }
  }, [selectedVariables, initialLoad]);

  useEffect(() => {
    if ((chartView === 'metrics' && selectedMetrics.length > 0) || 
        (chartView === 'state' && (selectedOutputs.length > 0 || selectedInputs.length > 0))) {
      fetchChartData();
    }
  }, [chartView, selectedMetrics, selectedOutputs, selectedInputs, metricsTimeRange, stateTimeRange]);

  const fetchChartData = async () => {
    if (!device || !user) return;
    if (chartView === 'metrics' && selectedMetrics.length === 0) return;
    if (chartView === 'state' && selectedOutputs.length === 0 && selectedInputs.length === 0) return;
    
    setChartLoading(true);
    try {
      const selectedVars = chartView === 'metrics' 
        ? selectedMetrics
        : [...selectedOutputs, ...selectedInputs];
      
      // Use per-view time range
      const effectiveTimeRange = chartView === 'metrics' ? metricsTimeRange : stateTimeRange;

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
          time_range: effectiveTimeRange,
          points: effectiveTimeRange === 'live' ? 60 :
                 effectiveTimeRange === '15m' ? 15 :
                 effectiveTimeRange === '1h' ? 60 :
                 effectiveTimeRange === '2h' ? 120 :
                 effectiveTimeRange === '4h' ? 240 :
                 effectiveTimeRange === '6h' ? 360 :
                 effectiveTimeRange === '8h' ? 480 :
                 effectiveTimeRange === '16h' ? 960 :
                 effectiveTimeRange === '24h' ? 288 :
                 effectiveTimeRange === '3d' ? 432 :
                 effectiveTimeRange === '7d' ? 336 :
                 effectiveTimeRange === '30d' ? 360 :
                 60,
          include_state: true,
          selected_variables: selectedVars,
          table_type: chartView === 'state' ? 'status' : 'data'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        const datasets: any[] = [];
        
        // Add selected metric datasets (only for metrics view)
        if (chartView === 'metrics') {
          selectedMetrics.forEach(metricKey => {
            if (metricsConfig && metricsConfig[metricKey]) {
              const config = metricsConfig[metricKey];
              datasets.push({
                label: `${config.label} (${config.unit})`,
                data: result.data.map((d: any) => parseFloat(d[metricKey]) || 0),
                borderColor: config.color,
                backgroundColor: `${config.color}30`,
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 1,
                pointHoverRadius: 2,
                pointBackgroundColor: config.color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointStyle: 'circle',
                shadowOffsetX: 0,
                shadowOffsetY: 2,
                shadowBlur: 4,
                shadowColor: `${config.color}60`,
                yAxisID: 'y'
              });
            }
          });
        }
        
        // Add selected output datasets
        const outputConfigs: any = {
          'out1_state': { label: 'Output 1', color: '#FF6B6B', unit: '', isBoolean: true },
          'out2_state': { label: 'Output 2', color: '#4ECDC4', unit: '', isBoolean: true },
          'motor_speed': { label: 'Motor Speed', color: '#FFD166', unit: '%', isBoolean: false, min: 0, max: 100 },
          'charging': { label: 'Charging', color: '#06D6A0', unit: '', isBoolean: true },
          'power_saving': { label: 'Power Saving', color: '#E91E63', unit: '', isBoolean: true }
        };
        
        const inputConfigs: any = {
          'in1_state': { label: 'Input 1', color: '#9C27B0', unit: '' },
          'in2_state': { label: 'Input 2', color: '#FF9800', unit: '' }
        };
        
        const outputsToShow = chartView === 'state' ? selectedOutputs : [];
        outputsToShow.forEach(outputKey => {
          if (outputConfigs[outputKey]) {
            const outputConfig = outputConfigs[outputKey];
            const outputData = result.data.map((d: any) => {
              const value = d[outputKey];
              
              // Handle based on configuration
              if (outputConfig.isBoolean) {
                // Handle boolean states
                if (value === true || value === 1 || value === '1') return 1;
                if (value === false || value === 0 || value === '0') return 0;
                return 0; // Default to 0 for invalid boolean values
              } else {
                // Handle numeric values (like motor_speed)
                return parseFloat(value) || 0;
              }
            });
            
            datasets.push({
              label: `${outputConfig.label}${outputConfig.unit ? ` (${outputConfig.unit})` : ''}`,
              data: outputData,
              borderColor: outputConfig.color,
              backgroundColor: `${outputConfig.color}40`,
              fill: false,
              tension: 0.1,
              borderWidth: 3,
              pointRadius: 1,
              pointHoverRadius: 2,
              pointBackgroundColor: outputConfig.color,
              pointBorderColor: '#fff',
              pointBorderWidth: 1,
              pointStyle: outputKey === 'motor_speed' ? 'circle' : 'rect',
              yAxisID: outputKey === 'motor_speed' ? 'y1' : 'y'
            });
          }
        });
        
        // Add selected input datasets (only for state history view)
        if (chartView === 'state') {
          selectedInputs.forEach(inputKey => {
            if (inputConfigs[inputKey]) {
              const inputConfig = inputConfigs[inputKey];
              const inputData = result.data.map((d: any) => {
                const value = d[inputKey];
                if (value === true || value === 1 || value === '1') return 1;
                if (value === false || value === 0 || value === '0') return 0;
                return parseFloat(value) || 0;
              });
              
              datasets.push({
                label: `${inputConfig.label}${inputConfig.unit ? ` (${inputConfig.unit})` : ''}`,
                data: inputData,
                borderColor: inputConfig.color,
                backgroundColor: `${inputConfig.color}40`,
                fill: false,
                tension: 0.1,
                borderWidth: 3,
                pointRadius: 1,
                pointHoverRadius: 2,
                pointBackgroundColor: inputConfig.color,
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointStyle: 'triangle',
                yAxisID: 'y'
              });
            }
          });
        }
        
        const chartData = {
          labels: result.data.map((d: any) => new Date(d.timestamp.replace('Z', ''))),
          datasets: datasets
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

  // Calculate boundaries from current chart data
  const boundaries = chartData ? getDataBoundaries(chartData) : {
    xMin: null,
    xMax: null,
    yMin: 0,
    yMax: null,
    y1Min: 0,
    y1Max: null
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 30,
        bottom: 5,
        left: 2,
        right: 5
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 12,
            weight: '600',
            // @ts-ignore
            color: '#ffffff'
          },
          usePointStyle: true,
          padding: 15,
          color: '#ffffff',
          // @ts-ignore
          fontColor: '#ffffff',
          boxWidth: 14,
          boxHeight: 14,
          generateLabels: function(chart) {
            const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);
            
            // Force white text color for all labels with multiple approaches
            labels.forEach((label) => {
              // @ts-ignore
              label.fontColor = '#ffffff';
              // @ts-ignore
              label.color = '#ffffff';
              // @ts-ignore
              label.textColor = '#ffffff';
              // Also try setting the style directly
              if (label.text) {
                label.text = label.text;
              }
            });
            
            return labels;
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#666',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12,
          weight: '500'
        },
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${(context.parsed.y as number).toFixed(1)}`;
          }
        }
      },
      // @ts-ignore
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
            : {min: 0, max: 'original'},
          y1: boundaries.y1Max !== null
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
            // Enable button immediately when zoom starts
            chartInstanceRef.current = chart;
            setIsZoomed(prev => prev !== true ? true : prev);
          },
          onZoomComplete: ({ chart }: { chart: any }) => {
            chartInstanceRef.current = chart;
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
              setIsZoomed(prev => {
                if (isAtOriginal && prev !== false) {
                  return false;
                } else if (!isAtOriginal && prev !== true) {
                  return true;
                }
                return prev;
              });
            } else {
              // If boundaries not available, assume zoomed
              setIsZoomed(prev => prev !== true ? true : prev);
            }
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
          color: 'rgba(255, 255, 255, 0.2)',
          drawBorder: true,
          borderColor: 'rgba(255, 255, 255, 0.3)'
        },
        ticks: {
          font: {
            size: 10,
            weight: '400'
          },
          color: '#ffffff',
          maxTicksLimit: 8,
          padding: 4,
          align: 'center'
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 10,
            weight: '500'
          },
          color: '#ffffff',
          padding: 2
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        min: 0,
        max: chartView === 'state' ? 1.2 : undefined,
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
          drawBorder: true,
          borderColor: 'rgba(255, 255, 255, 0.3)'
        },
        ticks: {
          font: {
            size: 10,
            weight: '400'
          },
          color: '#ffffff',
          padding: 4,
          stepSize: chartView === 'state' ? 1 : undefined,
          callback: function(value) {
            // Only show 0 and 1 for state view
            if (chartView === 'state' && (value === 0 || value === 1)) {
              return value.toFixed(0);
            }
            // For metrics view, show all values
            if (chartView === 'metrics') {
              if (typeof value === 'number') return value.toFixed(0);
              return value;
            }
            // Hide other values in state view
            return '';
          }
        },
        title: {
          display: true,
          text: chartView === 'metrics' 
            ? (selectedMetrics.length === 1 && metricsConfig[selectedMetrics[0]] ? 
                `${metricsConfig[selectedMetrics[0]].label} (${metricsConfig[selectedMetrics[0]].unit})` : 
                'Metrics')
            : (selectedOutputs.includes('motor_speed') && selectedOutputs.some(o => o !== 'motor_speed') ? 
                'Output States' : 
                selectedOutputs.includes('motor_speed') ? 
                'Motor Speed (%)' : 
                'Output States'),
          font: {
            size: 10,
            weight: '500'
          },
          color: '#ffffff',
          padding: 2
        }
      },
      y1: {
        type: 'linear',
        display: chartView === 'state' && selectedOutputs.includes('motor_speed'), // Only show when motor speed is selected
        position: 'right',
        beginAtZero: true,
        min: 0,
        max: chartView === 'state' && selectedOutputs.includes('motor_speed') ? 110 : undefined,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 10,
            weight: '400'
          },
          color: '#ffffff',
          padding: 4,
          stepSize: chartView === 'state' && selectedOutputs.includes('motor_speed') ? 10 : undefined,
          callback: function(value) {
            // Always show numeric values
            if (typeof value === 'number') return value.toFixed(0);
            return value;
          }
        },
        title: {
          display: chartView === 'state' && selectedOutputs.includes('motor_speed'),
          text: 'Motor Speed (%)',
          font: {
            size: 10,
            weight: '500'
          },
          color: '#ffffff',
          padding: 2
        }
      }
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
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      },
      line: {
        borderWidth: 3,
        tension: 0.4
      }
    }
  };

  if (!metricsConfig || !selectedVariables || selectedVariables.length === 0) {
    return null;
  }

  return (
    <Box>
      {/* Tab Navigation */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={chartView} 
          onChange={(e, newValue) => setChartView(newValue)}
          sx={{
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 2,
              borderRadius: '1px 1px 0 0'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              minHeight: 32,
              color: 'text.secondary',
              padding: '6px 12px',
              '&.Mui-selected': {
                color: 'primary.main'
              }
            }
          }}
        >
          <Tab 
            label="Metrics Graph" 
            value="metrics"
          />
          <Tab 
            label="State History Graph" 
            value="state"
          />
        </Tabs>
      </Box>
      
      {/* Selectors outside the tile */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: { xs: 60, sm: 70 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Time</InputLabel>
            <Select
              value={chartView === 'metrics' ? metricsTimeRange : stateTimeRange}
              label="Time"
              onChange={(e) => chartView === 'metrics' ? setMetricsTimeRange(e.target.value) : setStateTimeRange(e.target.value)}
              sx={{ fontSize: '0.8rem' }}
            >
              <MenuItem value="15m" sx={{ fontSize: '0.8rem' }}>15m</MenuItem>
              <MenuItem value="1h" sx={{ fontSize: '0.8rem' }}>1h</MenuItem>
              <MenuItem value="2h" sx={{ fontSize: '0.8rem' }}>2h</MenuItem>
              <MenuItem value="4h" sx={{ fontSize: '0.8rem' }}>4h</MenuItem>
              <MenuItem value="6h" sx={{ fontSize: '0.8rem' }}>6h</MenuItem>
              <MenuItem value="8h" sx={{ fontSize: '0.8rem' }}>8h</MenuItem>
              <MenuItem value="16h" sx={{ fontSize: '0.8rem' }}>16h</MenuItem>
              <MenuItem value="24h" sx={{ fontSize: '0.8rem' }}>24h</MenuItem>
              <MenuItem value="3d" sx={{ fontSize: '0.8rem' }}>3d</MenuItem>
              <MenuItem value="7d" sx={{ fontSize: '0.8rem' }}>7d</MenuItem>
              <MenuItem value="30d" sx={{ fontSize: '0.8rem' }}>30d</MenuItem>
            </Select>
          </FormControl>
          {chartView === 'metrics' && (
            <FormControl size="small" sx={{ minWidth: { xs: 70, sm: 80 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <InputLabel>Metrics</InputLabel>
              <Select
                multiple
                value={selectedMetrics}
                label="Metrics"
                onChange={(e) => setSelectedMetrics(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                sx={{ fontSize: '0.8rem' }}
                renderValue={(selected) => `${selected.length}`}
              >
                {selectedVariables.map((variable) => {
                  const config = metricsConfig[variable];
                  if (!config) return null;
                  return (
                    <MenuItem key={variable} value={variable} sx={{ fontSize: '0.875rem' }}>
                      <Checkbox
                        size="small"
                        checked={selectedMetrics.includes(variable)}
                        sx={{ p: 0.5 }}
                      />
                      <span style={{ marginLeft: 8 }}>{config.label}</span>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}
          {chartView === 'state' && (
            <>
          <FormControl size="small" sx={{ minWidth: { xs: 70, sm: 80 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            <InputLabel>Outputs</InputLabel>
                <Select
                  multiple
                  value={selectedOutputs}
                  label="Outputs"
                  onChange={(e) => setSelectedOutputs(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  sx={{ fontSize: '0.8rem' }}
                  renderValue={(selected) => `${selected.length}`}
                >
                  <MenuItem value="out1_state" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedOutputs.includes('out1_state')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Output 1</span>
                  </MenuItem>
                  <MenuItem value="out2_state" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedOutputs.includes('out2_state')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Output 2</span>
                  </MenuItem>
                  <MenuItem value="motor_speed" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedOutputs.includes('motor_speed')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Motor Speed</span>
                  </MenuItem>
                  <MenuItem value="charging" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedOutputs.includes('charging')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Charging</span>
                  </MenuItem>
                  <MenuItem value="power_saving" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedOutputs.includes('power_saving')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Power Saving</span>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: 70, sm: 80 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                <InputLabel>Inputs</InputLabel>
                <Select
                  multiple
                  value={selectedInputs}
                  label="Inputs"
                  onChange={(e) => setSelectedInputs(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  sx={{ fontSize: '0.8rem' }}
                  renderValue={(selected) => `${selected.length}`}
                >
                  <MenuItem value="in1_state" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedInputs.includes('in1_state')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Input 1</span>
                  </MenuItem>
                  <MenuItem value="in2_state" sx={{ fontSize: '0.875rem' }}>
                    <Checkbox
                      size="small"
                      checked={selectedInputs.includes('in2_state')}
                      sx={{ p: 0.5 }}
                    />
                    <span style={{ marginLeft: 8 }}>Input 2</span>
                  </MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={resetZoom}
            disabled={!isZoomed}
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
        </Box>
      </Box>
      
      <Paper
        sx={{
          pl: 0.25,
          pr: 0.25,
          pt: 1,
          pb: 1,
          borderRadius: 3,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(26, 31, 60, 0.9) 0%, rgba(31, 37, 71, 0.95) 50%, rgba(26, 31, 60, 0.9) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(12px)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.08)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          color: (theme) => theme.palette.text.primary,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          touchAction: isMobile ? 'pan-y' : 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #4caf50, #2196f3)' : 'linear-gradient(90deg, #1976d2, #388e3c)',
            transition: 'background 0.3s ease',
          },
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
            '&::before': {
              background: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(90deg, #5cbf60, #3399f3)' : 'linear-gradient(90deg, #1e88e5, #43a047)',
            }
          }
        }}
      >
        <Box sx={{ 
          height: 380, 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          pl: 0,
          pr: 0
        }}>
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
        ) : (chartView === 'metrics' && selectedMetrics.length === 0) || (chartView === 'state' && selectedOutputs.length === 0 && selectedInputs.length === 0) ? (
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
            <Typography variant="body2" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
              {chartView === 'metrics' ? 'Select metrics to view chart' : 'Select outputs to view state history'}
            </Typography>
          </Box>
        ) : !chartData && !chartLoading ? (
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
            <Typography variant="body2" sx={{ color: 'rgba(224, 224, 224, 0.7)' }}>
              Loading chart data...
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
          <Box 
            sx={{ 
              width: '100%', 
              height: '100%', 
              maxWidth: '100%',
              position: 'relative',
              '& canvas': {
                touchAction: isMobile ? 'pan-y pinch-zoom' : 'auto',
              },
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              overscrollBehavior: 'contain'
            }}
          >
            <Line ref={chartRef} data={chartData} options={options} />
          </Box>
        )}
      </Box>
    </Paper>
    </Box>
  );
};

export default OverviewChart;

