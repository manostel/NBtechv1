// SettingsPage.js
import React, { useContext } from "react";
import { Box, Button, Typography } from "@mui/material";
import { CustomThemeContext } from "../components/ThemeContext"; // adjust path if needed

export default function SettingsPage() {
  const { currentTheme, setTheme } = useContext(CustomThemeContext);

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
}
