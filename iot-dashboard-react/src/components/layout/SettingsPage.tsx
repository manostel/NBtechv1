import React, { useContext } from "react";
import { Box, Button, Typography } from "@mui/material";
import { CustomThemeContext } from "../common/ThemeContext";

const SettingsPage: React.FC = () => {
  const { currentTheme, setTheme } = useContext(CustomThemeContext);

  const toggleTheme = (): void => {
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


