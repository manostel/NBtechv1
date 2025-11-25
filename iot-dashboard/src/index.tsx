import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App";
import { CustomThemeProvider } from "./context/ThemeContext";
import { queryClient } from "./lib/react-query";
import "./index.css";
import "./i18n/config"; // Initialize i18n

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <QueryClientProvider client={queryClient}>
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
    {/* Show React Query DevTools in development */}
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

