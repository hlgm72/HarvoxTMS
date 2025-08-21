import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalizeWords } from '@/lib/textUtils';
import { useTranslation } from 'react-i18next';

interface EquipmentItem {
  id: string;
  equipmentNumber: string;
  make: string;
  model: string;
  status: "active" | "maintenance" | "inactive";
  mileage?: number;
  nextMaintenance?: string;
}

interface EquipmentOverviewCardProps {
  totalEquipment: number;
  activeCount: number;
  maintenanceCount: number;
  equipment: EquipmentItem[];
}

export function EquipmentOverviewCard({ 
  totalEquipment, 
  activeCount, 
  maintenanceCount, 
  equipment 
}: EquipmentOverviewCardProps) {
  const { t } = useTranslation('equipment');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">{t('status.active')}</Badge>;
      case "maintenance":
        return <Badge variant="warning" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">{t('status.maintenance')}</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="text-xs">{t('status.inactive')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{t('status.unknown')}</Badge>;
    }
  };

  return (
    <Card className="h-[450px] bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20 border-green-200/30 dark:border-green-800/30 hover:shadow-xl transition-all duration-300 group overflow-hidden">
      <CardHeader className="relative pb-4">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-green-600"></div>
        <div className="flex items-center justify-between ml-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-green-900 dark:text-green-100">
                {t('overview.title')}
              </CardTitle>
              <p className="text-sm text-green-600 dark:text-green-400">{t('overview.subtitle')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 dark:hover:bg-green-900/40">
            <ExternalLink className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 ml-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{totalEquipment}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{t('overview.total')}</div>
          </div>
          <div className="text-center p-4 bg-green-50/80 dark:bg-green-900/30 backdrop-blur-sm rounded-xl border border-green-200/30 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">{t('overview.active')}</div>
          </div>
          <div className="text-center p-4 bg-yellow-50/80 dark:bg-yellow-900/30 backdrop-blur-sm rounded-xl border border-yellow-200/30 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{maintenanceCount}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">{t('overview.maintenance')}</div>
          </div>
        </div>
        
        {/* Equipment list */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('overview.recent_equipment')}</h4>
          {equipment.slice(0, 3).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-all duration-200 group/item">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center shadow-sm">
                  <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.equipmentNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {capitalizeWords(item.make)} {capitalizeWords(item.model)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item.status)}
                {item.status === "maintenance" && (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Maintenance alerts */}
        {maintenanceCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200/40 dark:border-yellow-800/40 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{t('overview.upcoming_maintenance')}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                  {t('overview.equipment_requires_attention', { count: maintenanceCount })}
                </div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0">
                {maintenanceCount}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}