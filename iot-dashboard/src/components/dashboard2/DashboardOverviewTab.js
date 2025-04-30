import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import OverviewTiles from './OverviewTiles';
import VariableSelector from './VariableSelector';
import DeviceStateDisplay from './DeviceStateDisplay';
import PropTypes from 'prop-types';

const DashboardOverviewTab = ({ 
  metricsData, 
  metricsConfig,
  selectedVariables,
  availableVariables,
  deviceState,
  isLoading,
  onVariableChange
}) => {
  if (!metricsData || !metricsConfig) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Variable Selector */}
      <VariableSelector
        variables={availableVariables}
        selectedVariables={selectedVariables}
        onVariableChange={onVariableChange}
        showTitle={true}
      />

      {/* Overview Tiles */}
      <Box sx={{ mt: 3 }}>
        <OverviewTiles
          metricsData={metricsData}
          metricsConfig={metricsConfig}
          selectedVariables={selectedVariables}
          isLoading={isLoading}
              />
      </Box>

      {/* Device State Display */}
      <DeviceStateDisplay
        deviceState={deviceState}
        isLoading={isLoading}
      />
    </Box>
  );
};

DashboardOverviewTab.propTypes = {
  metricsData: PropTypes.object,
  metricsConfig: PropTypes.object,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  availableVariables: PropTypes.arrayOf(PropTypes.string),
  deviceState: PropTypes.object,
  isLoading: PropTypes.bool,
  onVariableChange: PropTypes.func
};

export default DashboardOverviewTab; 