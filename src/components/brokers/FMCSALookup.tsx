import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FMCSAData {
  legalName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  physicalAddress: string | null;
  mailingAddress: string | null;
  phone: string | null;
  email: string | null;
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

interface FMCSALookupProps {
  onDataFound: (data: Partial<{
    name: string;
    address: string;
    phone: string;
    dot_number: string;
    mc_number: string;
    email: string;
  }>) => void;
}

export function FMCSALookup({ onDataFound }: FMCSALookupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"DOT" | "MC" | "NAME">("DOT");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FMCSAData | null>(null);
  const [debugData, setDebugData] = useState<any>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Por favor ingresa un término de búsqueda");
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
        toast.error("Error al buscar en FMCSA");
        setLoading(false);
        return;
      }

      if (!responseData || !responseData.success) {
        const errorMessage = responseData?.error || "No se encontró información en FMCSA";
        toast.error(errorMessage);
        console.log('FMCSA search failed:', errorMessage);
        setData(null);
        setDebugData(responseData?.debug || null);
        setLoading(false);
        return;
      }

      const fmcsaData = responseData.data as FMCSAData;
      setData(fmcsaData);
      setDebugData(responseData.debug);
      toast.success("Información encontrada en FMCSA");
      setLoading(false);

    } catch (error) {
      console.error('Error calling FMCSA function:', error);
      toast.error("Error al buscar en FMCSA");
      setLoading(false);
    }
  };

  const handleApplyData = () => {
    if (data && onDataFound) {
      onDataFound({
        name: data.legalName || "",
        address: data.physicalAddress || data.mailingAddress || "",
        phone: data.phone || "",
        dot_number: data.dotNumber || "",
        mc_number: data.mcNumber || "",
        email: data.email || "",
      });
      toast.success("Información aplicada al formulario");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Búsqueda FMCSA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={searchType === "DOT" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("DOT")}
            >
              DOT
            </Button>
            <Button
              type="button"
              variant={searchType === "MC" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("MC")}
            >
              MC
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
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3">Información encontrada:</h3>
            
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <strong>Nombre Legal:</strong> {data.legalName || 'No disponible'}
              </div>
              <div>
                <strong>Teléfono:</strong> {data.phone || 'No disponible'}
              </div>
              <div>
                <strong>DOT:</strong> {data.dotNumber || 'No disponible'}
              </div>
              <div>
                <strong>MC:</strong> {data.mcNumber || 'No disponible'}
              </div>
              <div className="col-span-2">
                <strong>Dirección Física:</strong> {data.physicalAddress || 'No disponible'}
              </div>
              {data.mailingAddress && data.mailingAddress !== data.physicalAddress && (
                <div className="col-span-2">
                  <strong>Dirección Postal:</strong> {data.mailingAddress}
                </div>
              )}
              {data.email && (
                <div className="col-span-2">
                  <strong>Email:</strong> {data.email}
                </div>
              )}
              {data.carrierOperation && (
                <div>
                  <strong>Operación:</strong> {data.carrierOperation}
                </div>
              )}
              {data.stateOfOperation && (
                <div>
                  <strong>Estados:</strong> {data.stateOfOperation}
                </div>
              )}
            </div>

            {/* Cargo Carried */}
            {data.cargoCarried && data.cargoCarried.length > 0 && (
              <div className="mb-4">
                <strong>Carga Transportada:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.cargoCarried.map((cargo, index) => (
                    <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {cargo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Rating */}
            {data.safetyRating && (
              <div className="mb-4 p-3 bg-background rounded border">
                <strong>Safety Rating:</strong>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>Rating: {data.safetyRating.rating || 'N/A'}</div>
                  <div>Tipo: {data.safetyRating.type || 'N/A'}</div>
                  <div>Fecha Rating: {data.safetyRating.ratingDate || 'N/A'}</div>
                  <div>Fecha Review: {data.safetyRating.reviewDate || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Inspections */}
            {data.inspections && (
              <div className="mb-4 p-3 bg-background rounded border">
                <strong>Inspecciones (últimos 24 meses):</strong>
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                  <div className="font-medium">Tipo</div>
                  <div className="font-medium">Vehículo</div>
                  <div className="font-medium">Conductor</div>
                  <div className="font-medium">Hazmat</div>
                  
                  <div>Total:</div>
                  <div>{data.inspections.inspections.vehicle}</div>
                  <div>{data.inspections.inspections.driver}</div>
                  <div>{data.inspections.inspections.hazmat}</div>
                  
                  <div>OOS:</div>
                  <div>{data.inspections.outOfService.vehicle}</div>
                  <div>{data.inspections.outOfService.driver}</div>
                  <div>{data.inspections.outOfService.hazmat}</div>
                  
                  <div>OOS%:</div>
                  <div>{data.inspections.outOfServiceRate.vehicle}</div>
                  <div>{data.inspections.outOfServiceRate.driver}</div>
                  <div>{data.inspections.outOfServiceRate.hazmat}</div>
                </div>
              </div>
            )}

            {/* Crashes */}
            {data.crashes && (
              <div className="mb-4 p-3 bg-background rounded border">
                <strong>Accidentes (últimos 24 meses):</strong>
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                  <div>Fatal: {data.crashes.fatal}</div>
                  <div>Lesión: {data.crashes.injury}</div>
                  <div>Remolque: {data.crashes.tow}</div>
                  <div>Total: {data.crashes.total}</div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleApplyData} 
              className="mt-4 w-full"
              size="sm"
            >
              Aplicar datos al formulario
            </Button>
          </div>
        )}

        {/* Debug HTML Section */}
        {debugData && debugData.rawHtml && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">HTML Completo de FMCSA (Debug)</h4>
            <div className="text-xs bg-muted p-4 rounded border max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words font-mono">
                {debugData.rawHtml}
              </pre>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Tamaño total: {debugData.htmlLength} caracteres (HTML completo)
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
      </CardContent>
    </Card>
  );
}