import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Calendar, Clock, Building, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadStop } from '@/hooks/useLoadStops';
import { format } from 'date-fns';
import { formatMediumDate } from '@/lib/dateFormatting';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface StopListItemProps {
  stop: LoadStop;
  onEdit: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  hasDateError?: boolean;
}

export function StopListItem({ 
  stop, 
  onEdit, 
  isFirst = false, 
  isLast = false, 
  hasDateError = false 
}: StopListItemProps) {
  const { t } = useTranslation();
  const [cityName, setCityName] = useState<string>('');
  const [facilityData, setFacilityData] = useState<{
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    contact_name?: string;
    contact_phone?: string;
  } | null>(null);

  // Fetch facility data if facility_id exists
  useEffect(() => {
    const fetchFacilityData = async () => {
      if (stop.facility_id) {
        try {
          const { data, error } = await supabase
            .from('facilities')
            .select('name, address, city, state, zip_code, contact_name, contact_phone')
            .eq('id', stop.facility_id)
            .single();

          if (data && !error) {
            setFacilityData(data);
          } else {
            setFacilityData(null);
          }
        } catch {
          setFacilityData(null);
        }
      } else {
        setFacilityData(null);
      }
    };

    fetchFacilityData();
  }, [stop.facility_id]);

  useEffect(() => {
    // Use city from facility data if available
    const cityToUse = facilityData ? facilityData.city : '';
    
    if (cityToUse && cityToUse.includes('-') && cityToUse.length > 30) {
      // This looks like a UUID, fetch the city name
      const fetchCityName = async () => {
        try {
          const { data, error } = await supabase
            .from('state_cities')
            .select('name')
            .eq('id', cityToUse)
            .single();

          if (data && !error) {
            setCityName(data.name);
          } else {
            setCityName('');
          }
        } catch {
          setCityName('');
        }
      };
      fetchCityName();
    } else {
      // This is already a city name or empty
      setCityName(cityToUse || '');
    }
  }, [facilityData]);

  const getStopTypeLabel = () => {
    if (isFirst) return t("loads:create_wizard.phases.route_details.pickup");
    if (isLast) return t("loads:create_wizard.phases.route_details.delivery");
    return stop.stop_type === 'pickup' ? t("loads:create_wizard.phases.route_details.pickup") : t("loads:create_wizard.phases.route_details.delivery");
  };

  const getStopTypeColor = () => {
    if (stop.stop_type === 'pickup') {
      return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900';
    }
    // For delivery stops: blue for intermediate, red for final
    return isLast 
      ? 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900' 
      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900';
  };

  // Format the address properly, ensuring city is displayed correctly
  // Use facility data if available
  const formatAddress = () => {
    if (!facilityData) return '';
    
    const parts = [];
    
    if (facilityData.address) {
      parts.push(facilityData.address);
    }
    
    if (cityName) {
      parts.push(cityName);
    }
    
    if (facilityData.state) {
      parts.push(facilityData.state);
    }
    
    if (facilityData.zip_code) {
      parts.push(facilityData.zip_code);
    }
    
    return parts.join(', ');
  };

  // Get company name from facility data
  const companyName = facilityData?.name || '';

  return (
    <div className={cn(
      "border rounded-lg p-4 bg-background transition-colors",
      hasDateError && "border-destructive bg-destructive/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{t("loads:create_wizard.phases.route_details.stop_number", { number: stop.stop_number })}</span>
          </div>
          <Badge className={cn("text-xs", getStopTypeColor())}>
            {getStopTypeLabel()}
          </Badge>
          {hasDateError && (
            <Badge variant="destructive" className="text-xs">
              {t("loads:create_wizard.phases.route_details.date_error")}
            </Badge>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 px-2"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        {/* Company */}
        {companyName && (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{companyName}</span>
          </div>
        )}

        {/* Address */}
        {formatAddress() && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              {formatAddress()}
            </div>
          </div>
        )}

        {/* Contact Info from facility */}
        {(facilityData?.contact_name || facilityData?.contact_phone) && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {facilityData.contact_name && facilityData.contact_phone 
                ? `${facilityData.contact_name} - ${facilityData.contact_phone}`
                : facilityData.contact_name || facilityData.contact_phone
              }
            </span>
          </div>
        )}

        {/* Special Instructions */}
        {stop.special_instructions && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>{t("loads:create_wizard.phases.route_details.instructions_label")}</strong> {stop.special_instructions}
          </div>
        )}
      </div>
    </div>
  );
}
