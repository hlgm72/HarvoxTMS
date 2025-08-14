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
  const { t } = useTranslation('fleet');
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
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">{t('tracking.status.moving')}</Badge>;
      case "parked":
        return <Badge variant="default" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{t('tracking.status.parked')}</Badge>;
      case "offline":
        return <Badge variant="secondary" className="text-xs">{t('tracking.status.offline')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{t('tracking.status.unknown')}</Badge>;
    }
  };

  return (
    <Card className="h-[400px] bg-gradient-to-br from-background to-blue-50/30 dark:to-blue-950/20 border-blue-200/50 dark:border-blue-800/50 hover:shadow-elegant transition-all duration-300">
      <CardHeader className="pb-3 border-l-4 border-l-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base font-medium text-foreground">
              {t('tracking.title')}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">{t('tracking.subtitle')}</div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-lg font-bold text-green-600">{onlineCount}</div>
            <div className="text-xs text-muted-foreground">{t('tracking.stats.online')}</div>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{movingCount}</div>
            <div className="text-xs text-muted-foreground">{t('tracking.stats.moving')}</div>
          </div>
        </div>
        
        {/* Mini map placeholder */}
        <div className="h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-500 to-blue-600"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <MapPin className="h-6 w-6 text-blue-600 animate-pulse" />
            <span className="ml-2 text-sm font-medium text-blue-800 dark:text-blue-300">
              {t('tracking.active_locations', { count: locations.length })}
            </span>
          </div>
        </div>
        
        {/* Recent locations */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground mb-2">{t('tracking.recent_locations')}</div>
          {locations.slice(0, 3).map((location, index) => (
            <div key={location.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="flex items-center gap-2">
                {getStatusIcon(location.status)}
                <div>
                  <div className="text-xs font-medium">{location.equipmentNumber}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {location.location}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusBadge(location.status)}
                <div className="text-xs text-muted-foreground">
                  {location.lastUpdate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}