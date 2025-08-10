import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Check, X } from 'lucide-react';

export default function SVGPreview() {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/fleetnest-bimi-vectorized.svg';
    link.download = 'fleetnest-bimi-vectorized.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Vista Previa del Logo BIMI</h1>
        <p className="text-muted-foreground">Verificación del logo vectorizado para BIMI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vista del SVG */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Logo FleetNest BIMI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-8 bg-muted rounded-lg">
              <img 
                src="/fleetnest-bimi-vectorized.svg" 
                alt="FleetNest BIMI Logo"
                className="w-32 h-32"
                onError={(e) => {
                  console.error('Error loading SVG:', e);
                  (e.target as HTMLImageElement).style.border = '2px solid red';
                }}
                onLoad={() => console.log('SVG loaded successfully')}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Formato:</span>
                <span className="text-muted-foreground">SVG vectorizado</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Dimensiones:</span>
                <span className="text-muted-foreground">128x128px</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Compatibilidad:</span>
                <span className="text-muted-foreground">BIMI estándar</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Colores:</span>
                <span className="text-muted-foreground">Corporativos FleetNest</span>
              </div>
            </div>

            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Descargar SVG
            </Button>
          </CardContent>
        </Card>

        {/* Pruebas de escalabilidad */}
        <Card>
          <CardHeader>
            <CardTitle>Pruebas de Escalabilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Tamaño pequeño (32x32px):</p>
                <div className="flex justify-center p-4 bg-muted rounded">
                  <img 
                    src="/fleetnest-bimi-vectorized.svg" 
                    alt="Logo pequeño"
                    className="w-8 h-8"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Tamaño mediano (64x64px):</p>
                <div className="flex justify-center p-4 bg-muted rounded">
                  <img 
                    src="/fleetnest-bimi-vectorized.svg" 
                    alt="Logo mediano"
                    className="w-16 h-16"
                  />
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Tamaño grande (128x128px):</p>
                <div className="flex justify-center p-4 bg-muted rounded">
                  <img 
                    src="/fleetnest-bimi-vectorized.svg" 
                    alt="Logo grande"
                    className="w-32 h-32"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información técnica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Técnica BIMI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Especificaciones BIMI:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Formato SVG Tiny 1.2</li>
                <li>✓ Dimensiones exactas 128x128px</li>
                <li>✓ Tamaño menor a 32KB</li>
                <li>✓ 100% vectorizado</li>
                <li>✓ Colores corporativos</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">URL de descarga:</h4>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {window.location.origin}/fleetnest-bimi-vectorized.svg
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}