import React from 'react';
import { EagleLogo } from '@/components/ui/EagleLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EagleLogoDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            EagleLogo Component Demo
          </h1>
          <p className="text-lg text-slate-600">
            Diferentes usos y personalizaciones del componente SVG del águila
          </p>
        </div>

        {/* Size Variations */}
        <Card>
          <CardHeader>
            <CardTitle>Variaciones de Tamaño</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-around gap-8 flex-wrap">
            <div className="text-center">
              <EagleLogo width={32} height={32} className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">32px</p>
            </div>
            <div className="text-center">
              <EagleLogo width={48} height={48} className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">48px</p>
            </div>
            <div className="text-center">
              <EagleLogo width={64} height={64} className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">64px</p>
            </div>
            <div className="text-center">
              <EagleLogo width={96} height={96} className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">96px</p>
            </div>
            <div className="text-center">
              <EagleLogo width={128} height={128} className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">128px</p>
            </div>
          </CardContent>
        </Card>

        {/* Color Variations */}
        <Card>
          <CardHeader>
            <CardTitle>Variaciones de Color</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <EagleLogo width={80} height={80} fill="black" className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">Negro (predeterminado)</p>
            </div>
            <div className="text-center">
              <EagleLogo width={80} height={80} fill="#3B82F6" className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">Azul</p>
            </div>
            <div className="text-center">
              <EagleLogo width={80} height={80} fill="#10B981" className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">Verde</p>
            </div>
            <div className="text-center">
              <EagleLogo width={80} height={80} fill="#F59E0B" className="mx-auto mb-2" />
              <p className="text-sm text-slate-600">Amarillo</p>
            </div>
          </CardContent>
        </Card>

        {/* Responsive with CSS Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Con Clases CSS Personalizadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-red-600 hover:text-red-800 transition-colors duration-300 cursor-pointer" 
              />
              <p className="text-sm">Hover para cambiar color (rojo)</p>
            </div>
            
            <div className="flex items-center gap-4">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-purple-600 drop-shadow-lg animate-pulse" 
              />
              <p className="text-sm">Con sombra y animación pulse</p>
            </div>
            
            <div className="flex items-center gap-4">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-blue-600 hover:scale-110 transition-transform duration-300 cursor-pointer" 
              />
              <p className="text-sm">Hover para escalar</p>
            </div>
          </CardContent>
        </Card>

        {/* In Navigation/Headers */}
        <Card>
          <CardHeader>
            <CardTitle>En Navegación y Headers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mock navigation bar */}
            <div className="bg-slate-800 text-white p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <EagleLogo width={40} height={40} fill="white" />
                  <span className="text-xl font-bold">FleetNest</span>
                </div>
                <div className="hidden md:flex space-x-6">
                  <a href="#" className="hover:text-blue-300">Dashboard</a>
                  <a href="#" className="hover:text-blue-300">Flota</a>
                  <a href="#" className="hover:text-blue-300">Reportes</a>
                </div>
              </div>
            </div>

            {/* Mock header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
              <div className="flex items-center space-x-4">
                <EagleLogo width={64} height={64} fill="white" className="drop-shadow-lg" />
                <div>
                  <h2 className="text-2xl font-bold">Bienvenido a FleetNest</h2>
                  <p className="text-blue-100">Gestión inteligente de flotas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading States */}
        <Card>
          <CardHeader>
            <CardTitle>Estados de Carga y Animaciones</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-around flex-wrap gap-8">
            <div className="text-center">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-blue-600 animate-spin" 
              />
              <p className="text-sm text-slate-600 mt-2">Girando</p>
            </div>
            
            <div className="text-center">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-green-600 animate-bounce" 
              />
              <p className="text-sm text-slate-600 mt-2">Rebotando</p>
            </div>
            
            <div className="text-center">
              <EagleLogo 
                width={60} 
                height={60} 
                className="text-purple-600 animate-pulse" 
              />
              <p className="text-sm text-slate-600 mt-2">Pulsando</p>
            </div>
          </CardContent>
        </Card>

        {/* Different Backgrounds */}
        <Card>
          <CardHeader>
            <CardTitle>En Diferentes Fondos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border-2 border-slate-200 text-center">
              <EagleLogo width={60} height={60} fill="black" className="mx-auto mb-2" />
              <p className="text-sm">Fondo claro</p>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg text-center">
              <EagleLogo width={60} height={60} fill="white" className="mx-auto mb-2" />
              <p className="text-sm text-white">Fondo oscuro</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-lg text-center">
              <EagleLogo width={60} height={60} fill="white" className="mx-auto mb-2 drop-shadow-lg" />
              <p className="text-sm text-white">Fondo degradado</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}