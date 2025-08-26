import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  Navigation,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useUpdateLoadStatus } from '@/hooks/useUpdateLoadStatus';
import { useFleetNotifications } from '@/components/notifications';
import { LoadActionButton } from '@/components/driver/LoadActionButton';
import { formatDateTimeShort, formatDateAuto } from '@/lib/dateFormatting';
import { useNavigationMaps } from '@/hooks/useNavigationMaps';

interface LoadStop {
  id?: string;
  stop_number: number;
  stop_type: string; // Changed from union type to string to match DB
  city: string;
  state: string;
  company_name?: string;
  contact_phone?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface Load {
  id: string;
  load_number: string;
  status: string;
  pickup_date: string;
  delivery_date: string;
  customer_name?: string;
  total_amount: number;
  stops?: LoadStop[];
}

export const DriverLoadsInterface = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['common', 'loads']);
  const { showSuccess, showError } = useFleetNotifications();
  const updateLoadStatus = useUpdateLoadStatus();
  const { openInMaps } = useNavigationMaps();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch driver's active loads
  const { data: loads = [], isLoading, refetch } = useQuery({
    queryKey: ['driver-active-loads', user?.id],
    queryFn: async (): Promise<Load[]> => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('loads')
        .select(`
          id,
          load_number,
          status,
          pickup_date,
          delivery_date,
          customer_name,
          total_amount,
          stops:load_stops (
            id,
            stop_number,
            stop_type,
            city,
            state,
            company_name,
            contact_phone,
            scheduled_date,
            scheduled_time
          )
        `)
        .eq('driver_user_id', user.id)
        .in('status', ['assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const handleStatusUpdate = async (loadId: string, newStatus: string) => {
    try {
      await updateLoadStatus.mutateAsync({
        loadId,
        newStatus,
        notes: `Estado actualizado desde móvil a ${newStatus}`
      });
      
      showSuccess(
        t('loads:status_updated'),
        `${t('loads:load')} actualizada a ${newStatus}`
      );
    } catch (error) {
      showError(
        t('common:error'),
        error instanceof Error ? error.message : 'Error actualizando estado'
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      showSuccess(t('common:refreshed'), t('loads:loads_refreshed'));
    } catch (error) {
      showError(t('common:error'), 'Error refrescando cargas');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en_route_pickup': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'at_pickup': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'loaded': return 'bg-green-100 text-green-800 border-green-200';
      case 'en_route_delivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'at_delivery': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNextDestination = (load: Load) => {
    if (!load.stops || load.stops.length === 0) {
      return 'Destino no disponible';
    }

    // Get stops by type and current status
    const pickupStops = load.stops.filter(stop => stop.stop_type === 'pickup');
    const deliveryStops = load.stops.filter(stop => stop.stop_type === 'delivery');
    
    if (load.status === 'assigned' || load.status === 'en_route_pickup' || load.status === 'at_pickup') {
      const nextPickup = pickupStops[0];
      return nextPickup ? `${nextPickup.company_name || nextPickup.city}, ${nextPickup.state}` : 'Ubicación de recogida';
    }
    
    const nextDelivery = deliveryStops[0];
    return nextDelivery ? `${nextDelivery.company_name || nextDelivery.city}, ${nextDelivery.state}` : 'Ubicación de entrega';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('common:loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (loads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('loads:no_active_loads')}</h3>
          <p className="text-muted-foreground">
            {t('loads:no_active_loads_description')}
          </p>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="mt-4"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common:refresh')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('loads:active_loads')}</h2>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('common:refresh')}
        </Button>
      </div>

      {/* Active loads list */}
      {loads.map((load) => (
        <Card key={load.id} className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                #{load.load_number}
              </CardTitle>
              <Badge className={getStatusColor(load.status)}>
                {t(`loads:status.${load.status}`)}
              </Badge>
            </div>
            {load.customer_name && (
              <p className="text-sm text-muted-foreground">
                {load.customer_name}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Route info */}
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t('loads:next_destination')}:</span>
              <span>{getNextDestination(load)}</span>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('loads:pickup_date')}</p>
                <p className="font-medium">{formatDateAuto(load.pickup_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('loads:delivery_date')}</p>
                <p className="font-medium">{formatDateAuto(load.delivery_date)}</p>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex space-x-2">
              <LoadActionButton
                load={{
                  id: load.id,
                  status: load.status,
                  stops: load.stops?.map(stop => ({
                    ...stop,
                    stop_type: stop.stop_type as 'pickup' | 'delivery' // Type assertion for compatibility
                  })) || []
                }}
                onUpdateStatus={handleStatusUpdate}
                isPending={updateLoadStatus.isPending}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const destination = getNextDestination(load);
                  if (destination && destination !== 'Destino no disponible') {
                    // Direct call - openInMaps expects just the address string
                    window.open(`https://maps.google.com/maps?q=${encodeURIComponent(destination)}`, '_blank');
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {t('common:navigate')}
              </Button>
            </div>

            {/* Contact info if available */}
            {load.stops && load.stops.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {load.stops.map((stop, index) => 
                  stop.contact_phone && (
                    <div key={index} className="flex items-center justify-between">
                      <span>{stop.company_name || `${stop.city}, ${stop.state}`}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`tel:${stop.contact_phone}`)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {stop.contact_phone}
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};