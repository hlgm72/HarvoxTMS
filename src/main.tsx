
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 main.tsx: Starting application initialization...');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: #dc2626;">
      <h1>Error: No se pudo inicializar la aplicación</h1>
      <p>El elemento raíz no se encontró en el DOM.</p>
      <button onclick="window.location.reload()" style="padding: 8px 16px; margin-top: 10px;">
        Recargar página
      </button>
    </div>
  `;
  throw new Error('Root element not found');
}

try {
  console.log('📦 main.tsx: Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('🎯 main.tsx: Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ main.tsx: Application mounted successfully!');
} catch (error) {
  console.error('❌ main.tsx: Error mounting app:', error);
  
  // Show user-friendly error message
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; color: #dc2626; max-width: 600px; margin: 0 auto;">
      <h1>Error de inicialización</h1>
      <p>No se pudo cargar FleetNest. Por favor, intenta:</p>
      <ul style="margin: 15px 0;">
        <li>Recargar la página (Ctrl+F5 o Cmd+Shift+R)</li>
        <li>Limpiar el cache del navegador</li>
        <li>Verificar tu conexión a internet</li>
      </ul>
      <button onclick="window.location.reload()" 
              style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">
        Recargar página
      </button>
      <details style="margin-top: 20px;">
        <summary style="cursor: pointer; color: #6b7280;">Detalles técnicos</summary>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow: auto;">
${error instanceof Error ? error.stack : String(error)}
        </pre>
      </details>
    </div>
  `;
  
  throw error;
}
