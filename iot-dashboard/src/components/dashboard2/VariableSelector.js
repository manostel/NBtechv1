import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  OutlinedInput,
  Typography,
  useTheme
} from '@mui/material';
import { ShowChart as ShowChartIcon } from '@mui/icons-material';

const VariableSelector = ({ 
  variables, 
  selectedVariables, 
  onVariableChange,
  label = "Select variables",
  singleSelect = false,
  showTitle = false
}) => {
  const theme = useTheme();
  const [tempSelected, setTempSelected] = useState(selectedVariables);

  // Update tempSelected when selectedVariables prop changes
  useEffect(() => {
    setTempSelected(selectedVariables);
  }, [selectedVariables]);

  const handleChange = (event) => {
    const newValue = event.target.value;
    setTempSelected(newValue);
    // Only update the parent's state, don't trigger API calls
    onVariableChange({ target: { value: newValue } });
  };

  return (
    <Box sx={{ mb: 0 }}>
      {showTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShowChartIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Metrics
          </Typography>
        </Box>
      )}
      <FormControl sx={{ width: 120 }} size="small">
        <InputLabel sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{label}</InputLabel>
        <Select
          multiple={!singleSelect}
          value={tempSelected}
          onChange={handleChange}
          input={<OutlinedInput 
            label={label}
            sx={{
              color: 'text.primary',
              fontSize: '0.8rem',
              height: '32px',
              borderRadius: 2,
              paddingLeft: '12px',
              paddingRight: '32px',
              backgroundColor: 'inherit',
            }}
          />}
          renderValue={(selected) => {
            if (singleSelect) {
              return selected[0] || '';
            }
            return `${selected.length} selected`;
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
          sx={{
            fontSize: '0.8rem',
            height: '32px',
            borderRadius: 2,
            color: 'text.primary',
            backgroundColor: 'inherit',
            '& .MuiSelect-icon': {
              color: 'text.secondary',
              fontSize: '1.2rem',
              right: '8px'
            },
            '&:hover .MuiSelect-icon': {
              color: 'text.primary',
            },
          }}
        >
          {variables.map((variable) => (
            <MenuItem 
              key={variable} 
              value={variable}
              sx={{ 
                py: 0.5,
                fontSize: '0.8rem',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  },
                },
                '& .MuiListItemText-root': {
                  margin: 0
                }
              }}
            >
              {!singleSelect && (
                <Checkbox 
                  checked={tempSelected.indexOf(variable) > -1} 
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    padding: '4px',
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              )}
              <ListItemText 
                primary={variable} 
                sx={{ 
                  ml: singleSelect ? 0 : 1,
                  '& .MuiTypography-root': {
                    fontSize: '0.8rem',
                    color: 'text.primary',
                  }
                }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default VariableSelector; 