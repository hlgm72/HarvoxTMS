import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertTriangle, CheckCircle, Wrench, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Equipment } from "@/hooks/useEquipment";

interface EquipmentStatsProps {
  equipment?: Equipment[];
}

export function EquipmentStats({ equipment = [] }: EquipmentStatsProps) {
  const { t } = useTranslation();

  const stats = {
    total: equipment.length,
    active: equipment.filter(e => e.status === "active").length,
    maintenance: equipment.filter(e => e.status === "maintenance").length,
    inactive: equipment.filter(e => e.status === "inactive").length,
    expiringSoon: equipment.filter(e => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      return [
        e.license_plate_expiry_date,
        e.registration_expiry_date,
        e.insurance_expiry_date,
        e.annual_inspection_expiry_date
      ].some(date => {
        if (!date) return false;
        const expiryDate = new Date(date);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
      });
    }).length,
  };

  const statCards = [
    {
      title: t("equipment.stats.total", "Total de Equipos"),
      value: stats.total,
      icon: Truck,
      color: "blue",
    },
    {
      title: t("equipment.stats.active", "Activos"),
      value: stats.active,
      icon: CheckCircle,
      color: "green",
    },
    {
      title: t("equipment.stats.maintenance", "En Mantenimiento"),
      value: stats.maintenance,
      icon: Wrench,
      color: "yellow",
    },
    {
      title: t("equipment.stats.expiring", "Vencimientos Próximos"),
      value: stats.expiringSoon,
      icon: Calendar,
      color: stats.expiringSoon > 0 ? "red" : "gray",
    },
  ];

  return (
    <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
            {stat.color === "red" && stat.value > 0 && (
              <Badge variant="destructive" className="mt-3 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {t("equipment.stats.attention", "Requiere atención")}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}