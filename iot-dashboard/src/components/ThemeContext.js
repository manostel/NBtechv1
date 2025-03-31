import React, { createContext, useMemo, useState, useContext, useEffect } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export const CustomThemeContext = createContext({
  currentTheme: "dark",
  setTheme: () => {},
});

export const useCustomTheme = () => {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error('useCustomTheme must be used within a CustomThemeProvider');
  }
  return context;
};

export const CustomThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState("dark");

  // Apply the theme to the HTML element to prevent flashes
  useEffect(() => {
    // Apply theme-specific attributes to document elements
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.style.backgroundColor = themeMode === "dark" ? "#1e1e2f" : "#f9f9f9";
    document.body.style.color = themeMode === "dark" ? "#f4f4f4" : "#333";
    
    // Apply transition only after initial load
    setTimeout(() => {
      document.body.style.transition = 'background-color 0.3s ease';
    }, 100);
  }, [themeMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          background: {
            default: themeMode === "dark" ? "#1e1e2f" : "#f9f9f9",
            paper: themeMode === "dark" ? "#2b2b3d" : "#fff",
          },
          text: {
            primary: themeMode === "dark" ? "#f4f4f4" : "#333",
          },
          primary: {
            main: "#4caf50",
          },
          secondary: {
            main: "#f44336",
          },
        },
        typography: {
          fontFamily: "Roboto, Helvetica, Arial, sans-serif",
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: `
              body {
                transition: background-color 0.3s ease;
                background-color: ${themeMode === "dark" ? "#1e1e2f" : "#f9f9f9"};
                color: ${themeMode === "dark" ? "#f4f4f4" : "#333"};
                min-height: 100vh;
              }
              
              #root {
                min-height: 100vh;
                background-color: ${themeMode === "dark" ? "#1e1e2f" : "#f9f9f9"};
                transition: background-color 0.3s ease;
              }
            `,
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease',
              },
            },
          },
        },
      }),
    [themeMode]
  );

  return (
    <CustomThemeContext.Provider value={{ currentTheme: themeMode, setTheme: setThemeMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CustomThemeContext.Provider>
  );
};
