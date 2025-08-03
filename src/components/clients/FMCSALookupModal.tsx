import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FMCSAData {
  legalName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  physicalAddress: string | null;
  mailingAddress: string | null;
  phone: string | null;
  email: string | null;
  dba: string | null;  // Doing Business As
  entityType: string | null;  // CARRIER, etc.
  usdotStatus: string | null;  // ACTIVE, INACTIVE, etc.
  carrierOperation: string | null;
  stateOfOperation: string | null;
  cargoCarried: string[];
  inspections: {
    inspections: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfService: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfServiceRate: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
  } | null;
  crashes: {
    fatal: string;
    injury: string;
    tow: string;
    total: string;
  } | null;
  safetyRating: {
    ratingDate: string | null;
    reviewDate: string | null;
    rating: string | null;
    type: string | null;
  } | null;
}

interface FMCSALookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataFound: (data: Partial<{
    name: string;
    address: string;
    phone: string;
    dot_number: string;
    mc_number: string;
    email: string;
    alias: string;
  }>) => void;
}

export function FMCSALookupModal({ isOpen, onClose, onDataFound }: FMCSALookupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"DOT" | "MC" | "NAME">("MC");
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const [data, setData] = useState<FMCSAData | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showError("Por favor ingresa un término de búsqueda");
      return;
    }

    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('fmcsa-lookup', {
        body: {
          searchQuery: searchQuery.trim(),
          searchType
        }
      });

      if (error) {
        console.error('FMCSA lookup error:', error);
        showError("Error al buscar en FMCSA");
        setLoading(false);
        return;
      }

      if (!responseData || !responseData.success) {
        const errorMessage = responseData?.error || "No se encontró información en FMCSA";
        showError(errorMessage);
        console.log('FMCSA search failed:', errorMessage);
        setData(null);
        setLoading(false);
        return;
      }

      const fmcsaData = responseData.data as FMCSAData;
      setData(fmcsaData);
      showSuccess("Información encontrada en FMCSA");
      setLoading(false);

    } catch (error) {
      console.error('Error calling FMCSA function:', error);
      showError("Error al buscar en FMCSA");
      setLoading(false);
    }
  };

  const handleApplyData = () => {
    if (data && onDataFound) {
      const mappedData: any = {
        name: data.legalName || "",
        address: data.physicalAddress || data.mailingAddress || "",
        phone: data.phone || "",
        dot_number: data.dotNumber || "",
        mc_number: data.mcNumber || "",
        email: data.email || "",
      };
      
      // Solo agregar alias si DBA tiene información válida
      if (data.dba && data.dba.trim() && !data.dba.toLowerCase().includes('no aplica') && !data.dba.toLowerCase().includes('vacío')) {
        mappedData.alias = data.dba;
      }
      
      onDataFound(mappedData);
      showSuccess("Información aplicada al formulario");
      
      // Limpiar datos y cerrar modal
      setData(null);
      setSearchQuery("");
      onClose();
    }
  };

  const handleClose = () => {
    setData(null);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda FMCSA
          </DialogTitle>
          <DialogDescription>
            Busca información de empresas en la base de datos del FMCSA para completar automáticamente los datos del broker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={searchType === "MC" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("MC")}
              >
                MC #
              </Button>
              <Button
                type="button"
                variant={searchType === "DOT" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("DOT")}
              >
                DOT #
              </Button>
              <Button
                type="button"
                variant={searchType === "NAME" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("NAME")}
              >
                Nombre
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="fmcsa-search">
                  {searchType === "DOT" ? "Número DOT" : 
                   searchType === "MC" ? "Número MC" : "Nombre de la empresa"}
                </Label>
                <Input
                  id="fmcsa-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchType === "DOT" ? "Ej: 1234567" :
                    searchType === "MC" ? "Ej: 123456" :
                    "Ej: ABC Logistics"
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="mt-6"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {data && (
            <div className="p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-4 text-lg">🧾 Información general extraída</h3>
              
              {/* Información Básica */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">🏢 Empresa</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">Nombre legal:</span> {data.legalName || 'No disponible'}
                  </div>
                  <div>
                    <span className="font-medium">MC Number:</span> {data.mcNumber || 'No disponible'}
                  </div>
                  <div>
                    <span className="font-medium">USDOT Number:</span> {data.dotNumber || 'No disponible'}
                  </div>
                  <div>
                    <span className="font-medium">Entidad:</span> {data.entityType || 'No disponible'}
                  </div>
                  <div>
                    <span className="font-medium">DBA (Doing Business As):</span> {data.dba || 'No aplica / vacío'}
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">📍 Dirección</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">Dirección física:</span>
                    <br />
                    {data.physicalAddress || 'No disponible'}
                  </div>
                  <div>
                    <span className="font-medium">Teléfono:</span> {data.phone || 'No disponible'}
                  </div>
                </div>
              </div>

              {/* Estado de Operación */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">🚛 Estado de operación</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">USDOT Status:</span> {data.usdotStatus || 'No disponible'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleApplyData} 
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aplicar datos al formulario
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Los datos se obtienen de la base de datos pública del FMCSA. 
              Verifica siempre la exactitud de la información antes de guardar.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}