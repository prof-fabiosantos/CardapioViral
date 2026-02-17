import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Optional: if you add global styles later

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element');
}