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
  name?: string;
  address?: string;
  dotNumber?: string;
  mcNumber?: string;
  phone?: string;
  safetyRating?: string;
  totalDrivers?: string;
  totalVehicles?: string;
  operationClassification?: string[];
  cargoCarried?: string[];
}

interface FMCSALookupProps {
  onDataFound: (data: Partial<{
    name: string;
    address: string;
    phone: string;
    dot_number: string;
    mc_number: string;
  }>) => void;
}

export function FMCSALookup({ onDataFound }: FMCSALookupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"DOT" | "MC" | "NAME">("DOT");
  const [loading, setLoading] = useState(false);
  const [lastSearchData, setLastSearchData] = useState<FMCSAData | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Por favor ingresa un término de búsqueda");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fmcsa-lookup', {
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

      if (!data || !data.success) {
        const errorMessage = data?.error || "No se encontró información en FMCSA";
        toast.error(errorMessage);
        console.log('FMCSA search failed:', errorMessage);
        setLoading(false);
        return;
      }

      const fmcsaData = data.data as FMCSAData;
      setLastSearchData(fmcsaData);
      toast.success("Información encontrada en FMCSA");
      setLoading(false);

    } catch (error) {
      console.error('Error calling FMCSA function:', error);
      toast.error("Error al buscar en FMCSA");
      setLoading(false);
    }
  };

  const handleApplyData = () => {
    if (!lastSearchData) return;

    const formData: Partial<{
      name: string;
      address: string;
      phone: string;
      dot_number: string;
      mc_number: string;
    }> = {};

    if (lastSearchData.name) formData.name = lastSearchData.name;
    if (lastSearchData.address) formData.address = lastSearchData.address;
    if (lastSearchData.phone) formData.phone = lastSearchData.phone;
    if (lastSearchData.dotNumber) formData.dot_number = lastSearchData.dotNumber;
    if (lastSearchData.mcNumber) formData.mc_number = lastSearchData.mcNumber;

    onDataFound(formData);
    toast.success("Información aplicada al formulario");
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
        {lastSearchData && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Información Encontrada
              </h4>
              <Button
                type="button"
                onClick={handleApplyData}
                size="sm"
              >
                Aplicar al Formulario
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {lastSearchData.name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{lastSearchData.name}</p>
                </div>
              )}

              {lastSearchData.dotNumber && (
                <div>
                  <Label className="text-xs text-muted-foreground">DOT #</Label>
                  <p className="font-medium">{lastSearchData.dotNumber}</p>
                </div>
              )}

              {lastSearchData.mcNumber && (
                <div>
                  <Label className="text-xs text-muted-foreground">MC #</Label>
                  <p className="font-medium">{lastSearchData.mcNumber}</p>
                </div>
              )}

              {lastSearchData.phone && (
                <div>
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{lastSearchData.phone}</p>
                </div>
              )}

              {lastSearchData.address && (
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Dirección</Label>
                  <p className="font-medium">{lastSearchData.address}</p>
                </div>
              )}

              {lastSearchData.safetyRating && (
                <div>
                  <Label className="text-xs text-muted-foreground">Calificación de Seguridad</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      lastSearchData.safetyRating.toLowerCase().includes('satisfactory') ? 'default' :
                      lastSearchData.safetyRating.toLowerCase().includes('conditional') ? 'secondary' :
                      lastSearchData.safetyRating.toLowerCase().includes('unsatisfactory') ? 'destructive' :
                      'outline'
                    }>
                      {lastSearchData.safetyRating}
                    </Badge>
                  </div>
                </div>
              )}

              {(lastSearchData.totalDrivers || lastSearchData.totalVehicles) && (
                <div>
                  <Label className="text-xs text-muted-foreground">Flota</Label>
                  <p className="font-medium">
                    {lastSearchData.totalDrivers && `${lastSearchData.totalDrivers} conductores`}
                    {lastSearchData.totalDrivers && lastSearchData.totalVehicles && ', '}
                    {lastSearchData.totalVehicles && `${lastSearchData.totalVehicles} vehículos`}
                  </p>
                </div>
              )}

              {lastSearchData.operationClassification && lastSearchData.operationClassification.length > 0 && (
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Clasificación de Operación</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lastSearchData.operationClassification.map((classification, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {classification}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {lastSearchData.cargoCarried && lastSearchData.cargoCarried.length > 0 && (
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Carga Transportada</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lastSearchData.cargoCarried.map((cargo, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cargo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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