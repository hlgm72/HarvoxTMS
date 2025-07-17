import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function IconsPreview() {
  const icons = [
    {
      name: 'Favicon',
      path: '/favicon.png',
      description: 'Icono principal del sitio web (512x512)',
      usage: 'Se muestra en las pestañas del navegador'
    },
    {
      name: 'PWA Icon 512',
      path: '/pwa-icon-512.png',
      description: 'Icono principal de PWA (512x512)',
      usage: 'Icono principal para instalación PWA'
    },
    {
      name: 'PWA Maskable 512',
      path: '/pwa-maskable-512.png',
      description: 'Icono PWA con zona segura (512x512)',
      usage: 'Compatible con formas adaptativas de Android'
    },
    {
      name: 'PWA Maskable 192',
      path: '/pwa-maskable-192.png',
      description: 'Icono PWA con zona segura (192x192)',
      usage: 'Versión más pequeña para diferentes contextos'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/dashboard/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Vista Previa de Iconos
          </h1>
          <p className="text-muted-foreground mt-1">
            Todos los iconos generados para PWA y favicon
          </p>
        </div>
      </div>

      {/* Icons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {icons.map((icon, index) => (
          <div 
            key={index}
            className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Icon Display */}
            <div className="flex justify-center mb-4">
              <div className="bg-background border border-border rounded-lg p-4 inline-block">
                <img 
                  src={icon.path} 
                  alt={icon.name}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">Error</div>';
                    }
                  }}
                />
              </div>
            </div>

            {/* Icon Info */}
            <div className="text-center">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                {icon.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {icon.description}
              </p>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1 inline-block">
                {icon.usage}
              </p>
            </div>

            {/* File Path */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground font-mono break-all">
                {icon.path}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 bg-muted/30 rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-3">
          Información Técnica
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <h3 className="font-medium text-foreground mb-2">Favicon</h3>
            <ul className="space-y-1">
              <li>• Formato: PNG con transparencia</li>
              <li>• Tamaño: 512x512 (escalable)</li>
              <li>• Ubicación: public/favicon.png</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-2">Iconos PWA</h3>
            <ul className="space-y-1">
              <li>• Compatibles con todos los dispositivos</li>
              <li>• Versiones maskable para Android</li>
              <li>• Optimizados para instalación</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Installation */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta página es temporal. Los iconos están activos y funcionando en la aplicación.
        </p>
      </div>
    </div>
  );
}