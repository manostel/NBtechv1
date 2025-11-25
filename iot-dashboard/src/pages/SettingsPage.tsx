// SettingsPage.tsx
import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { useCustomTheme } from "../context/ThemeContext"; // Updated to use the hook from .tsx

const SettingsPage: React.FC = () => {
  const { currentTheme, setTheme } = useCustomTheme();

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Button variant="contained" onClick={toggleTheme}>
        Switch to {currentTheme === "dark" ? "Light" : "Dark"} Mode
      </Button>
    </Box>
  );
};

export default SettingsPage;

