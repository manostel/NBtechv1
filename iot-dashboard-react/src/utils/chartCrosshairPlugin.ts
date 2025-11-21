/**
 * Chart.js plugin to display a vertical crosshair line on hover/touch
 * Snaps to nearest data point when dragging and highlights the point
 */
import { Chart, Plugin } from 'chart.js';

interface CrosshairPluginOptions {
  width?: number;
  color?: string;
  dash?: number[];
  snapToDataPoints?: boolean;
  highlightPointRadius?: number;
}

interface CrosshairState {
  x: number | null;
  draw: boolean;
  dataPointIndex: number | null;
  dataPointX: number | null;
  isZooming: boolean;
}

declare module 'chart.js' {
  interface Chart {
    crosshair?: CrosshairState;
  }
}

export const crosshairPlugin: Plugin<'line', CrosshairPluginOptions> = {
  id: 'crosshair',
  defaults: {
    width: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    dash: [5, 5],
    snapToDataPoints: true,
    highlightPointRadius: 6,
  },
  afterInit: (chart: Chart) => {
    chart.crosshair = {
      x: null,
      draw: false,
      dataPointIndex: null,
      dataPointX: null,
      isZooming: false
    };
  },
  afterEvent: (chart: Chart, args: any) => {
    const { event, inChartArea } = args;
    const { canvas } = chart;
    
    if (!chart.crosshair) return;
    
    // Keep crosshair visible during zoom - only hide during active pinch gesture
    if (event.native) {
      // Only hide during active multi-touch (pinch gesture in progress)
      if (event.native.touches && event.native.touches.length > 1) {
        // During pinch, keep the last known position but don't update
        return;
      }
      // Reset zooming flag when single touch ends
      if (event.native.type === 'touchend' && (!event.native.touches || event.native.touches.length === 0)) {
        chart.crosshair.isZooming = false;
      }
    }
    
    if (!inChartArea) {
      chart.crosshair.draw = false;
      chart.crosshair.dataPointIndex = null;
      chart.crosshair.dataPointX = null;
      chart.draw();
      return;
    }

    // Chart.js provides event.x which works for both mouse and touch
    let x: number | undefined = event.x;
    
    if (x === undefined || x === null) {
      chart.crosshair.draw = false;
      chart.crosshair.dataPointIndex = null;
      chart.crosshair.dataPointX = null;
      chart.draw();
      return;
    }
    
    // Snap to nearest data point if enabled
    const pluginOptions = (chart.options.plugins?.crosshair as CrosshairPluginOptions) || {};
    if (pluginOptions.snapToDataPoints !== false) {
      const xScale = chart.scales.x;
      
      // Try to get point positions from chart meta data first (most reliable)
      if (chart.data && chart.data.datasets && chart.data.datasets.length > 0) {
        const firstDatasetMeta = chart.getDatasetMeta(0);
        if (firstDatasetMeta && firstDatasetMeta.data && firstDatasetMeta.data.length > 0) {
          // Use actual point positions from the chart
          let nearestX = x;
          let nearestIndex: number | null = null;
          let minDistance = Infinity;
          
          firstDatasetMeta.data.forEach((point: any, index: number) => {
            if (point && typeof point.x === 'number' && !isNaN(point.x)) {
              const distance = Math.abs(point.x - x!);
              
              if (distance < minDistance) {
                minDistance = distance;
                nearestX = point.x;
                nearestIndex = index;
              }
            }
          });
          
          x = nearestX;
          chart.crosshair.dataPointIndex = nearestIndex;
          chart.crosshair.dataPointX = x;
        } else if (xScale && chart.data && chart.data.labels) {
          // Fallback: use labels to find nearest point
          let nearestX = x;
          let nearestIndex: number | null = null;
          let minDistance = Infinity;
          
          chart.data.labels.forEach((label: any, index: number) => {
            let labelValue: number | null = null;
            
            // Handle time scale (Date objects) vs regular scale
            if (xScale.type === 'time') {
              // For time scale, label might be a Date object or timestamp
              if (label instanceof Date) {
                labelValue = label.getTime();
              } else if (typeof label === 'string' || typeof label === 'number') {
                try {
                  labelValue = (xScale as any).parse(label, index);
                } catch (e) {
                  labelValue = null;
                }
              } else {
                labelValue = null;
              }
            } else {
              // For regular scales, use parse method
              try {
                labelValue = (xScale as any).parse(label, index);
              } catch (e) {
                labelValue = null;
              }
            }
            
            if (labelValue !== null && labelValue !== undefined && !isNaN(labelValue)) {
              try {
                const pixelX = xScale.getPixelForValue(labelValue);
                
                if (pixelX !== null && pixelX !== undefined && !isNaN(pixelX)) {
                  const distance = Math.abs(pixelX - x!);
                  
                  if (distance < minDistance) {
                    minDistance = distance;
                    nearestX = pixelX;
                    nearestIndex = index;
                  }
                }
              } catch (e) {
                // Skip if pixel conversion fails
              }
            }
          });
          
          x = nearestX;
          chart.crosshair.dataPointIndex = nearestIndex;
          chart.crosshair.dataPointX = x;
        }
      }
    }
    
    chart.crosshair.x = x;
    chart.crosshair.draw = true;
    chart.draw();
  },
  afterDraw: (chart: Chart) => {
    const { ctx, chartArea, crosshair } = chart;
    
    if (!crosshair || !crosshair.draw || crosshair.x === null) {
      return;
    }

    const x = crosshair.x;
    
    // Check if x is within chart area
    if (x < chartArea.left || x > chartArea.right) {
      return;
    }

    const pluginOptions = (chart.options.plugins?.crosshair as CrosshairPluginOptions) || {};
    const width = pluginOptions.width || 2;
    const color = pluginOptions.color || 'rgba(255, 255, 255, 0.6)';
    const dash = pluginOptions.dash || [5, 5];
    const highlightRadius = pluginOptions.highlightPointRadius || 6;

    ctx.save();
    
    // Draw vertical crosshair line
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    
    // Draw highlighted points at the crosshair position
    if (crosshair.dataPointIndex !== null && chart.data && chart.data.datasets) {
      const dataIndex = crosshair.dataPointIndex;
      
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        
        if (meta && meta.data && meta.data[dataIndex]) {
          const point: any = meta.data[dataIndex];
          const value = dataset.data[dataIndex];
          
          // Check if point is valid and within chart area
          if (value !== null && value !== undefined && !isNaN(value) && 
              point && typeof point.x === 'number' && typeof point.y === 'number' &&
              point.x >= chartArea.left && point.x <= chartArea.right &&
              point.y >= chartArea.top && point.y <= chartArea.bottom) {
            
            const pointX = point.x;
            const pointY = point.y;
            
            // Draw a larger, highlighted point with dataset color
            const pointColor = dataset.borderColor || dataset.pointBackgroundColor || '#fff';
            ctx.fillStyle = pointColor;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(pointX, pointY, highlightRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw inner white circle for better visibility
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pointX, pointY, highlightRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }
    
    ctx.restore();
  }
};


