import React from 'react';
import { Box, Button, SelectChangeEvent } from '@mui/material';
import VariableSelector from './VariableSelector';
import TimeRangeSelector from './TimeRangeSelector';

interface DataControlsProps {
  variables: string[];
  selectedVariables: string[];
  onVariableChange: (event: any) => void;
  timeRange: string;
  onTimeRangeChange: (event: SelectChangeEvent<string>) => void;
  onApply: () => void;
}

const DataControls: React.FC<DataControlsProps> = ({ 
  variables,
  selectedVariables,
  onVariableChange,
  timeRange,
  onTimeRangeChange,
  onApply
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 2, 
      mb: 3, 
      alignItems: 'center', 
      flexWrap: 'wrap' 
    }}>
      <VariableSelector
        variables={variables}
        selectedVariables={selectedVariables}
        onVariableChange={onVariableChange}
      />
      <TimeRangeSelector
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
      />
      <Button 
        variant="contained" 
        color="primary"
        onClick={onApply}
        sx={{ minWidth: 100 }}
      >
        Apply
      </Button>
    </Box>
  );
};

export default DataControls;

