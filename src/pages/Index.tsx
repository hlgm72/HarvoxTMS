import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "./Dashboard";
import templatePreview from "@/assets/template-preview.jpg";
import templateMinimal from "@/assets/template-minimal.jpg";
import templateDark from "@/assets/template-dark.jpg";
import templateEnterprise from "@/assets/template-enterprise.jpg";
import templateMobile from "@/assets/template-mobile.jpg";
import templateCommandDark from "@/assets/template-command-dark.jpg";
import mobileDriverApp from "@/assets/mobile-driver-app.jpg";
import mobileDriverDark from "@/assets/mobile-driver-dark.jpg";

const Index = () => {
  const [showDarkPreview, setShowDarkPreview] = useState(false);
  const templates = [
    {
      id: "command-center",
      name: "Command Center",
      image: templatePreview,
      darkImage: templateCommandDark,
      colors: "Transport Orange + Blue",
      description: "Layout de 3 columnas con panel live de KPIs",
      features: [
        "✅ Modo claro/oscuro desde el inicio",
        "Layout de 3 columnas: Sidebar + Main + Info Panel",
        "Paleta Transport Orange (#FF6B35) + Blue (#2563EB)", 
        "Mapa central con tracking en tiempo real",
        "Panel derecho con métricas live",
        "Theme toggle automático con persistencia"
      ]
    },
    {
      id: "minimal-clean",
      name: "Minimal Clean",
      image: templateMinimal,
      colors: "Soft Blue",
      description: "Diseño limpio estilo Apple con cards grandes",
      features: [
        "Layout minimalista con mucho espacio blanco",
        "Cards grandes en grid 2x2",
        "Paleta azul suave (#3B82F6)",
        "Navegación simple y clean",
        "Perfecto para usuarios que prefieren simplicidad"
      ]
    },
    {
      id: "dark-premium",
      name: "Dark Premium",
      image: templateDark,
      colors: "Electric Blue + Purple",
      description: "Tema oscuro premium con efectos neon",
      features: [
        "Tema oscuro con acentos neon",
        "Efectos de glow y transparencias",
        "Paleta Electric Blue (#00D4FF) + Purple (#8B5CF6)",
        "Estética futurista pero profesional",
        "Ideal para uso nocturno y operaciones 24/7"
      ]
    },
    {
      id: "enterprise-classic",
      name: "Enterprise Classic",
      image: templateEnterprise,
      colors: "Forest Green",
      description: "Diseño corporativo tradicional y confiable",
      features: [
        "Layout empresarial clásico",
        "Sidebar expandido con navegación detallada",
        "Paleta verde corporativo (#059669)",
        "Tablas y vistas tradicionales",
        "Familiar para usuarios de software empresarial"
      ]
    },
    {
      id: "mobile-first",
      name: "Mobile First",
      image: templateMobile,
      colors: "Teal + Coral",
      description: "Optimizado para tablets y móviles",
      features: [
        "Cards grandes touch-friendly",
        "Top navigation bar",
        "Paleta Teal (#14B8A6) + Coral (#FF6B6B)",
        "Material Design 3 inspirado",
        "Perfecto para dispatchers en movimiento"
      ]
    }
  ];

  return (
    <Layout>
      <div className="p-6 space-y-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">FleetNest TMS - Template Gallery</h1>
            <p className="text-muted-foreground text-lg">
              Elige el diseño que mejor represente tu visión para FleetNest
            </p>
          </div>
          
          <div className="grid gap-8">
            {templates.map((template, index) => (
              <div key={template.id} className="rounded-xl border bg-card overflow-hidden shadow-lg">
                <div className="flex flex-col lg:flex-row">
                  <div className="lg:w-2/3 relative">
                    <img 
                      src={template.id === 'command-center' && showDarkPreview ? template.darkImage : template.image} 
                      alt={`${template.name} Template Preview`}
                      className="w-full h-full object-cover"
                    />
                    {template.id === 'command-center' && template.darkImage && (
                      <button
                        onClick={() => setShowDarkPreview(!showDarkPreview)}
                        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        {showDarkPreview ? '☀️ Claro' : '🌙 Oscuro'}
                      </button>
                    )}
                  </div>
                  <div className="lg:w-1/3 p-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium">{template.colors}</p>
                      <p className="text-muted-foreground mt-2">{template.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Características:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {template.features.map((feature, i) => (
                          <li key={i}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        index === 0 ? 'bg-orange-100 text-orange-800' :
                        index === 1 ? 'bg-blue-100 text-blue-800' :
                        index === 2 ? 'bg-purple-100 text-purple-800' :
                        index === 3 ? 'bg-green-100 text-green-800' :
                        'bg-teal-100 text-teal-800'
                      }`}>
                        {template.id === 'command-center' ? 'Recomendado' :
                         template.id === 'minimal-clean' ? 'Simple' :
                         template.id === 'dark-premium' ? 'Premium' :
                         template.id === 'enterprise-classic' ? 'Tradicional' :
                         'Mobile-Friendly'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Mobile Driver Experience Section */}
          <div className="mt-12 p-8 bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl border">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">📱 Experiencia Móvil para Drivers</h2>
              <p className="text-muted-foreground text-lg">
                Aplicación específica para conductores con tema Command Center
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">🚛 Diseñada para Conductores</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• <strong>Botones grandes</strong> - Touch-friendly para uso en cabina</li>
                    <li>• <strong>Información esencial</strong> - Solo lo que necesita el driver</li>
                    <li>• <strong>Modo nocturno</strong> - Optimizado para manejo nocturno</li>
                    <li>• <strong>Offline-ready</strong> - Funciona sin conexión</li>
                    <li>• <strong>Cámara integrada</strong> - BOLs y documentos al instante</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">📋 Funcionalidades Driver:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">Cargas Asignadas</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Subir BOLs</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Ver Pagos</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Status Updates</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Modo Claro</h4>
                    <img 
                      src={mobileDriverApp} 
                      alt="FleetNest Driver App - Light Mode"
                      className="w-48 rounded-2xl shadow-xl border"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Modo Oscuro</h4>
                    <img 
                      src={mobileDriverDark} 
                      alt="FleetNest Driver App - Dark Mode"
                      className="w-48 rounded-2xl shadow-xl border"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-muted rounded-xl text-center">
            <h3 className="text-xl font-semibold mb-2">¿Ya tienes tu favorito?</h3>
            <p className="text-muted-foreground">
              Dime cuál template prefieres y lo implementaré en tu aplicación FleetNest
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
