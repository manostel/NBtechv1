import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CustomThemeProvider } from "./components/ThemeContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // Comment out StrictMode to remove the warning
  // <React.StrictMode>
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  // </React.StrictMode>
);
