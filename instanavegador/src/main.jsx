import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Fora do Electron (ex.: visualizar a interface no navegador) usa uma API simulada.
async function start() {
  if (!window.bridge) window.bridge = (await import('./mockApi.js')).mockBridge;
  createRoot(document.getElementById('root')).render(<App />);
}
start();
