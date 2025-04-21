import React, { useState } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  Button
} from '@mui/material';

const VariableSelector = ({ variables, selectedVariables, onVariableChange }) => {
  const [tempSelected, setTempSelected] = useState(selectedVariables);

  const handleChange = (event) => {
    setTempSelected(event.target.value);
  };

  const handleApply = () => {
    onVariableChange({ target: { value: tempSelected } });
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <FormControl sx={{ width: 150 }} size="small">
          <InputLabel>Select variables</InputLabel>
          <Select
            multiple
            value={tempSelected}
            onChange={handleChange}
            renderValue={(selected) => `${selected.length} selected`}
            label="Select variables"
            size="small"
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
                <Checkbox checked={tempSelected.indexOf(variable) > -1} size="small" />
                <ListItemText 
                  primary={variable} 
                  sx={{ 
                    ml: 1,
                    '& .MuiTypography-root': {
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          onClick={handleApply}
          size="small"
          sx={{ minWidth: 80 }}
        >
          Apply
        </Button>
      </Box>
    </Box>
  );
};

export default VariableSelector; 