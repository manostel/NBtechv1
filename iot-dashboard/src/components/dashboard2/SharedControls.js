import React from 'react';
import { Box, Button } from '@mui/material';
import VariableSelector from './VariableSelector';

const TIME_RANGES = ['live', '15m', '1h', '2h', '4h', '8h', '16h', '24h'];

const SharedControls = ({
  selectedVariables,
  availableVariables,
  onVariableChange,
  timeRange,
  onTimeRangeChange,
  onApply
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
      <VariableSelector
        variables={availableVariables}
        selectedVariables={selectedVariables}
        onVariableChange={onVariableChange}
        label="Variables"
      />
      <VariableSelector
        variables={TIME_RANGES}
        selectedVariables={[timeRange]}
        onVariableChange={(e) => onTimeRangeChange(e.target.value[0])}
        label="Time Range"
        singleSelect
      />
      <Button 
        variant="contained" 
        onClick={onApply}
        disabled={!selectedVariables.length}
      >
        Apply
      </Button>
    </Box>
  );
};

export default SharedControls; 