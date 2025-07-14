import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye, Trash2, FileText, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Equipment } from "@/hooks/useEquipment";

interface EquipmentGridProps {
  equipment: Equipment[];
}

export function EquipmentGrid({ equipment }: EquipmentGridProps) {
  const { t } = useTranslation();

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

  const hasExpiringDocuments = (equipment: Equipment) => {
    return [
      equipment.license_plate_expiry_date,
      equipment.registration_expiry_date,
      equipment.insurance_expiry_date,
      equipment.annual_inspection_expiry_date,
    ].some(date => isExpiringSoon(date));
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {equipment.map((item) => {
        const statusInfo = getStatusBadge(item.status);
        const hasExpiring = hasExpiringDocuments(item);
        
        return (
          <Card key={item.id} className="hover:shadow-lg transition-all duration-200 relative group">
            {hasExpiring && (
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="destructive" className="h-6 w-6 p-0 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              </div>
            )}
            
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate" title={item.equipment_number}>
                    {item.equipment_number}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.make} {item.model} {item.year}
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      {t("common.view", "Ver detalles")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      {t("common.edit", "Editar")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      {t("equipment.documents", "Documentos")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MapPin className="mr-2 h-4 w-4" />
                      {t("equipment.location", "Ubicación")}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common.delete", "Eliminar")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getEquipmentTypeLabel(item.equipment_type)}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("equipment.licensePlate", "Placa")}:</span>
                  <span className="font-medium">{item.license_plate || "N/A"}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("equipment.vin", "VIN")}:</span>
                  <span className="font-medium truncate ml-2" title={item.vin_number}>
                    {item.vin_number ? `***${item.vin_number.slice(-4)}` : "N/A"}
                  </span>
                </div>
                
                {item.current_mileage && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("equipment.mileage", "Kilometraje")}:</span>
                    <span className="font-medium">{item.current_mileage.toLocaleString()} km</span>
                  </div>
                )}
              </div>
              
              {hasExpiring && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                  <div className="flex items-center gap-1 text-destructive text-xs">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">
                      {t("equipment.expiringDocuments", "Documentos por vencer")}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {t("equipment.createdAt", "Creado")}: {formatDistanceToNow(new Date(item.created_at), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}