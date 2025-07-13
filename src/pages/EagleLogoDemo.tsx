import React from "react";
import { EagleLogo } from "@/components/ui/EagleLogo";

export default function EagleLogoDemo() {
  return (
    <div className="min-h-screen bg-gradient-subtle p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Eagle Logo SVG Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Demonstrando la versatilidad y flexibilidad del logo SVG
          </p>
        </div>

        {/* Diferentes tamaños */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Diferentes Tamaños</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            <div className="text-center">
              <EagleLogo width={40} height={40} />
              <p className="text-sm text-muted-foreground mt-2">40x40</p>
            </div>
            <div className="text-center">
              <EagleLogo width={80} height={80} />
              <p className="text-sm text-muted-foreground mt-2">80x80</p>
            </div>
            <div className="text-center">
              <EagleLogo width={120} height={120} />
              <p className="text-sm text-muted-foreground mt-2">120x120</p>
            </div>
            <div className="text-center">
              <EagleLogo width={200} height={200} />
              <p className="text-sm text-muted-foreground mt-2">200x200</p>
            </div>
          </div>
        </section>

        {/* Diferentes colores */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Diferentes Colores</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
            <div className="text-center">
              <EagleLogo width={100} height={100} fill="hsl(var(--primary))" />
              <p className="text-sm text-muted-foreground mt-2">Primary</p>
            </div>
            <div className="text-center">
              <EagleLogo width={100} height={100} fill="hsl(var(--secondary))" />
              <p className="text-sm text-muted-foreground mt-2">Secondary</p>
            </div>
            <div className="text-center">
              <EagleLogo width={100} height={100} fill="hsl(var(--accent))" />
              <p className="text-sm text-muted-foreground mt-2">Accent</p>
            </div>
            <div className="text-center">
              <EagleLogo width={100} height={100} fill="#ef4444" />
              <p className="text-sm text-muted-foreground mt-2">Red</p>
            </div>
            <div className="text-center">
              <EagleLogo width={100} height={100} fill="#22c55e" />
              <p className="text-sm text-muted-foreground mt-2">Green</p>
            </div>
          </div>
        </section>

        {/* Con efectos CSS */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Efectos CSS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center justify-items-center">
            <div className="text-center">
              <EagleLogo 
                width={120} 
                height={120} 
                className="hover:scale-110 transition-transform duration-300 cursor-pointer" 
              />
              <p className="text-sm text-muted-foreground mt-2">Hover Scale</p>
            </div>
            <div className="text-center">
              <EagleLogo 
                width={120} 
                height={120} 
                className="animate-pulse" 
              />
              <p className="text-sm text-muted-foreground mt-2">Pulse</p>
            </div>
            <div className="text-center">
              <EagleLogo 
                width={120} 
                height={120} 
                className="opacity-50 hover:opacity-100 transition-opacity duration-300" 
              />
              <p className="text-sm text-muted-foreground mt-2">Fade</p>
            </div>
          </div>
        </section>

        {/* En diferentes fondos */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">En Diferentes Fondos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <EagleLogo width={100} height={100} fill="black" />
              <p className="text-sm text-gray-600 mt-2">Fondo Blanco</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-lg shadow-lg text-center">
              <EagleLogo width={100} height={100} fill="white" />
              <p className="text-sm text-gray-300 mt-2">Fondo Oscuro</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-lg shadow-lg text-center">
              <EagleLogo width={100} height={100} fill="white" />
              <p className="text-sm text-white mt-2">Fondo Gradiente</p>
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Casos de Uso</h2>
          <div className="space-y-8">
            
            {/* Header/Navbar */}
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">En Header/Navbar</h3>
              <div className="flex items-center justify-between bg-background border rounded p-3">
                <div className="flex items-center gap-3">
                  <EagleLogo width={32} height={32} />
                  <span className="font-semibold text-foreground">FleetNest</span>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Dashboard</span>
                  <span>Fleet</span>
                  <span>Reports</span>
                </div>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">En Formulario de Login</h3>
              <div className="bg-background border rounded p-6 max-w-md mx-auto">
                <div className="text-center mb-6">
                  <EagleLogo width={80} height={80} className="mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">Iniciar Sesión</h3>
                </div>
                <div className="space-y-3">
                  <div className="h-10 bg-muted rounded border"></div>
                  <div className="h-10 bg-muted rounded border"></div>
                  <div className="h-10 bg-primary rounded"></div>
                </div>
              </div>
            </div>

            {/* Favicon/Icon */}
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">Como Favicon/Icono</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-background border rounded p-2">
                  <EagleLogo width={16} height={16} />
                  <span className="text-sm">FleetNest - Pestana del navegador</span>
                </div>
                <div className="flex items-center gap-2 bg-background border rounded p-2">
                  <EagleLogo width={24} height={24} />
                  <span className="text-sm">Icono de aplicación</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ventajas del SVG */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Ventajas del SVG vs PNG</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">✅ SVG</h3>
              <ul className="space-y-2 text-green-700 dark:text-green-300">
                <li>• Escalable sin pérdida de calidad</li>
                <li>• Tamaño de archivo muy pequeño</li>
                <li>• Colores personalizables con CSS</li>
                <li>• Animaciones y efectos CSS</li>
                <li>• Responsivo por defecto</li>
                <li>• SEO friendly</li>
                <li>• Carga instantánea</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3">❌ PNG</h3>
              <ul className="space-y-2 text-red-700 dark:text-red-300">
                <li>• Se pixela al escalar</li>
                <li>• Archivos más pesados</li>
                <li>• Colores fijos</li>
                <li>• Sin efectos dinámicos</li>
                <li>• Múltiples tamaños necesarios</li>
                <li>• Tiempo de carga</li>
                <li>• Gestión de assets compleja</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}