import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

export default function ImagePreview() {
  const navigate = useNavigate();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/diosvani-payment-report-august-2025.png';
    link.download = 'diosvani-payment-report-august-2025.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Reporte de Pago - Diosvani González</h1>
          <Button 
            onClick={handleDownload}
            className="flex items-center gap-2 ml-auto"
          >
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-4">
          <img 
            src="/diosvani-payment-report-august-2025.png" 
            alt="Reporte de Pago Diosvani González - Agosto 2025"
            className="w-full h-auto rounded-lg border"
            style={{ maxHeight: '80vh', objectFit: 'contain' }}
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-muted-foreground">
            Haz clic derecho en la imagen y selecciona "Guardar imagen como" para descargarla
          </p>
        </div>
      </div>
    </div>
  );
}