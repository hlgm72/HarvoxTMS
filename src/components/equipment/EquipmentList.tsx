import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye, Trash2, FileText, MapPin, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Equipment } from "@/hooks/useEquipment";

interface EquipmentListProps {
  equipment: Equipment[];
}

export function EquipmentList({ equipment }: EquipmentListProps) {
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
    <div className="space-y-4 p-6">
      {equipment.map((item) => {
        const statusInfo = getStatusBadge(item.status);
        const nextExpiry = getNextExpiryDate(item);
        
        return (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.equipment_number}
                    </h3>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                    <Badge variant="outline">
                      {getEquipmentTypeLabel(item.equipment_type)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p><strong>{t("equipment.make", "Marca")}:</strong> {item.make || "N/A"}</p>
                      <p><strong>{t("equipment.model", "Modelo")}:</strong> {item.model || "N/A"}</p>
                      <p><strong>{t("equipment.year", "Año")}:</strong> {item.year || "N/A"}</p>
                    </div>
                    
                    <div>
                      <p><strong>{t("equipment.licensePlate", "Placa")}:</strong> {item.license_plate || "N/A"}</p>
                      <p><strong>{t("equipment.vin", "VIN")}:</strong> {item.vin_number ? item.vin_number.substring(0, 10) + "..." : "N/A"}</p>
                      <p><strong>{t("equipment.mileage", "Kilometraje")}:</strong> {item.current_mileage ? `${item.current_mileage.toLocaleString()} km` : "N/A"}</p>
                    </div>
                    
                    <div>
                      {nextExpiry && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={nextExpiry.isExpiring ? "text-destructive font-medium" : ""}>
                            <strong>{nextExpiry.type}:</strong> {new Date(nextExpiry.date!).toLocaleDateString()}
                            {nextExpiry.isExpiring && " ⚠️"}
                          </span>
                        </div>
                      )}
                      <p className="text-xs mt-1">
                        {t("equipment.createdAt", "Creado")}: {formatDistanceToNow(new Date(item.created_at), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}