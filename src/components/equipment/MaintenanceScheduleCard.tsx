import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Wrench, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface MaintenanceItem {
  id: string;
  equipmentNumber: string;
  maintenanceType: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  mileage?: number;
  overdue?: boolean;
}

interface MaintenanceScheduleCardProps {
  upcomingMaintenance: MaintenanceItem[];
  overdueCount: number;
  thisWeekCount: number;
}

export function MaintenanceScheduleCard({ 
  upcomingMaintenance, 
  overdueCount, 
  thisWeekCount 
}: MaintenanceScheduleCardProps) {
  const { t, ready } = useTranslation(['common', 'equipment']);
  
  // Debug logging
  console.log('MaintenanceScheduleCard - i18n ready:', ready);
  console.log('MaintenanceScheduleCard - Translation keys:');
  console.log('equipment.maintenance.title:', t('equipment.maintenance.title'));
  console.log('equipment.maintenance.subtitle:', t('equipment.maintenance.subtitle'));
  console.log('equipment.maintenance.overdue:', t('equipment.maintenance.overdue'));
  console.log('equipment.maintenance.this_week:', t('equipment.maintenance.this_week'));

  if (!ready) {
    return <div>Loading translations...</div>;
  }
  
  const getPriorityBadge = (priority: string, overdue: boolean = false) => {
    if (overdue) {
      return <Badge variant="destructive" className="text-xs">{t('equipment.maintenance.priority.overdue')}</Badge>;
    }
    
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">{t('equipment.maintenance.priority.high')}</Badge>;
      case "medium":
        return <Badge variant="warning" className="text-xs">{t('equipment.maintenance.priority.medium')}</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-xs">{t('equipment.maintenance.priority.low')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{t('equipment.maintenance.priority.normal')}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string, overdue: boolean = false) => {
    if (overdue) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    
    switch (priority) {
      case "high":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      case "medium":
        return <Calendar className="h-3 w-3 text-warning" />;
      case "low":
        return <Calendar className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Calendar className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <Card className="h-[450px] bg-gradient-to-br from-orange-50/50 to-red-50/30 dark:from-orange-950/30 dark:to-red-900/20 border-orange-200/30 dark:border-orange-800/30 hover:shadow-xl transition-all duration-300 group overflow-hidden">
      <CardHeader className="relative pb-4">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-500"></div>
        <div className="flex items-center justify-between ml-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
              <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                {t('equipment.maintenance.title')}
              </CardTitle>
              <p className="text-sm text-orange-600 dark:text-orange-400">{t('equipment.maintenance.subtitle')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 dark:hover:bg-orange-900/40">
            <ExternalLink className="h-4 w-4 text-orange-600" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 ml-4">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm rounded-xl border border-red-200/30 shadow-sm">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</div>
            <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{t('equipment.maintenance.overdue')}</div>
          </div>
          <div className="text-center p-4 bg-yellow-50/80 dark:bg-yellow-900/30 backdrop-blur-sm rounded-xl border border-yellow-200/30 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{thisWeekCount}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">{t('equipment.maintenance.this_week')}</div>
          </div>
        </div>
        
        {/* Alert summary */}
        {overdueCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200/40 dark:border-red-800/40 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {t('equipment.maintenance.overdue_maintenance')}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  {t('equipment.maintenance.equipment_requires_immediate_attention', { count: overdueCount })}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Maintenance list */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('equipment.maintenance.upcoming_maintenance')}</h4>
          <div className="space-y-3 max-h-32 overflow-y-auto custom-scrollbar">
            {upcomingMaintenance.slice(0, 2).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                    {getPriorityIcon(item.priority, item.overdue)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.equipmentNumber}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.maintenanceType}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getPriorityBadge(item.priority, item.overdue)}
                  <div className="text-xs text-gray-400">
                    {item.dueDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick action */}
        <div className="pt-2 mt-auto">
          <Button variant="outline" size="sm" className="w-full text-sm h-10 font-medium bg-white/50 backdrop-blur-sm hover:bg-white/70 border-orange-200/40 text-orange-700 hover:text-orange-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/50 dark:text-orange-300 dark:hover:text-orange-200">
            <Calendar className="h-4 w-4 mr-2" />
            {t('equipment.maintenance.view_full_calendar')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}