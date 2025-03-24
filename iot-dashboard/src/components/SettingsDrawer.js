import React, { useContext } from "react";
import { Drawer, Box, Typography, IconButton, List, ListItem, ListItemText, Divider } from "@mui/material";
import { CustomThemeContext } from "./ThemeContext";
import { Brightness7, Brightness4, Close } from "@mui/icons-material";

export default function SettingsDrawer({ open, onClose }) {
  const { currentTheme, setTheme } = useContext(CustomThemeContext);

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 300, p: 2, height: "100%", bgcolor: "background.default", color: "text.primary" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItem button onClick={toggleTheme}>
            <ListItemText primary="Toggle Theme" />
            <IconButton>
              {currentTheme === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="Contact Info" secondary="support@example.com" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemText primary="About" secondary="IoT Dashboard v1.0" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}
