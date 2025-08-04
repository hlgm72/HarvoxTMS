import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLogo } from '@/components/ui/AppLogo';

const EagleDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <AppLogo width={80} height={80} className="text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Eagle SVG Demo
            </h1>
            <AppLogo width={80} height={80} className="text-accent" />
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explora las capacidades del SVG del águila: escalabilidad, personalización de colores, efectos CSS y más.
          </p>
        </div>

        {/* Size Variations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppLogo width={32} height={32} className="text-primary" />
              Variaciones de Tamaño
            </CardTitle>
            <CardDescription>
              Los SVG se escalan perfectamente sin pérdida de calidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-8 p-8">
              <div className="text-center space-y-2">
                <AppLogo width={24} height={24} className="text-primary mx-auto" />
                <Badge variant="outline">24px</Badge>
              </div>
              <div className="text-center space-y-2">
                <AppLogo width={48} height={48} className="text-primary mx-auto" />
                <Badge variant="outline">48px</Badge>
              </div>
              <div className="text-center space-y-2">
                <AppLogo width={80} height={80} className="text-primary mx-auto" />
                <Badge variant="outline">80px</Badge>
              </div>
              <div className="text-center space-y-2">
                <AppLogo width={120} height={120} className="text-primary mx-auto" />
                <Badge variant="outline">120px</Badge>
              </div>
              <div className="text-center space-y-2">
                <AppLogo width={160} height={160} className="text-primary mx-auto" />
                <Badge variant="outline">160px</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Variations */}
        <Card>
          <CardHeader>
            <CardTitle>Variaciones de Color</CardTitle>
            <CardDescription>
              Fácil personalización de colores usando clases CSS y tokens del sistema de diseño
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-8 p-8">
              <div className="text-center space-y-3">
                <AppLogo width={80} height={80} className="text-primary mx-auto" />
                <Badge className="bg-primary text-primary-foreground">Primary</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo width={80} height={80} className="text-secondary-foreground mx-auto" />
                <Badge variant="secondary">Secondary</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo width={80} height={80} className="text-accent mx-auto" />
                <Badge className="bg-accent text-accent-foreground">Accent</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo width={80} height={80} className="text-destructive mx-auto" />
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSS Effects */}
        <Card>
          <CardHeader>
            <CardTitle>Efectos CSS</CardTitle>
            <CardDescription>
              Animaciones y efectos visuales aplicados al SVG
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-8 p-8">
              <div className="text-center space-y-3">
                <AppLogo 
                  width={80} 
                  height={80} 
                  className="text-primary mx-auto transition-transform duration-300 hover:scale-110 cursor-pointer" 
                />
                <Badge variant="outline">Hover Scale</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo 
                  width={80} 
                  height={80} 
                  className="text-accent mx-auto transition-all duration-500 hover:rotate-12 cursor-pointer" 
                />
                <Badge variant="outline">Hover Rotate</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo 
                  width={80} 
                  height={80} 
                  className="text-primary mx-auto animate-pulse" 
                />
                <Badge variant="outline">Pulse Animation</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gradients and Advanced Styling */}
        <Card>
          <CardHeader>
            <CardTitle>Gradientes y Estilos Avanzados</CardTitle>
            <CardDescription>
              Efectos avanzados usando CSS y gradientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-8 p-8">
              <div className="text-center space-y-3">
                <div 
                  className="mx-auto w-20 h-20 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(45deg, hsl(var(--primary)), hsl(var(--accent)))',
                    borderRadius: '50%',
                    padding: '8px'
                  }}
                >
                  <AppLogo width={60} height={60} className="text-white" />
                </div>
                <Badge variant="outline">Circular Background</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo 
                  width={80} 
                  height={80} 
                  className="mx-auto drop-shadow-2xl"
                  style={{ 
                    filter: 'drop-shadow(0 10px 20px hsl(var(--primary) / 0.3))'
                  }}
                />
                <Badge variant="outline">Drop Shadow</Badge>
              </div>
              <div className="text-center space-y-3">
                <AppLogo 
                  width={80} 
                  height={80} 
                  className="text-primary mx-auto opacity-60 transition-opacity hover:opacity-100 cursor-pointer" 
                />
                <Badge variant="outline">Opacity Effect</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Use Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Casos de Uso Prácticos</CardTitle>
            <CardDescription>
              Ejemplos de cómo usar el SVG en diferentes contextos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Header */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Header de navegación</h4>
              <div className="flex items-center justify-between bg-card p-4 rounded border">
                <div className="flex items-center gap-3">
                  <AppLogo width={32} height={32} className="text-primary" />
                  <span className="font-bold">FleetNest</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Dashboard</span>
                  <span className="text-sm text-muted-foreground">Drivers</span>
                  <span className="text-sm text-muted-foreground">Reports</span>
                </div>
              </div>
            </div>

            {/* Card Icon */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Ícono en tarjetas</h4>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <AppLogo width={24} height={24} className="text-primary" />
                      <CardTitle className="text-lg">Fleet Status</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Active vehicles: 24</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <AppLogo width={24} height={24} className="text-accent" />
                      <CardTitle className="text-lg">Performance</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Efficiency: 95%</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Loading State */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Estado de carga</h4>
              <div className="flex items-center justify-center p-8 bg-muted/30 rounded">
                <div className="text-center space-y-3">
                  <AppLogo 
                    width={60} 
                    height={60} 
                    className="text-primary mx-auto animate-spin" 
                    style={{ animationDuration: '3s' }}
                  />
                  <p className="text-sm text-muted-foreground">Cargando datos de la flota...</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Ventajas Técnicas del SVG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">✅ Ventajas</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Escalabilidad infinita sin pérdida de calidad</li>
                  <li>• Tamaño de archivo muy pequeño</li>
                  <li>• Personalización de colores con CSS</li>
                  <li>• Compatible con animaciones CSS</li>
                  <li>• Soporte para efectos visuales avanzados</li>
                  <li>• Accesibilidad mejorada</li>
                  <li>• SEO friendly</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600">⚠️ Vs PNG</h4>
                <ul className="space-y-2 text-sm">
                  <li>• PNG: Píxeles fijos, se pixela al escalar</li>
                  <li>• PNG: Archivo más grande (especialmente en alta resolución)</li>
                  <li>• PNG: Color fijo, no personalizable</li>
                  <li>• PNG: No compatible con animaciones CSS</li>
                  <li>• SVG: Vector, perfecta calidad en cualquier tamaño</li>
                  <li>• SVG: Completamente personalizable</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EagleDemo;