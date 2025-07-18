import React, { useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function IconsPreview() {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileName: string, expectedSize: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validate dimensions
    const img = new Image();
    img.onload = () => {
      const expectedDimensions = expectedSize.split('x').map(Number);
      if (img.width !== expectedDimensions[0] || img.height !== expectedDimensions[1]) {
        alert(`La imagen debe ser exactamente ${expectedSize} píxeles. Tu imagen es ${img.width}x${img.height}`);
        return;
      }

      setUploadedFiles(prev => ({ ...prev, [fileName]: file }));
    };
    img.src = URL.createObjectURL(file);
  };

  const icons = [
    {
      name: 'Favicon',
      path: '/lovable-uploads/f3d83410-881e-4b9d-8ef2-bd9c40f8da4d.png',
      description: 'Icono principal del sitio web (32x32)',
      usage: 'Se muestra en las pestañas del navegador'
    },
    {
      name: 'PWA Icon 512',
      path: '/lovable-uploads/a62304fc-8fd6-43ae-9fa7-c311351ae311.png',
      description: 'Icono principal de PWA (512x512)',
      usage: 'Icono principal para instalación PWA'
    },
    {
      name: 'PWA Maskable 512',
      path: '/lovable-uploads/8522f6bd-e37d-423e-9fee-2082bacc010c.png',
      description: 'Icono PWA con zona segura (512x512)',
      usage: 'Compatible con formas adaptativas de Android'
    },
    {
      name: 'PWA Maskable 192',
      path: '/lovable-uploads/e5c8efef-b0eb-4c43-9d75-068130d1d349.png',
      description: 'Icono PWA con zona segura (192x192)',
      usage: 'Versión más pequeña para diferentes contextos'
    },
    {
      name: 'Logo Principal',
      path: '/lovable-uploads/14d1a3f9-392d-4ce8-beae-9d16eb2c5913.png',
      description: 'Logo principal del escudo (PNG)',
      usage: 'Se usa en Sidebar y página de Auth'
    },
    {
      name: 'Apple Touch Icon',
      path: '/lovable-uploads/60ba4962-a8fe-4412-8a45-79bc634d5cbd.png',
      description: 'Icono para dispositivos Apple (180x180)',
      usage: 'Icono para iOS/Safari cuando se agrega a pantalla inicio'
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
              <li>• Ubicación: lovable-uploads/favicon</li>
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

      {/* Upload Section */}
      <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg text-foreground">
            Subir Nuevos Iconos
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Sube tus iconos personalizados con las dimensiones exactas requeridas
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Favicon Upload */}
          <div className="space-y-3">
            <Label htmlFor="favicon" className="text-sm font-medium">
              Favicon (512x512)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <Input
                id="favicon"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'favicon.png', '512x512')}
              />
              <Label htmlFor="favicon" className="cursor-pointer">
                {uploadedFiles['favicon.png'] ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      {uploadedFiles['favicon.png'].name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Seleccionar favicon
                    </p>
                  </div>
                )}
              </Label>
            </div>
          </div>

          {/* PWA Icon 512 Upload */}
          <div className="space-y-3">
            <Label htmlFor="pwa-512" className="text-sm font-medium">
              PWA Icon (512x512)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <Input
                id="pwa-512"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'pwa-icon-512.png', '512x512')}
              />
              <Label htmlFor="pwa-512" className="cursor-pointer">
                {uploadedFiles['pwa-icon-512.png'] ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      {uploadedFiles['pwa-icon-512.png'].name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Seleccionar PWA 512
                    </p>
                  </div>
                )}
              </Label>
            </div>
          </div>

          {/* PWA Maskable 512 Upload */}
          <div className="space-y-3">
            <Label htmlFor="pwa-maskable-512" className="text-sm font-medium">
              PWA Maskable (512x512)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <Input
                id="pwa-maskable-512"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'pwa-maskable-512.png', '512x512')}
              />
              <Label htmlFor="pwa-maskable-512" className="cursor-pointer">
                {uploadedFiles['pwa-maskable-512.png'] ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      {uploadedFiles['pwa-maskable-512.png'].name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Seleccionar Maskable 512
                    </p>
                  </div>
                )}
              </Label>
            </div>
          </div>

          {/* PWA Maskable 192 Upload */}
          <div className="space-y-3">
            <Label htmlFor="pwa-maskable-192" className="text-sm font-medium">
              PWA Maskable (192x192)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <Input
                id="pwa-maskable-192"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'pwa-maskable-192.png', '192x192')}
              />
              <Label htmlFor="pwa-maskable-192" className="cursor-pointer">
                {uploadedFiles['pwa-maskable-192.png'] ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      {uploadedFiles['pwa-maskable-192.png'].name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Seleccionar Maskable 192
                    </p>
                  </div>
                )}
              </Label>
            </div>
          </div>
        </div>

        {Object.keys(uploadedFiles).length > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-2">
              Archivos listos para usar:
            </p>
            <ul className="text-sm text-green-600 space-y-1">
              {Object.entries(uploadedFiles).map(([fileName, file]) => (
                <li key={fileName}>• {fileName} - {file.name}</li>
              ))}
            </ul>
            <p className="text-xs text-green-600 mt-3">
              Los archivos están validados y listos. Ahora puedes usarlos directamente en tu aplicación.
            </p>
          </div>
        )}
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