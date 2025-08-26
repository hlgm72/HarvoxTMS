import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateSafe, formatInternationalized, getDateFormats, formatNumber } from '@/lib/dateFormatting';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Calendar,
  FileText,
  Loader2
} from "lucide-react";
import { Link } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";
import { useLoads } from "@/hooks/useLoads";
import { useUpdateLoadStatus } from "@/hooks/useUpdateLoadStatus";
import { useFleetNotifications } from "@/components/notifications";
import { StatusUpdateModal } from './StatusUpdateModal';
import { formatDateAuto, formatDateTimeAuto, formatDateTimeShort } from '@/lib/dateFormatting';
import { useNavigationMaps } from '@/hooks/useNavigationMaps';
import { useLoadStopsNavigation } from '@/hooks/useLoadStopsNavigation';
import { LoadDocumentStatusIndicator } from '@/components/loads/LoadDocumentStatusIndicator';
import { LoadStatusHistoryButton } from '@/components/loads/LoadStatusHistoryButton';
import { LoadDocumentsSection } from '@/components/loads/LoadDocumentsSection';
import { LoadDocumentsProvider } from '@/contexts/LoadDocumentsContext';
import { SplitLoadActionButton } from "./SplitLoadActionButton";
import { usePODUpload } from "@/hooks/usePODUpload";
import { useLoadCompletion } from '@/hooks/useLoadCompletion';
import { ActiveLoadsWithCelebration } from './ActiveLoadsWithCelebration';
import { LoadCardWithCompletion } from './LoadCardWithCompletion';
import { CompletedLoadsModal } from './CompletedLoadsModal';

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
  // Información del historial de estado más reciente
  latest_status_notes?: string;
  latest_status_eta?: string;
  latest_status_stop_id?: string;
  // Documentos de la carga
  documents?: Array<{
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
  }>;
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
      return `🏁 Completada: ${formatDateTimeShort(stop.completion_datetime)}`;
    }

    // Si hay llegada real, mostrarla
    if (stop.actual_arrival_datetime) {
      return `✅ Llegó: ${formatDateTimeShort(stop.actual_arrival_datetime)}`;
    }

    // Priorizar ETA si está disponible
    if (stop.eta_date) {
      const language = i18n.language;
      const formats = getDateFormats();
      const pattern = language === 'es' ? formats.SHORT_DATE_ES.replace('/yyyy', '') : formats.SHORT_DATE_EN.replace('/yyyy', '');
      let result = `🎯 ETA: ${formatInternationalized(stop.eta_date, pattern)}`;
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
      const formats = getDateFormats();
      const pattern = language === 'es' ? formats.SHORT_DATE_ES.replace('/yyyy', '') : formats.SHORT_DATE_EN.replace('/yyyy', '');
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
  const { t, i18n } = useTranslation(['loads', 'common', 'fleet', 'dashboard']);
  const { user } = useAuth();
  const { showSuccess } = useFleetNotifications();
  const updateLoadStatus = useUpdateLoadStatus();
  const { openInMaps, isNavigating } = useNavigationMaps();
  const { openPODUpload, PODUploadComponent } = usePODUpload();
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

  const [documentsDialog, setDocumentsDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const [completedLoadsModal, setCompletedLoadsModal] = useState(false);

  const calculateProgress = (status: string, stopsData?: any[], hasPOD?: boolean): number => {
    // Casos especiales
    if (status === 'assigned') return 0;
    if (status === 'closed') return 100;
    
    // ✅ NUEVO: Si está delivered Y tiene POD = 100%
    if (status === 'delivered' && hasPOD) return 100;

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
        case 'delivered': return progressPerState * 6; // 84% (sin POD)
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
        currentStatePosition = 6; // Sin POD = ~85%
        break;
      default:
        return 0;
    }
    
    const finalProgress = progressPerState * currentStatePosition;
    return Math.min(finalProgress, 90); // Máximo 90% sin POD
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
        
         // Determine client name: if has Load Order, show company name, otherwise broker name  
         let clientName = load.broker_name || 'Sin cliente';
         if (load.has_load_order && load.company_name) {
           clientName = load.company_name;
         }
        
        return {
          id: load.id,
          load_number: load.load_number,
          client_name: clientName,
          origin_city: load.pickup_city || 'Sin origen',
          origin_state: '',
          destination_city: load.delivery_city || 'Sin destino', 
          destination_state: '',
          pickup_date: earliestPickup?.scheduled_date || '',
          delivery_date: latestDelivery?.scheduled_date || '',
          status: load.status,
          total_amount: load.total_amount,
          progress: calculateProgress(
            load.status, 
            stops, 
            load.documents?.some(doc => doc.document_type === 'pod')
          ),
          // Información del historial de estado más reciente
          latest_status_notes: (load as any).latest_status_notes,
          latest_status_eta: (load as any).latest_status_eta,
          latest_status_stop_id: (load as any).latest_status_stop_id,
          // Documentos de la carga 
          documents: load.documents || [],
          stops: stops.map((stop, index) => ({
            ...stop,
            id: stop.id || `${load.id}-stop-${index}`,
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
        // ✅ CORREGIDO: Usar funciones centralizadas para comparar fechas de BD
        if (a.pickup_date && b.pickup_date) {
          return formatDateSafe(a.pickup_date, 'yyyy-MM-dd').localeCompare(formatDateSafe(b.pickup_date, 'yyyy-MM-dd'));
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
    console.log('🔍 LoadsManager getStatusText:', { status, translationKey: `status.${status}`, result: t(`common:status.${status}`, { defaultValue: status }) });
    return t(`common:status.${status}`, { defaultValue: status });
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
    // ✅ Cerrar el modal inmediatamente para mejor UX
    setStatusModal({ ...statusModal, isOpen: false });
    
    try {
      await updateLoadStatus.mutateAsync({
        loadId: statusModal.loadId,
        newStatus: statusModal.newStatus,
        eta,
        notes,
        stopId: statusModal.stopId
      });
      await refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      // Si hay error, el hook ya muestra la notificación de error
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

  // Lógica mejorada para determinar cargas completadas
  const isLoadCompleted = (load: Load): boolean => {
    // ✅ VALIDACIÓN CRÍTICA: Solo una carga en estado 'delivered' puede estar completada
    // Esto previene inconsistencias de datos donde cargas en otros estados tengan POD
    const isDelivered = load.status === 'delivered';
    const hasPOD = load.documents?.some(doc => doc.document_type === 'pod') === true;
    const completed = isDelivered && hasPOD;
    
    // ⚠️ DETECTAR INCONSISTENCIAS DE DATOS
    if (!isDelivered && hasPOD) {
      console.error('❌ INCONSISTENCIA DE DATOS:', { 
        loadId: load.id, 
        loadNumber: load.load_number,
        status: load.status, 
        hasPOD,
        message: 'Una carga no puede tener POD si no está en estado delivered'
      });
    }
    
    console.log('🎉 LoadsManager - isLoadCompleted:', { 
      loadId: load.id, 
      loadNumber: load.load_number,
      status: load.status, 
      isDelivered,
      hasPOD, 
      completed,
      hasInconsistency: !isDelivered && hasPOD
    });
    
    return completed;
  };

  const activeLoads = loads.filter(load => {
    // Excluir cargas canceladas
    if (['cancelled'].includes(load.status)) return false;
    
    // ✅ LÓGICA CORREGIDA PARA CELEBRACIÓN
    const isCompleted = isLoadCompleted(load);
    
    if (isCompleted) {
      // Si está completada, verificar si está en celebración usando el hook
      // Para esto necesitamos verificar si hay alguna celebración activa
      // Las cargas completadas solo permanecen en activeLoads durante celebración
      return false; // Por ahora excluir, pero usaremos otro enfoque
    }
    
    // Incluir cargas delivered SIN POD (pueden subir POD y celebrar)
    if (load.status === 'delivered' && !load.documents?.some(doc => doc.document_type === 'pod')) {
      return true;
    }
    
    // Incluir todas las demás cargas no completadas
    return !isCompleted;
  });
  const completedLoads = loads.filter(load => isLoadCompleted(load));

  console.log('🎉 LoadsManager - Lists:', { 
    totalLoads: loads.length,
    activeLoads: activeLoads.length,
    completedLoads: completedLoads.length,
    activeLoadIds: activeLoads.map(l => l.id)
  });

  // Determinar la carga actual (más prioritaria) para mostrar en el dashboard
  const getCurrentLoad = (loads: Load[]): Load | null => {
    if (loads.length === 0) return null;
    
    // Priorizar por orden de progreso/estado (más avanzado = más prioritario)
    const statusPriority = {
      'delivered': 7,        // ✅ Alta prioridad - necesita POD
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
      // ✅ CORREGIDO: Usar funciones centralizadas para comparar fechas de BD
      if (a.delivery_date && b.delivery_date) {
        return formatDateSafe(a.delivery_date, 'yyyy-MM-dd').localeCompare(formatDateSafe(b.delivery_date, 'yyyy-MM-dd'));
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
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Link 
                         to="/my-loads" 
                         className="ml-1 hover:text-primary transition-colors"
                       >
                         <ExternalLink className="h-3 w-3" />
                       </Link>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>{t('common:loads.tooltips.view_all_loads')}</p>
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('dashboard:loads.completed')}
            {completedLoads.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center text-white bg-foreground">
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
            <ActiveLoadsWithCelebration
              loads={dashboardMode ? [currentLoad].filter(Boolean) : activeLoads}
              completedLoads={completedLoads}
              onUpdateStatus={(loadId, newStatus, actionText, stopId, stopInfo) => {
                openStatusModal(loadId, newStatus, actionText, stopId, stopInfo);
              }}
              onUploadPOD={(loadId, loadNumber) => openPODUpload(loadId, loadNumber)}
              onViewDetails={(load) => setDocumentsDialog({ isOpen: true, load })}
              onCallContact={(load) => {
                if (load.contact_phone) {
                  window.open(`tel:${load.contact_phone}`, '_self');
                }
              }}
              onViewRoute={(load) => {
                if (load.destination_city && load.destination_state) {
                  openInMaps({
                    address: `${load.destination_city}, ${load.destination_state}`,
                    city: load.destination_city,
                    state: load.destination_state,
                    zipCode: ''
                  });
                }
              }}
              updateLoadStatus={updateLoadStatus}
              getNextActionText={getNextActionText}
            />
           )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedLoads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('loads:completed.no_loads_title')}</h3>
                <p className="text-muted-foreground">
                  {t('loads:completed.no_loads_description')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mostrar máximo 2 cargas completadas */}
              {completedLoads.slice(0, 2).map((load) => (
                <Card key={load.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-base">{load.load_number}</CardTitle>
                      </div>
                       <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/15 hover:border-success/30">
                          {getStatusText('delivered')}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{load.client_name}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <p>{load.origin_city} → {load.destination_city}</p>
                        <p className="text-muted-foreground">
                          {load.delivery_date ? formatDateAuto(load.delivery_date) : 'Sin fecha'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <LoadStatusHistoryButton
                          loadId={load.id}
                          loadNumber={load.load_number}
                          variant="outline"
                          size="sm"
                          showText={false}
                        />
                        <p className="font-bold text-green-600">${formatNumber(load.total_amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Botón "Ver todas" si hay más de 2 cargas completadas */}
              {completedLoads.length > 2 && (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setCompletedLoadsModal(true)}
                      className="w-full"
                    >
                      {t('dashboard:loads.view_all_completed')} ({completedLoads.length - 2} {t('dashboard:loads.more')})
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
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
      />
      
      {/* Dialog de gestión de documentos */}
      {documentsDialog.load && (
        <LoadDocumentsProvider>
          <LoadDocumentsSection
            isDialogMode={true}
            isOpen={documentsDialog.isOpen}
            onClose={() => setDocumentsDialog({ isOpen: false })}
            loadId={documentsDialog.load.id}
            loadNumber={documentsDialog.load.load_number}
            loadData={documentsDialog.load}
            userRole="driver"
          />
        </LoadDocumentsProvider>
      )}
      
       {/* Modal de subida de POD */}
       <PODUploadComponent onSuccess={() => {
         refetch(); // Refrescar datos cuando se sube el POD
       }} />

       {/* Modal de todas las cargas completadas */}
       <CompletedLoadsModal
         isOpen={completedLoadsModal}
         onOpenChange={setCompletedLoadsModal}
         completedLoads={completedLoads}
         onNavigateToStop={handleNavigateToStop}
         isNavigating={isNavigating}
         getStatusColor={getStatusColor}
         getStatusText={getStatusText}
         openPODUpload={openPODUpload}
         setDocumentsDialog={setDocumentsDialog}
       />
    </div>
  );
}