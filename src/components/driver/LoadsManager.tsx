import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  MapPin, 
  Clock, 
  Navigation, 
  CheckCircle, 
  AlertCircle,
  Phone,
  MessageSquare,
  Route,
  ExternalLink,
  Calendar
} from "lucide-react";
import { Link } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { useLoads } from "@/hooks/useLoads";
import { useUpdateLoadStatus } from "@/hooks/useUpdateLoadStatus";
import { useFleetNotifications } from "@/components/notifications";
import { StatusUpdateModal } from './StatusUpdateModal';
import { formatDateSafe, formatInternationalized } from '@/lib/dateFormatting';
import { useNavigationMaps } from '@/hooks/useNavigationMaps';
import { useLoadStopsNavigation } from '@/hooks/useLoadStopsNavigation';
import { Loader2 } from 'lucide-react';

interface Load {
  id: string;
  load_number: string;
  client_name: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  progress?: number;
  stops?: Array<{
    id: string;
    stop_number: number;
    stop_type: 'pickup' | 'delivery';
    company_name?: string;
    address: string;
    city: string;
    state: string;
    scheduled_date?: string;
    scheduled_time?: string;
  }>;
}

interface LoadsManagerProps {
  className?: string;
  dashboardMode?: boolean; // Nuevo prop para controlar el modo
}

// Componente para mostrar información de la parada actual
function CurrentStopInfo({ load }: { load: Load }) {
  const { t, i18n } = useTranslation(['common', 'dashboard']);
  const loadWithStops = {
    id: load.id,
    status: load.status,
    stops: load.stops
  };
  
  const { nextStopInfo } = useLoadStopsNavigation(loadWithStops);
  
  // No mostrar información de parada cuando está en "assigned"
  if (load.status === 'assigned') {
    return null;
  }
  
  if (!nextStopInfo) {
    return null;
  }
  
  
  const getStopActionText = (status: string, stop: any) => {
    const stopTypeText = stop.stop_type === 'pickup' ? 
      t('dashboard:loads.stop_types.pickup') : 
      t('dashboard:loads.stop_types.delivery');
    return `${t('common:stop', { defaultValue: 'Parada' })} ${stop.stop_number} (${stopTypeText})`;
  };

  const getTimeDisplayText = (status: string, stop: any) => {
    // Priorizar tiempo de finalización si está disponible
    if (stop.completion_datetime) {
      return `🏁 Completada: ${formatDateSafe(stop.completion_datetime, 'dd/MM HH:mm')}`;
    }

    // Si hay llegada real, mostrarla
    if (stop.actual_arrival_datetime) {
      return `✅ Llegó: ${formatDateSafe(stop.actual_arrival_datetime, 'dd/MM HH:mm')}`;
    }

    // Priorizar ETA si está disponible
    if (stop.eta_date) {
      const language = i18n.language;
      const pattern = language === 'es' ? 'dd/MM' : 'MM/dd';
      let result = `🎯 ETA: ${formatDateSafe(stop.eta_date, pattern)}`;
      if (stop.eta_time) {
        // Formatear hora para remover segundos si los tiene
        const timeWithoutSeconds = stop.eta_time.length > 5 ? stop.eta_time.substring(0, 5) : stop.eta_time;
        result += ` ${timeWithoutSeconds}`;
      }
      return result;
    }

    // Mostrar fecha programada como fallback
    if (stop.scheduled_date) {
      const language = i18n.language;
      const pattern = language === 'es' ? 'dd/MM' : 'MM/dd';
      let result = `${formatDateSafe(stop.scheduled_date, pattern)}`;
      if (stop.scheduled_time) {
        // Formatear hora para remover segundos si los tiene
        const timeWithoutSeconds = stop.scheduled_time.length > 5 ? stop.scheduled_time.substring(0, 5) : stop.scheduled_time;
        result += ` ${timeWithoutSeconds}`;
      }
      return result;
    }
    
    return null;
  };
  
  const timeDisplay = getTimeDisplayText(load.status, nextStopInfo.stop);
  
  return (
    <div className="text-xs text-muted-foreground mt-1">
      <div>{getStopActionText(load.status, nextStopInfo.stop)}</div>
      {timeDisplay && (
        <div className="text-xs text-primary font-medium mt-0.5">
          <Calendar className="h-3 w-3 inline mr-1" />
          {timeDisplay}
        </div>
      )}
    </div>
  );
}

