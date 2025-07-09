import { Layout } from "@/components/layout/Layout";
import Dashboard from "./Dashboard";
import templatePreview from "@/assets/template-preview.jpg";

const Index = () => {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">FleetNest TMS - Template Preview</h1>
          <p className="text-muted-foreground mb-6">
            Vista previa del diseño "Command Center" con paleta Transport Orange
          </p>
          
          <div className="rounded-lg border bg-card overflow-hidden shadow-lg">
            <img 
              src={templatePreview} 
              alt="FleetNest Template Preview - Command Center Design" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Características del Template:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Layout de 3 columnas: Sidebar + Main + Info Panel</li>
              <li>• Paleta Transport Orange (#FF6B35) + Blue (#2563EB)</li>
              <li>• Header con Company/Role selectors</li>
              <li>• Sidebar dark con navegación TMS</li>
              <li>• Área principal con mapa live de flota</li>
              <li>• Panel de KPIs en tiempo real</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
