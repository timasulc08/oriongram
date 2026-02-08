import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initCapacitorPlugins } from './utils/capacitor';

// Инициализируем Capacitor плагины если запущены на Android/iOS
initCapacitorPlugins();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
