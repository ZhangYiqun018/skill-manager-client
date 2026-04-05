import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LANGUAGE_STORAGE_KEY } from "./i18n";
import { ToastProvider } from "./components/ToastProvider";

const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage = savedLanguage === "zh" ? "zh" : "en";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary language={initialLanguage}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
