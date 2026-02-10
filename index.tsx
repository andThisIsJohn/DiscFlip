
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as Sentry from "@sentry/react";
import { config } from './services/config';

// Initialize Vault Monitoring
if (!config.isMockEnabled && import.meta.env.VITE_SENTRY_DSN) {  
	Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: config.env,
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
