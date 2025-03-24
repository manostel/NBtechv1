import React, { createContext, useMemo, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export const CustomThemeContext = createContext({
  currentTheme: "dark",
  setTheme: () => {},
});

export const CustomThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState("dark");

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
      }),
    [themeMode]
  );

  return (
    <CustomThemeContext.Provider value={{ currentTheme: themeMode, setTheme: setThemeMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CustomThemeContext.Provider>
  );
};
