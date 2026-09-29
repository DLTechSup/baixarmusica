import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/inter';
import './styles.css';

async function boot() {
  if (!window.api) {
    // Aberto fora do Electron (ex.: "vite" no navegador): usa dados de exemplo.
    window.api = (await import('./mockApi.js')).mockApi;
  }
  createRoot(document.getElementById('root')).render(<App />);
}

boot();
