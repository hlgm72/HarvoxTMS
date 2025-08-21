import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Navigation, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface LocationData {
  id: string;
  equipmentNumber: string;
  location: string;
  lastUpdate: string;
  status: "moving" | "parked" | "offline";
  coordinates?: { lat: number; lng: number };
}

interface EquipmentLocationCardProps {
  locations: LocationData[];
  onlineCount: number;
  movingCount: number;
}

export function EquipmentLocationCard({ 
  locations, 
  onlineCount, 
  movingCount 
}: EquipmentLocationCardProps) {
  const { t } = useTranslation(['common', 'equipment']);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "moving":
        return <Navigation className="h-3 w-3 text-green-600" />;
      case "parked":
        return <MapPin className="h-3 w-3 text-blue-600" />;
      case "offline":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      default:
        return <MapPin className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "moving":
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('equipment.tracking.moving')}</Badge>;
      case "parked":
        return <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('common.parked')}</Badge>;
      case "offline":
        return <Badge variant="secondary" className="text-xs">{t('common.offline')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{t('common.unknown')}</Badge>;
    }
  };

  return (
    <Card className="h-[450px] bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/30 dark:border-blue-800/30 hover:shadow-xl transition-all duration-300 group overflow-hidden">
      <CardHeader className="relative pb-4">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600"></div>
        <div className="flex items-center justify-between ml-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {t('equipment.tracking.fleet_tracking')}
              </CardTitle>
              <p className="text-sm text-blue-600 dark:text-blue-400">{t('equipment.tracking.real_time_locations')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/40">
            <ExternalLink className="h-4 w-4 text-blue-600" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 ml-4">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50/80 dark:bg-green-900/30 backdrop-blur-sm rounded-xl border border-green-200/30 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineCount}</div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">{t('equipment.tracking.online')}</div>
          </div>
          <div className="text-center p-4 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-200/30 shadow-sm">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{movingCount}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">{t('equipment.tracking.moving')}</div>
          </div>
        </div>
        
        {/* Interactive map placeholder */}
        <div className="h-32 bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 dark:from-blue-900/40 dark:via-blue-800/30 dark:to-indigo-900/40 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner border border-blue-200/30">
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-300 to-transparent"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative">
              <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="ml-3 text-center">
              <span className="block text-lg font-semibold text-blue-800 dark:text-blue-200">
                {locations.length}
              </span>
              <span className="block text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t('equipment.locations.active_locations')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Recent locations */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('equipment.tracking.recent_locations')}</h4>
          <div className="space-y-3 max-h-32 overflow-y-auto custom-scrollbar">
            {locations.slice(0, 2).map((location, index) => (
              <div key={location.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 hover:bg-white/70 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    {getStatusIcon(location.status)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{location.equipmentNumber}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                      {location.location}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(location.status)}
                  <div className="text-xs text-gray-400">
                    {location.lastUpdate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}