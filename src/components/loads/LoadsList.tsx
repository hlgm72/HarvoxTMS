import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Edit, MapPin, DollarSign, MoreHorizontal, ArrowRightLeft, Loader2, FileText, Trash2, Copy, Play, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDateTime } from '@/lib/dateFormatting';
import { useDeleteLoad } from "@/hooks/useDeleteLoad";
import { useUpdateLoadStatus } from "@/hooks/useUpdateLoadStatus";
import { PeriodFilterValue } from "./PeriodFilter";
import PaymentPeriodInfo from "./PaymentPeriodInfo";
import { EmptyLoadsState } from "./EmptyLoadsState";
import { LoadDocumentsList } from "./LoadDocumentsList";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";

interface DialogState {
  isOpen: boolean;
  load?: any;
}

interface LoadsListProps {
  loads?: any[];
  isLoading?: boolean;
  selectedStatus?: string;
  searchQuery?: string;
  selectedBroker?: string;
  selectedDriver?: string;
  selectedPeriod?: PeriodFilterValue;
  periodFilter?: PeriodFilterValue;
  filters?: any;
  onCreateLoad?: () => void;
  hideFloatingActions?: boolean;
}

export function LoadsList({ 
  loads, 
  isLoading, 
  selectedStatus, 
  searchQuery, 
  selectedBroker, 
  selectedDriver, 
  selectedPeriod,
  onCreateLoad
}: LoadsListProps) {
  console.log('🚛 LoadsList COMPONENT RENDERED - Working dropdown version');
  const { t } = useTranslation("fleet");
  const { refreshTrigger } = useLoadDocuments();
  
  const [deleteDialog, setDeleteDialog] = useState<DialogState>({ isOpen: false });

  const deleteLoadMutation = useDeleteLoad();
  const updateStatusMutation = useUpdateLoadStatus();

  const statusColors = {
    draft: "bg-gray-100 text-gray-800 border-gray-200",
    booked: "bg-blue-100 text-blue-800 border-blue-200",
    dispatched: "bg-yellow-100 text-yellow-800 border-yellow-200",
    in_transit: "bg-purple-100 text-purple-800 border-purple-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelled: "bg-red-100 text-red-800 border-red-200"
  };

  const statusLabels = {
    draft: "Borrador",
    booked: "Reservada",
    dispatched: "Enviada",
    in_transit: "En Tránsito",
    delivered: "Entregada",
    completed: "Completada",
    cancelled: "Cancelada"
  };

  const getStatusActions = (currentStatus: string) => {
    const actions = [];
    
    switch (currentStatus) {
      case 'draft':
        actions.push({ 
          status: 'booked', 
          label: 'Marcar como Reservada', 
          icon: <CheckCircle className="h-3 w-3 mr-2" />,
          disabled: false 
        });
        break;
      case 'booked':
        actions.push({ 
          status: 'dispatched', 
          label: 'Marcar como Enviada', 
          icon: <Play className="h-3 w-3 mr-2" />,
          disabled: false 
        });
        break;
      case 'dispatched':
        actions.push({ 
          status: 'in_transit', 
          label: 'Marcar En Tránsito', 
          icon: <Play className="h-3 w-3 mr-2" />,
          disabled: false 
        });
        break;
      case 'in_transit':
        actions.push({ 
          status: 'delivered', 
          label: 'Marcar como Entregada', 
          icon: <CheckCircle className="h-3 w-3 mr-2" />,
          disabled: false 
        });
        break;
      case 'delivered':
        actions.push({ 
          status: 'completed', 
          label: 'Marcar como Completada', 
          icon: <CheckCircle className="h-3 w-3 mr-2" />,
          disabled: false 
        });
        break;
    }

    if (!['completed', 'cancelled'].includes(currentStatus)) {
      actions.push({ 
        status: 'cancelled', 
        label: 'Cancelar Carga', 
        icon: <XCircle className="h-3 w-3 mr-2" />,
        disabled: false 
      });
    }

    return actions;
  };

  const handleUpdateStatus = async (loadId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ loadId, newStatus });
    } catch (error) {
      console.error('Error updating load status:', error);
    }
  };

  const handleDeleteLoad = () => {
    if (deleteDialog.load) {
      deleteLoadMutation.mutate(deleteDialog.load.id, {
        onSuccess: () => {
          setDeleteDialog({ isOpen: false });
        }
      });
    }
  };

  const filteredLoads = loads.filter(load => {
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || load.status === selectedStatus;
    const matchesSearch = !searchQuery || 
      load.load_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.broker_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.pickup_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.delivery_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.commodity?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBroker = !selectedBroker || load.broker_id === selectedBroker;
    const matchesDriver = !selectedDriver || load.driver_id === selectedDriver;
    
    let matchesPeriod = true;
    if (selectedPeriod && selectedPeriod.type !== 'all') {
      if (selectedPeriod.type === 'current' || selectedPeriod.type === 'previous' || selectedPeriod.type === 'next') {
        matchesPeriod = load.period_status === 'open' || load.period_status === 'closed';
      }
    }
    
    return matchesStatus && matchesSearch && matchesBroker && matchesDriver && matchesPeriod;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 bg-muted rounded w-28"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredLoads.length === 0) {
    return (
      <EmptyLoadsState 
        onCreateLoad={onCreateLoad || (() => {})}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {filteredLoads.map((load) => (
          <Card key={load.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <CardTitle className="text-lg font-semibold">
                      {load.load_number}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (PO#: {load.po_number || ''})
                      </span>
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Documentos:
                      </span>
                      <LoadDocumentsList 
                        loadId={load.id} 
                        maxItems={3}
                        showActions={false}
                        refreshTrigger={refreshTrigger}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {load.pickup_city} → {load.delivery_city}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(load.total_amount)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={statusColors[load.status as keyof typeof statusColors]}
                  >
                    {statusLabels[load.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Broker / Cliente
                  </label>
                  <p className="text-sm font-medium">{load.broker_name}</p>
                  {load.dispatcher_name && (
                    <p className="text-xs text-muted-foreground">Contacto: {load.dispatcher_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Conductor Asignado
                  </label>
                  <p className="text-sm font-medium">
                    {load.driver_name || (
                      <span className="text-muted-foreground italic">Sin asignar</span>
                    )}
                  </p>
                  {load.internal_dispatcher_name && (
                    <p className="text-xs text-muted-foreground">Dispatcher: {load.internal_dispatcher_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Commodity
                  </label>
                  <p className="text-sm font-medium">{load.commodity}</p>
                  <p className="text-xs text-muted-foreground">{load.weight_lbs?.toLocaleString()} lbs</p>
                </div>
              </div>
              
              <div className="mb-3 pb-3 border-b border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Período de Pago
                  </label>
                  <PaymentPeriodInfo
                    periodStartDate={load.period_start_date}
                    periodEndDate={load.period_end_date}
                    periodFrequency={load.period_frequency}
                    periodStatus={load.period_status}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Creada: {formatDateTime(load.created_at)}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('Ver load:', load.load_number)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => console.log('Editar load:', load.load_number)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          console.log('🔥 DROPDOWN CLICKED for load:', load.load_number);
                          e.stopPropagation();
                        }}
                        onMouseEnter={() => console.log('🔥 DROPDOWN HOVER for load:', load.load_number)}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {getStatusActions(load.status).map((action) => (
                        <DropdownMenuItem
                          key={action.status}
                          onClick={() => handleUpdateStatus(load.id, action.status)}
                          disabled={action.disabled || updateStatusMutation.isPending}
                        >
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      
                      {getStatusActions(load.status).length > 0 && (
                        <div className="border-t my-1" />
                      )}

                      <DropdownMenuItem 
                        onClick={() => console.log('Duplicar:', load.load_number)}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Duplicar Carga
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => console.log('Reasignar:', load.load_number)}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-2" />
                        Reasignar Período
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => console.log('Documentos:', load.load_number)}
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        Gestionar Documentos
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialog({ 
                          isOpen: true, 
                          load 
                        })}
                        disabled={['in_transit', 'delivered', 'completed'].includes(load.status)}
                        className="text-destructive focus:text-destructive disabled:text-muted-foreground disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Eliminar Carga
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la carga 
              {deleteDialog.load?.load_number && ` "${deleteDialog.load.load_number}"`} 
              y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLoad}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}