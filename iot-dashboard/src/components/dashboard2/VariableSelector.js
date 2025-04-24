import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  OutlinedInput
} from '@mui/material';

const VariableSelector = ({ 
  variables, 
  selectedVariables, 
  onVariableChange,
  label = "Select variables",
  singleSelect = false
}) => {
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
    <Box sx={{ mb: 2 }}>
      <FormControl sx={{ width: 150 }} size="small">
        <InputLabel>{label}</InputLabel>
        <Select
          multiple={!singleSelect}
          value={tempSelected}
          onChange={handleChange}
          input={<OutlinedInput label={label} />}
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
                width: 200,
              },
            },
          }}
        >
          {variables.map((variable) => (
            <MenuItem 
              key={variable} 
              value={variable}
              sx={{ 
                py: 0.5,
                '& .MuiListItemText-root': {
                  margin: 0
                }
              }}
            >
              {!singleSelect && <Checkbox checked={tempSelected.indexOf(variable) > -1} size="small" />}
              <ListItemText 
                primary={variable} 
                sx={{ 
                  ml: singleSelect ? 0 : 1,
                  '& .MuiTypography-root': {
                    fontSize: '0.875rem'
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