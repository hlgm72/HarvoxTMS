import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 main.tsx starting...');

const rootElement = document.getElementById("root");
console.log('📦 Root element found:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

try {
  console.log('🔧 Creating root...');
  const root = createRoot(rootElement);
  
  console.log('📱 Rendering app...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ main.tsx mounted successfully');
} catch (error) {
  console.error('❌ Error mounting app:', error);
  throw error;
}
