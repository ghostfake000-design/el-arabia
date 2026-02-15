
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('index.tsx: root element not found');
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
console.log('index.tsx: about to render App');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
