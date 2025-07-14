import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link, Unlink, MapPin, Truck } from "lucide-react";
import { useGeotabVehicles } from "@/hooks/useGeotabVehicles";
import { Equipment } from "@/hooks/useEquipment";

interface GeotabLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment;
}

export function GeotabLinkDialog({ open, onOpenChange, equipment }: GeotabLinkDialogProps) {
  const { t } = useTranslation();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(equipment.geotab_vehicle_id || "");
  
  const { 
    geotabVehicles, 
    isLoadingGeotabVehicles, 
    linkEquipment, 
    isLinking 
  } = useGeotabVehicles();

  const handleLink = () => {
    const vehicleId = selectedVehicleId === "no-link" ? null : selectedVehicleId;
    linkEquipment({ 
      equipmentId: equipment.id, 
      geotabVehicleId: vehicleId 
    });
    onOpenChange(false);
  };

  const handleUnlink = () => {
    linkEquipment({ 
      equipmentId: equipment.id, 
      geotabVehicleId: null 
    });
    onOpenChange(false);
  };

  const availableVehicles = geotabVehicles?.filter(vehicle => 
    // Vehicle is not linked to any equipment, or is linked to current equipment
    !equipment.geotab_vehicle_id || vehicle.id === equipment.geotab_vehicle_id
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("equipment.geotab.link.title", "Vincular con Geotab")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Equipment Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{equipment.equipment_number}</span>
              <Badge variant="outline">{equipment.equipment_type}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {equipment.make && equipment.model ? `${equipment.make} ${equipment.model}` : 'Sin especificar'}
              {equipment.year && ` (${equipment.year})`}
            </div>
          </div>

          {/* Current Link Status */}
          {equipment.geotab_vehicle_id && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">
                  {t("equipment.geotab.currentlyLinked", "Actualmente vinculado")}
                </span>
              </div>
              <div className="text-sm text-green-600 dark:text-green-500 mt-1">
                {geotabVehicles?.find(v => v.id === equipment.geotab_vehicle_id)?.name || 
                 t("equipment.geotab.unknownVehicle", "Vehículo desconocido")}
              </div>
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {t("equipment.geotab.selectVehicle", "Seleccionar Vehículo de Geotab")}
            </label>
            
            {isLoadingGeotabVehicles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground">
                  {t("equipment.geotab.loadingVehicles", "Cargando vehículos...")}
                </span>
              </div>
            ) : availableVehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("equipment.geotab.noVehicles", "No hay vehículos de Geotab disponibles")}</p>
              </div>
            ) : (
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("equipment.geotab.selectPlaceholder", "Selecciona un vehículo...")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-link">
                    {t("equipment.geotab.noLink", "No vincular")}
                  </SelectItem>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{vehicle.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : vehicle.geotab_id}
                          {vehicle.license_plate && ` • ${vehicle.license_plate}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {equipment.geotab_vehicle_id && (
              <Button
                variant="outline"
                onClick={handleUnlink}
                disabled={isLinking}
                className="flex-1"
              >
                {isLinking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                {t("equipment.geotab.unlink", "Desvincular")}
              </Button>
            )}
            
            <Button
              onClick={handleLink}
              disabled={isLinking || (selectedVehicleId === equipment.geotab_vehicle_id)}
              className="flex-1"
            >
              {isLinking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              {selectedVehicleId 
                ? t("equipment.geotab.link", "Vincular")
                : t("equipment.geotab.unlink", "Desvincular")
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}