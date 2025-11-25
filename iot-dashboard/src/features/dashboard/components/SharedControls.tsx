import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import VariableSelector from './VariableSelector';

const TIME_RANGES = [
  { value: 'live', label: 'Live' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '2h', label: 'Last 2 hours' },
  { value: '4h', label: 'Last 4 hours' },
  { value: '8h', label: 'Last 8 hours' },
  { value: '16h', label: 'Last 16 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' }
];

interface SharedControlsProps {
  selectedVariables: string[];
  availableVariables: string[];
  onVariableChange: (event: any) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onApply: () => void;
  isOverview?: boolean;
  title?: string;
  chartConfig?: any;
}

const SharedControls: React.FC<SharedControlsProps> = ({
  selectedVariables,
  availableVariables,
  onVariableChange,
  timeRange,
  onTimeRangeChange,
  onApply,
  isOverview = false,
  title = 'Graphs'
}) => {
  // Don't render anything for the overview tab as it uses the latest data API
  if (isOverview) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: { xs: 0.5, sm: 2 },
      minWidth: 0,
      '& > *': { width: 'auto', minWidth: 0 }
    }}>
      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 2 }, justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ width: { xs: 92, sm: 120 }, overflow: 'visible' }}>
          <InputLabel sx={{ color: 'text.secondary', fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            label="Time Range"
            size="small"
            inputProps={{
              sx: {
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
                height: '32px',
                borderRadius: 2,
                paddingLeft: '12px',
                paddingRight: '32px',
                backgroundColor: 'inherit',
              }
            }}
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.8rem' },
              height: '32px',
              borderRadius: 2,
              color: 'text.primary',
              backgroundColor: 'inherit',
              '& .MuiSelect-icon': {
                color: 'text.secondary',
                fontSize: { xs: '1rem', sm: '1.2rem' },
                right: '8px'
              },
              '&:hover .MuiSelect-icon': {
                color: 'text.primary',
              },
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200,
                  width: 180,
                  backgroundColor: '#1a1f3c',
                  color: '#E0E0E0',
                  borderRadius: '12px',
                  marginTop: '4px'
                },
              },
            }}
          >
            {TIME_RANGES.map((range) => (
              <MenuItem key={range.value} value={range.value} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                {range.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <VariableSelector
          variables={availableVariables}
          selectedVariables={selectedVariables}
          onVariableChange={onVariableChange}
          label="Chart Variables"
        />
        <Button
          variant="outlined"
          color="inherit"
          onClick={onApply}
          disabled={selectedVariables.length === 0}
          size="small"
          sx={{ 
            minWidth: { xs: 60, sm: 80 },
            height: '32px',
            borderRadius: 2,
            fontWeight: 500,
            textTransform: 'none',
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            px: { xs: 1.25, sm: 2 },
            borderColor: 'text.secondary',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'text.primary',
              backgroundColor: 'rgba(0,0,0,0.04)'
            }
          }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
};

export default SharedControls;

