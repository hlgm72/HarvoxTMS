import { useState } from "react";
import { formatDateAuto } from '@/lib/dateFormatting';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Eye, Trash2, FileText, MapPin, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Equipment } from "@/hooks/useEquipment";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentLocationStatus } from "./EquipmentLocationStatus";
import { useGeotabVehicles } from "@/hooks/useGeotabVehicles";
import { formatInternationalized } from '@/lib/dateFormatting';

interface EquipmentListProps {
  equipment: Equipment[];
}

export function EquipmentList({ equipment }: EquipmentListProps) {
  const { t } = useTranslation();
  const { equipmentWithGeotab, isLoadingEquipmentWithGeotab } = useGeotabVehicles();
  const { deleteEquipment, isDeleting } = useEquipment();
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: t("equipment.status.active", "Activo"), variant: "success" as const },
      maintenance: { label: t("equipment.status.maintenance", "Mantenimiento"), variant: "warning" as const },
      inactive: { label: t("equipment.status.inactive", "Inactivo"), variant: "secondary" as const },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.inactive;
  };

  const getEquipmentTypeLabel = (type: string) => {
    const typeMap = {
      truck: t("equipment.type.truck", "Camión"),
      trailer: t("equipment.type.trailer", "Remolque"),
      van: t("equipment.type.van", "Camioneta"),
      car: t("equipment.type.car", "Automóvil"),
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
  };

  const getNextExpiryDate = (equipment: Equipment) => {
    const dates = [
      { date: equipment.license_plate_expiry_date, type: "Placa" },
      { date: equipment.registration_expiry_date, type: "Registro" },
      { date: equipment.insurance_expiry_date, type: "Seguro" },
      { date: equipment.annual_inspection_expiry_date, type: "Inspección" },
    ].filter(item => item.date);

    if (dates.length === 0) return null;

    const sortedDates = dates.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    const nextExpiry = sortedDates[0];
    
    return {
      ...nextExpiry,
      isExpiring: isExpiringSoon(nextExpiry.date),
    };
  };

  const handleDeleteClick = (equipment: Equipment) => {
    setEquipmentToDelete(equipment);
  };

  const handleDeleteConfirm = () => {
    if (equipmentToDelete) {
      deleteEquipment(equipmentToDelete.id);
      setEquipmentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setEquipmentToDelete(null);
  };

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {t("equipment.noEquipment", "No hay equipos registrados")}
        </p>
      </div>
    );
  }

  // Use equipmentWithGeotab data if available, otherwise fallback to regular equipment
  const displayEquipment = equipmentWithGeotab || equipment;

  return (
    <div className="space-y-8 py-4">
      {displayEquipment.map((item) => {
        const statusInfo = getStatusBadge(item.status);
        const nextExpiry = getNextExpiryDate(item);
        
        return (
          <Card key={item.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-xl font-semibold text-foreground">
                      {item.equipment_number}
                    </h3>
                    <Badge variant={statusInfo.variant} className="text-sm px-3 py-1">
                      {statusInfo.label}
                    </Badge>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {getEquipmentTypeLabel(item.equipment_type)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground mb-3">{t("equipment.basicInfo", "Información Básica")}</h4>
                      <div className="space-y-2 text-muted-foreground">
                        <p><span className="font-medium">{t("equipment.make", "Marca")}:</span> {item.make || "N/A"}</p>
                        <p><span className="font-medium">{t("equipment.model", "Modelo")}:</span> {item.model || "N/A"}</p>
                        <p><span className="font-medium">{t("equipment.year", "Año")}:</span> {item.year || "N/A"}</p>
                      </div>
                    </div>
                    
                    {/* Vehicle Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground mb-3">{t("equipment.vehicleDetails", "Detalles del Vehículo")}</h4>
                      <div className="space-y-2 text-muted-foreground">
                        <p><span className="font-medium">{t("equipment.licensePlate", "Placa")}:</span> {item.license_plate || "N/A"}</p>
                        <p><span className="font-medium">{t("equipment.vin", "VIN")}:</span> {item.vin_number ? item.vin_number.substring(0, 10) + "..." : "N/A"}</p>
                        <p><span className="font-medium">{t("equipment.mileage", "Kilometraje")}:</span> {item.current_mileage ? `${item.current_mileage.toLocaleString()} km` : "N/A"}</p>
                      </div>
                    </div>
                    
                    {/* Expiry Info */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground mb-3">{t("equipment.expiryInfo", "Vencimientos")}</h4>
                      <div className="space-y-2">
                        {nextExpiry && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                            <Calendar className="h-4 w-4" />
                            <div className={nextExpiry.isExpiring ? "text-destructive font-medium" : "text-muted-foreground"}>
                              <p className="text-xs font-medium">{nextExpiry.type}</p>
                              <p className="text-sm">{formatDateAuto(nextExpiry.date!)}</p>
                              {nextExpiry.isExpiring && <p className="text-xs text-destructive">⚠️ Próximo a vencer</p>}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-4">
                           {t("equipment.createdAt", "Creado")}: {formatInternationalized(new Date(item.created_at), 'PPP')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Location Status */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground mb-3">{t("equipment.location", "Ubicación")}</h4>
                      <EquipmentLocationStatus equipment={item} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 ml-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-10 w-10">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="py-2">
                        <Eye className="mr-3 h-4 w-4" />
                        {t("common.view", "Ver detalles")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="py-2">
                        <Edit className="mr-3 h-4 w-4" />
                        {t("common.edit", "Editar")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="py-2">
                        <FileText className="mr-3 h-4 w-4" />
                        {t("equipment.documents", "Documentos")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="py-2">
                        <MapPin className="mr-3 h-4 w-4" />
                        {t("equipment.location", "Ubicación")}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive py-2"
                        onClick={() => handleDeleteClick(item)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-3 h-4 w-4" />
                        {t("common.delete", "Eliminar")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!equipmentToDelete} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("equipment.delete.title", "¿Eliminar equipo?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("equipment.delete.description", 
                "Esta acción no se puede deshacer. Se eliminará permanentemente el equipo"
              )} <strong>{equipmentToDelete?.equipment_number}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              {t("common.cancel", "Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting", "Eliminando...") : t("common.delete", "Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}