export function LoadsManager({ className, dashboardMode = false }: LoadsManagerProps) {
  const { t, i18n } = useTranslation(['common', 'fleet', 'dashboard']);
  const { user } = useAuth();
  const { showSuccess } = useFleetNotifications();
  const updateLoadStatus = useUpdateLoadStatus();
  const { openInMaps, isNavigating } = useNavigationMaps();
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    loadId: string;
    newStatus: string;
    actionText: string;
    stopId?: string;
    stopInfo?: any;
  }>({
    isOpen: false,
    loadId: '',
    newStatus: '',
    actionText: '',
    stopId: undefined,
    stopInfo: undefined
  });

  const calculateProgress = (status: string, stopsData?: any[]): number => {
    // Casos especiales
    if (status === 'assigned') return 0;
    if (status === 'closed') return 100;

    if (!stopsData || stopsData.length === 0) {
      // Fallback para carga de 2 paradas: 2×3 + 1 = 7 estados totales
      const totalStates = 7;
      const progressPerState = Math.floor(100 / totalStates); // 14%
      
      switch (status) {
        case 'en_route_pickup': return progressPerState; // 14%
        case 'at_pickup': return progressPerState * 2; // 28%
        case 'loaded': return progressPerState * 3; // 42%
        case 'en_route_delivery': return progressPerState * 4; // 56%
        case 'at_delivery': return progressPerState * 5; // 70%
        case 'delivered': return progressPerState * 6; // 84%
        default: return 0;
      }
    }

    // Cálculo dinámico: número de paradas × 3 + 1 estado cerrar
    const sortedStops = [...stopsData].sort((a, b) => a.stop_number - b.stop_number);
    const totalStates = sortedStops.length * 3 + 1;
    const progressPerState = Math.floor(100 / totalStates);
    
    // Calcular posición del estado actual
    let currentStatePosition = 0;
    
    switch (status) {
      case 'en_route_pickup':
        currentStatePosition = 1;
        break;
      case 'at_pickup':
        currentStatePosition = 2;
        break;
      case 'loaded':
        currentStatePosition = 3;
        break;
      case 'en_route_delivery':
        currentStatePosition = 4;
        break;
      case 'at_delivery':
        currentStatePosition = 5;
        break;
      case 'delivered':
        currentStatePosition = 6;
        break;
      default:
        return 0;
    }
    
    const finalProgress = progressPerState * currentStatePosition;
    return Math.min(finalProgress, 99);
  };

  // Fetch driver's loads using the real hook
  const { data: loadsData = [], isLoading, refetch } = useLoads();
  
  // Transform data for LoadsManager component
  const loads = useMemo(() => {
    if (!loadsData || !user?.id) return [];
    
    const transformedLoads = loadsData
      .filter(load => load.driver_user_id === user.id)
      .map(load => {
        const stops = (load.stops || []).sort((a, b) => a.stop_number - b.stop_number);
        
        // Get actual pickup and delivery dates from stops
        const pickupStops = stops.filter(stop => stop.stop_type === 'pickup');
        const deliveryStops = stops.filter(stop => stop.stop_type === 'delivery');
        
        const earliestPickup = pickupStops.find(stop => stop.scheduled_date);
        const latestDelivery = deliveryStops.find(stop => stop.scheduled_date);
        
        return {
          id: load.id,
          load_number: load.load_number,
          client_name: load.broker_name || 'Sin cliente',
          origin_city: load.pickup_city || 'Sin origen',
          origin_state: '',
          destination_city: load.delivery_city || 'Sin destino', 
          destination_state: '',
          pickup_date: earliestPickup?.scheduled_date || '',
          delivery_date: latestDelivery?.scheduled_date || '',
          status: load.status,
          total_amount: load.total_amount,
          progress: calculateProgress(load.status, stops),
          stops: stops.map(stop => ({
            ...stop,
            id: stop.id || crypto.randomUUID(),
            address: stop.address || '',
            city: stop.city || '',
            state: stop.state || ''
          }))
        };
      });

    // Si no es modo dashboard, ordenar por fecha de recogida
    if (!dashboardMode) {
      return transformedLoads.sort((a, b) => {
        // Si ambas tienen fecha de recogida, ordenar por fecha
        if (a.pickup_date && b.pickup_date) {
          return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
        }
        // Si solo una tiene fecha, ponerla primero
        if (a.pickup_date && !b.pickup_date) return -1;
        if (!a.pickup_date && b.pickup_date) return 1;
        // Si ninguna tiene fecha, mantener orden original
        return 0;
      });
    }

    return transformedLoads;
  }, [loadsData, user?.id, dashboardMode]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned': return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/30';
      case 'en_route_pickup': return 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/15 hover:border-secondary/30';
      case 'at_pickup': return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 hover:border-warning/30';
      case 'loaded': return 'bg-accent/50 text-accent-foreground border-accent hover:bg-accent/60 hover:border-accent';
      case 'en_route_delivery': return 'bg-chart-5/10 text-chart-5 border-chart-5/20 hover:bg-chart-5/15 hover:border-chart-5/30';
      case 'at_delivery': return 'bg-chart-3/10 text-chart-3 border-chart-3/20 hover:bg-chart-3/15 hover:border-chart-3/30';
      case 'delivered': return 'bg-success/10 text-success border-success/20 hover:bg-success/15 hover:border-success/30';
      default: return 'bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:border-border';
    }
  };

  const getStatusText = (status: string): string => {
    return t(`dashboard:loads.status.${status}`, { defaultValue: status });
  };

  // Función para abrir el modal de actualización de estado
  const openStatusModal = (loadId: string, newStatus: string, actionText: string, stopId?: string, stopInfo?: any) => {
    setStatusModal({
      isOpen: true,
      loadId,
      newStatus,
      actionText,
      stopId,
      stopInfo
    });
  };

  // Función para confirmar la actualización de estado con ETA y notas
  const handleStatusConfirm = async (eta: Date | null, notes: string) => {
    try {
      await updateLoadStatus.mutateAsync({
        loadId: statusModal.loadId,
        newStatus: statusModal.newStatus,
        eta,
        notes,
        stopId: statusModal.stopId
      });
      await refetch();
      setStatusModal({ ...statusModal, isOpen: false });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'assigned': 'en_route_pickup',
      'en_route_pickup': 'at_pickup',
      'at_pickup': 'loaded',
      'loaded': 'en_route_delivery',
      'en_route_delivery': 'at_delivery',
      'at_delivery': 'delivered'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const getNextActionText = (currentStatus: string): string => {
    return t(`dashboard:loads.actions.${currentStatus}`, { 
      defaultValue: t('dashboard:loads.actions.update_status') 
    });
  };
  
  const handleNavigateToStop = async (stop: any) => {
    await openInMaps({
      address: stop.address,
      city: stop.city,
      state: stop.state,
      zipCode: ''
    });
  };

  const activeLoads = loads.filter(load => !['delivered', 'cancelled'].includes(load.status));
  const completedLoads = loads.filter(load => ['delivered'].includes(load.status));

  // Determinar la carga actual (más prioritaria) para mostrar en el dashboard
  const getCurrentLoad = (loads: Load[]): Load | null => {
    if (loads.length === 0) return null;
    
    // Priorizar por orden de progreso/estado (más avanzado = más prioritario)
    const statusPriority = {
      'at_delivery': 6,
      'en_route_delivery': 5,
      'loaded': 4,
      'at_pickup': 3,
      'en_route_pickup': 2,
      'assigned': 1
    };
    
    // Ordenar por prioridad de estado y luego por fecha más cercana
    const sortedLoads = [...loads].sort((a, b) => {
      const priorityA = statusPriority[a.status as keyof typeof statusPriority] || 0;
      const priorityB = statusPriority[b.status as keyof typeof statusPriority] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Mayor prioridad primero
      }
      
      // Si tienen la misma prioridad, ordenar por fecha de entrega más cercana
      if (a.delivery_date && b.delivery_date) {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      }
      
      return 0;
    });
    
    return sortedLoads[0];
  };

  const currentLoad = getCurrentLoad(activeLoads);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('dashboard:loads.loading')}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-1">
          <TabsTrigger value="active">
            <div className="flex items-center gap-2">
              <span>{dashboardMode ? t('dashboard:loads.active_load') : t('dashboard:loads.assigned_loads')}</span>
              {!dashboardMode && activeLoads.length > 0 && (
                <Badge variant="outline" className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-white text-orange-600 border-orange-200">
                  {activeLoads.length}
                </Badge>
              )}
              {dashboardMode && activeLoads.length > 1 && (
                <Link 
                  to="/my-loads" 
                  className="ml-1 hover:text-primary transition-colors"
                  title="Ver Cargas Asignadas"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('dashboard:loads.completed')}
            {completedLoads.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {completedLoads.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className={dashboardMode ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
          {activeLoads.length === 0 ? (
            <Card className={dashboardMode ? "" : "lg:col-span-2"}>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard:loads.no_active_loads')}</h3>
                <p className="text-muted-foreground">
                  {t('dashboard:loads.no_loads_description')}
                </p>
              </CardContent>
            </Card>
          ) : (
            // En dashboard mode mostrar solo la carga actual, en modo completo mostrar todas
            (dashboardMode ? [currentLoad].filter(Boolean) : activeLoads).map((load) => (
              <Card key={load.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <CardTitle className="text-base">{load.load_number}</CardTitle>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(load.status)}>
                        {getStatusText(load.status)}
                      </Badge>
                      {load.status === 'assigned' && load.stops && load.stops.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                           {(() => {
                             const firstStop = load.stops!.find(stop => stop.stop_type === 'pickup') || load.stops![0];
                              if (firstStop?.scheduled_date) {
                                const language = i18n.language;
                               const pattern = language === 'es' ? 'dd/MM' : 'MM/dd';
                               const shortDate = formatDateSafe(firstStop.scheduled_date, pattern);
                               
                              
                              return (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{shortDate}</span>
                                  </div>
                                   {firstStop.scheduled_time && (
                                     <div className="flex items-center gap-1">
                                       <span>{firstStop.scheduled_time.length > 5 ? firstStop.scheduled_time.substring(0, 5) : firstStop.scheduled_time}</span>
                                     </div>
                                   )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{load.client_name}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Route Info - Enhanced for multiple stops */}
                  <div className="space-y-3">
                    {load.stops && load.stops.length > 0 ? (
                      // Show detailed stops if available
                      <div className="space-y-2">
                        {load.stops.map((stop, index) => {
                          // Encontrar todas las entregas para determinar la última
                          const deliveryStops = load.stops!.filter(s => s.stop_type === 'delivery');
                          const lastDeliveryIndex = deliveryStops.length > 0 ? 
                            load.stops!.lastIndexOf(deliveryStops[deliveryStops.length - 1]) : -1;
                          const isLastDelivery = stop.stop_type === 'delivery' && index === lastDeliveryIndex;
                          
                          let stopColor = '';
                          if (stop.stop_type === 'pickup') {
                            stopColor = 'bg-green-500'; // Verde para recogidas
                          } else if (stop.stop_type === 'delivery') {
                            if (load.stops!.length > 2 && !isLastDelivery) {
                              stopColor = 'bg-blue-500'; // Azul para entregas intermedias
                            } else {
                              stopColor = 'bg-red-500'; // Rojo para la última entrega o cargas simples
                            }
                          }
                          
                          return (
                            <div key={stop.id} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ${stopColor}`}></div>
                                {index < load.stops!.length - 1 && (
                                  <div className="w-0.5 h-6 bg-border"></div>
                                )}
                              </div>
                                <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                     <Badge variant="outline" className="text-xs">
                                       {stop.stop_type === 'pickup' ? 'Recogida' : 'Entrega'} #{stop.stop_number}
                                     </Badge>
                                     {stop.scheduled_date && (
                                       <span className="text-xs text-primary font-medium flex items-center gap-1">
                                         <Calendar className="h-3 w-3" />
                                         {(() => {
                                           const language = i18n.language;
                                           const pattern = language === 'es' ? 'dd/MM' : 'MM/dd';
                                           return formatDateSafe(stop.scheduled_date, pattern);
                                         })()}
                                         {stop.scheduled_time && ` ${stop.scheduled_time.length > 5 ? stop.scheduled_time.substring(0, 5) : stop.scheduled_time}`}
                                       </span>
                                     )}
                                   </div>
                                <p className="font-medium text-sm">
                                  {stop.company_name}
                                </p>
                                <button
                                  onClick={() => handleNavigateToStop(stop)}
                                  disabled={isNavigating}
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left underline decoration-dashed underline-offset-2 hover:decoration-solid"
                                >
                                  {[stop.address, stop.city, stop.state].filter(Boolean).join(', ')}
                                </button>
                              </div>
                              {index === 0 && (
                                <div className="text-right">
                                  <p className="font-bold text-green-600">${load.total_amount.toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Fallback to simple origin/destination view
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="w-0.5 h-8 bg-border"></div>
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="font-medium text-sm">{load.origin_city}, {load.origin_state}</p>
                            <p className="text-xs text-muted-foreground">
                              Recogida: {load.pickup_date ? formatDateSafe(load.pickup_date, 'dd/MM/yyyy') : 'Fecha pendiente'}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{load.destination_city}, {load.destination_state}</p>
                            <p className="text-xs text-muted-foreground">
                              Entrega: {load.delivery_date ? formatDateSafe(load.delivery_date, 'dd/MM/yyyy') : 'Fecha pendiente'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${load.total_amount.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span>
                         {t('dashboard:loads.progress')}
                         {(() => {
                           // Calcular información de la parada directamente sin hook
                           if (load.status !== 'assigned' && load.stops && load.stops.length > 0) {
                             // Encontrar la parada actual según el estado
                             let currentStop = null;
                             if (load.status === 'en_route_pickup' || load.status === 'at_pickup') {
                               currentStop = load.stops.find(stop => stop.stop_type === 'pickup');
                             } else if (load.status === 'loaded' || load.status === 'en_route_delivery' || load.status === 'at_delivery') {
                               currentStop = load.stops.find(stop => stop.stop_type === 'delivery');
                             }
                             
                             if (currentStop) {
                               const stopTypeText = currentStop.stop_type === 'pickup' ? 
                                 t('dashboard:loads.stop_types.pickup') : 
                                 t('dashboard:loads.stop_types.delivery');
                               return ` (${t('common:stop', { defaultValue: 'Parada' })} ${currentStop.stop_number} (${stopTypeText}))`;
                             }
                           }
                           return '';
                         })()}
                       </span>
                       <span className="font-medium">{load.progress}%</span>
                     </div>
                    <Progress value={load.progress} className="h-2" />
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(() => {
                      const nextStatus = getNextStatus(load.status);
                      const nextActionText = getNextActionText(load.status);
                      
                      if (!nextStatus) return null;
                      
                      // Encontrar la parada actual según el estado
                      const currentStop = load.stops?.find(stop => {
                        if (load.status === 'assigned' || load.status === 'en_route_pickup') {
                          return stop.stop_type === 'pickup';
                        } else if (load.status === 'at_pickup' || load.status === 'loaded' || load.status === 'en_route_delivery') {
                          return stop.stop_type === 'delivery';
                        }
                        return false;
                      });
                      
                      return (
                        <Button
                          onClick={() => {
                            openStatusModal(
                              load.id, 
                              nextStatus, 
                              nextActionText,
                              currentStop?.id,
                              currentStop
                            );
                          }}
                          disabled={updateLoadStatus.isPending}
                          size="sm"
                          className="flex-1"
                        >
                          {updateLoadStatus.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Actualizando...
                            </>
                          ) : (
                            <>
                              <MapPin className="mr-2 h-4 w-4" />
                              {nextActionText}
                            </>
                          )}
                        </Button>
                      );
                    })()}
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Route className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedLoads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cargas completadas</h3>
                <p className="text-muted-foreground">
                  Las cargas completadas aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            completedLoads.map((load) => (
              <Card key={load.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base">{load.load_number}</CardTitle>
                    </div>
                     <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/15 hover:border-success/30">
                       Entregada
                     </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{load.client_name}</p>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <p>{load.origin_city} → {load.destination_city}</p>
                      <p className="text-muted-foreground">
                        {load.delivery_date ? formatDateSafe(load.delivery_date, 'dd/MM/yyyy') : 'Sin fecha'}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">${load.total_amount.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Modal de actualización de estado con ETA y notas */}
      <StatusUpdateModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        onConfirm={handleStatusConfirm}
        actionText={statusModal.actionText}
        stopInfo={statusModal.stopInfo}
        isLoading={updateLoadStatus.isPending}
        loadId={statusModal.loadId}
        isDeliveryStep={statusModal.newStatus === 'delivered'}
        newStatus={statusModal.newStatus}
      />
    </div>
  );
}