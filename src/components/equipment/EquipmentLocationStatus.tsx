import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Clock, 
  Link, 
  AlertTriangle, 
  Navigation,
  Activity
} from "lucide-react";
import { GeotabLinkDialog } from "./GeotabLinkDialog";
import { useState } from "react";
import { Equipment } from "@/hooks/useEquipment";

interface EquipmentLocationStatusProps {
  equipment: Equipment & {
    geotab_vehicle?: {
      id: string;
      name: string;
      latest_position?: {
        latitude: number;
        longitude: number;
        speed?: number;
        date_time: string;
        odometer?: number;
      } | null;
    } | null;
  };
}

export function EquipmentLocationStatus({ equipment }: EquipmentLocationStatusProps) {
  const { t } = useTranslation('equipment');
  const { t: tCommon } = useTranslation('common');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const geotabVehicle = equipment.geotab_vehicle;
  const latestPosition = geotabVehicle?.latest_position;

  const getLocationStatus = () => {
    if (!geotabVehicle) {
      return {
        status: "not-linked",
        label: tCommon("not_linked"),
        color: "secondary" as const,
        icon: Link
      };
    }

    if (!latestPosition) {
      return {
        status: "no-data",
        label: t("tracking.no_location_data"),
        color: "outline" as const,
        icon: AlertTriangle
      };
    }

    const lastUpdate = new Date(latestPosition.date_time);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate < 1) {
      return {
        status: "recent",
        label: tCommon("recent_location"),
        color: "default" as const,
        icon: MapPin
      };
    } else if (hoursSinceUpdate < 24) {
      return {
        status: "stale",
        label: tCommon("old_data"),
        color: "secondary" as const,
        icon: Clock
      };
    } else {
      return {
        status: "old",
        label: t("tracking.very_old_data"),
        color: "outline" as const,
        icon: AlertTriangle
      };
    }
  };

  const locationStatus = getLocationStatus();
  const StatusIcon = locationStatus.icon;

  const formatLastUpdate = () => {
    if (!latestPosition) return null;
    
    const lastUpdate = new Date(latestPosition.date_time);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return tCommon("minutes_ago", { minutes: diffInMinutes });
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return tCommon("hours_ago", { hours });
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return tCommon("days_ago", { days });
    }
  };

  const openInMaps = () => {
    if (latestPosition) {
      const url = `https://www.google.com/maps?q=${latestPosition.latitude},${latestPosition.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={locationStatus.color} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {locationStatus.label}
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLinkDialog(true)}
          className="h-6 px-2 text-xs"
        >
          <Link className="h-3 w-3 mr-1" />
          {geotabVehicle ? t("tracking.manage") : tCommon("link")}
        </Button>
      </div>

      {/* Location Details */}
      {geotabVehicle && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span className="font-medium">{geotabVehicle.name}</span>
          </div>
          
          {latestPosition && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("tracking.last_update", { time: formatLastUpdate() })}</span>
              </div>
              
              {latestPosition.speed !== undefined && latestPosition.speed > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  <span>{Math.round(latestPosition.speed)} km/h</span>
                </div>
              )}
              
              {latestPosition.odometer && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">📏</span>
                  <span>{Math.round(latestPosition.odometer)} km</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInMaps}
                className="mt-2 h-7 text-xs gap-1"
              >
                <MapPin className="h-3 w-3" />
                {t("tracking.view_on_map")}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Link Dialog */}
      <GeotabLinkDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        equipment={equipment}
      />
    </div>
  );
}