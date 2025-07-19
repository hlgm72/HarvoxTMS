import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, DollarSign, Package, Truck, FileText } from "lucide-react";
import { LoadStopsManager } from "./LoadStopsManager";
import { useUpdateLoadStops } from "@/hooks/useUpdateLoadStops";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface EditLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  load: any; // Load data
}

export function EditLoadDialog({ isOpen, onClose, load }: EditLoadDialogProps) {
  const { t } = useTranslation();
  const [loadStops, setLoadStops] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("stops");
  const updateStopsMutation = useUpdateLoadStops();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen && load) {
      // Initialize with existing stops if any
      setLoadStops([]);
      setActiveTab("stops");
    }
  }, [isOpen, load]);

  const handleSaveStops = async () => {
    if (!load?.id || loadStops.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos una parada antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStopsMutation.mutateAsync({
        loadId: load.id,
        stops: loadStops
      });
      
      toast({
        title: "Éxito",
        description: "Las paradas de la carga han sido actualizadas correctamente.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating stops:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar las paradas.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setLoadStops([]);
    onClose();
  };

  if (!load) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Editar Carga: {load.load_number}
          </DialogTitle>
        </DialogHeader>

        {/* Load Summary */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Información de la Carga</span>
              <Badge variant="outline">
                {load.status === 'created' ? 'Creada' : 
                 load.status === 'in_transit' ? 'En Tránsito' : 
                 load.status === 'delivered' ? 'Entregada' : 
                 load.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total</p>
                  <p className="font-semibold">{formatCurrency(load.total_amount)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Commodity</p>
                  <p className="font-semibold">{load.commodity || 'No especificado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ruta</p>
                  <p className="font-semibold">{load.pickup_city} → {load.delivery_city}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stops" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Paradas y Ruta
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stops" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Gestionar Paradas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Edita las paradas de recogida y entrega para esta carga. Los cambios se reflejarán en la información de la ruta.
                </p>
              </div>
              
              <LoadStopsManager 
                onStopsChange={setLoadStops}
                showValidation={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Gestión de Documentos</h3>
              <p className="text-muted-foreground">
                La edición de documentos estará disponible próximamente.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          
          {activeTab === "stops" && (
            <Button 
              onClick={handleSaveStops}
              disabled={updateStopsMutation.isPending || loadStops.length === 0}
            >
              {updateStopsMutation.isPending ? "Guardando..." : "Guardar Paradas"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}