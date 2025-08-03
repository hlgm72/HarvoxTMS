
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupGlobalAuthErrorHandler } from './lib/authErrorHandler'

// console.log('🚀 main.tsx: Starting application initialization...');

// Setup global auth error handling
setupGlobalAuthErrorHandler();

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('❌ Root element not found!');
  // Secure DOM manipulation - avoid innerHTML
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; font-family: system-ui; color: #dc2626;';
  
  const title = document.createElement('h1');
  title.textContent = 'Error: No se pudo inicializar la aplicación';
  
  const message = document.createElement('p');
  message.textContent = 'El elemento raíz no se encontró en el DOM.';
  
  const button = document.createElement('button');
  button.textContent = 'Recargar página';
  button.style.cssText = 'padding: 8px 16px; margin-top: 10px;';
  button.onclick = () => window.location.reload();
  
  errorDiv.appendChild(title);
  errorDiv.appendChild(message);
  errorDiv.appendChild(button);
  document.body.appendChild(errorDiv);
  throw new Error('Root element not found');
}

try {
  // console.log('📦 main.tsx: Creating React root...');
  const root = createRoot(rootElement);
  
  // console.log('🎯 main.tsx: Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // console.log('✅ main.tsx: Application mounted successfully!');
} catch (error) {
  console.error('❌ main.tsx: Error mounting app:', error);
  
  // Show user-friendly error message - secure DOM manipulation
  const errorContainer = document.createElement('div');
  errorContainer.style.cssText = 'padding: 20px; font-family: system-ui; color: #dc2626; max-width: 600px; margin: 0 auto;';
  
  const title = document.createElement('h1');
  title.textContent = 'Error de inicialización';
  
  const description = document.createElement('p');
  description.textContent = 'No se pudo cargar FleetNest. Por favor, intenta:';
  
  const stepsList = document.createElement('ul');
  stepsList.style.cssText = 'margin: 15px 0;';
  
  const steps = [
    'Recargar la página (Ctrl+F5 o Cmd+Shift+R)',
    'Limpiar el cache del navegador',
    'Verificar tu conexión a internet'
  ];
  
  steps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    stepsList.appendChild(li);
  });
  
  const reloadButton = document.createElement('button');
  reloadButton.textContent = 'Recargar página';
  reloadButton.style.cssText = 'padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;';
  reloadButton.onclick = () => window.location.reload();
  
  const details = document.createElement('details');
  details.style.cssText = 'margin-top: 20px;';
  
  const summary = document.createElement('summary');
  summary.style.cssText = 'cursor: pointer; color: #6b7280;';
  summary.textContent = 'Detalles técnicos';
  
  const pre = document.createElement('pre');
  pre.style.cssText = 'background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow: auto;';
  pre.textContent = error instanceof Error ? (error.stack || error.message) : String(error);
  
  details.appendChild(summary);
  details.appendChild(pre);
  
  errorContainer.appendChild(title);
  errorContainer.appendChild(description);
  errorContainer.appendChild(stepsList);
  errorContainer.appendChild(reloadButton);
  errorContainer.appendChild(details);
  
  rootElement.appendChild(errorContainer);
  
  throw error;
}
