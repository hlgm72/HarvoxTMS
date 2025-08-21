import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, AlertTriangle, CheckCircle, Wrench, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Equipment } from "@/hooks/useEquipment";

interface EquipmentStatsProps {
  equipment?: Equipment[];
}

export function EquipmentStats({ equipment = [] }: EquipmentStatsProps) {
  const { t } = useTranslation('equipment');

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
      title: t('stats.total'),
      value: stats.total,
      icon: Truck,
      color: "blue",
    },
    {
      title: t('stats.active'),
      value: stats.active,
      icon: CheckCircle,
      color: "green",
    },
    {
      title: t('stats.maintenance'),
      value: stats.maintenance,
      icon: Wrench,
      color: "yellow",
    },
    {
      title: t('stats.expiring'),
      value: stats.expiringSoon,
      icon: Calendar,
      color: stats.expiringSoon > 0 ? "red" : "gray",
    },
  ];

  return (
    <div className="grid gap-6 md:gap-8 grid-cols-2 lg:grid-cols-4">
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
                {t('stats.attention')}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}