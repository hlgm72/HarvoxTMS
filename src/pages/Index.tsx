import { Layout } from "@/components/layout/Layout";
import Dashboard from "./Dashboard";
import templatePreview from "@/assets/template-preview.jpg";
import templateMinimal from "@/assets/template-minimal.jpg";
import templateDark from "@/assets/template-dark.jpg";
import templateEnterprise from "@/assets/template-enterprise.jpg";
import templateMobile from "@/assets/template-mobile.jpg";

const Index = () => {
  const templates = [
    {
      id: "command-center",
      name: "Command Center",
      image: templatePreview,
      colors: "Transport Orange + Blue",
      description: "Layout de 3 columnas con panel live de KPIs",
      features: [
        "Layout de 3 columnas: Sidebar + Main + Info Panel",
        "Paleta Transport Orange (#FF6B35) + Blue (#2563EB)", 
        "Mapa central con tracking en tiempo real",
        "Panel derecho con métricas live",
        "Estilo command center profesional"
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
                  <div className="lg:w-2/3">
                    <img 
                      src={template.image} 
                      alt={`${template.name} Template Preview`}
                      className="w-full h-full object-cover"
                    />
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
