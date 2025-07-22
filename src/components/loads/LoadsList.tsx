import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Edit, MapPin, DollarSign, Calendar, MoreHorizontal, ArrowRightLeft, Loader2, FileText, Trash2, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLoads } from "@/hooks/useLoads";
import { useDeleteLoad } from "@/hooks/useDeleteLoad";
import { PeriodFilterValue } from "./PeriodFilter";
import PaymentPeriodInfo from "./PaymentPeriodInfo";
import PeriodReassignmentDialog from "./PeriodReassignmentDialog";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { EmptyLoadsState } from "./EmptyLoadsState";
import { CreateLoadDialog } from "./CreateLoadDialog";
import { LoadViewDialog } from "./LoadViewDialog";
import { LoadDocumentsList } from "./LoadDocumentsList";

// Componente de skeleton para cargas
const LoadSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-32"></div>
          <div className="flex items-center gap-4">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </div>
        <div className="h-6 bg-muted rounded w-16"></div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-16"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-28"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-18"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 bg-muted rounded w-32"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded w-16"></div>
          <div className="h-8 bg-muted rounded w-16"></div>
          <div className="h-8 bg-muted rounded w-8"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente de loading mejorado
const LoadingState = () => (
  <div className="space-y-4">
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-lg font-medium">Cargando cargas...</div>
      </div>
      <div className="text-sm text-muted-foreground animate-pulse">
        Obteniendo datos del período seleccionado
      </div>
    </div>
    
    {/* Skeletons de cargas */}
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <LoadSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Mock data - later will be replaced with real data from Supabase
const mockLoads = [
  {
    id: "1",
    load_number: "LD-2024-001",
    broker_name: "ABC Logistics",
    dispatcher_name: "Juan Pérez",
    driver_name: "María García",
    status: "in_transit",
    total_amount: 2500.00,
    pickup_date: "2024-01-15",
    delivery_date: "2024-01-17",
    pickup_city: "Houston, TX",
    delivery_city: "Dallas, TX",
    commodity: "Electronics",
    weight_lbs: 25000,
    created_at: "2024-01-14T10:00:00Z"
  },
  {
    id: "2", 
    load_number: "LD-2024-002",
    broker_name: "XYZ Freight",
    dispatcher_name: "Ana López",
    driver_name: null,
    status: "created",
    total_amount: 1800.00,
    pickup_date: "2024-01-20",
    delivery_date: "2024-01-22",
    pickup_city: "San Antonio, TX",
    delivery_city: "Austin, TX",
    commodity: "Food Products",
    weight_lbs: 35000,
    created_at: "2024-01-15T14:30:00Z"
  }
];

const statusColors = {
  created: "bg-slate-100 text-slate-700 border-slate-300",
  route_planned: "bg-blue-100 text-blue-700 border-blue-300",
  assigned: "bg-yellow-100 text-yellow-700 border-yellow-300",
  in_transit: "bg-orange-100 text-orange-700 border-orange-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300"
};

const statusLabels = {
  created: "Creada",
  route_planned: "Ruta Planificada", 
  assigned: "Asignada",
  in_transit: "En Tránsito",
  delivered: "Entregada",
  completed: "Completada"
};

interface LoadsListProps {
  filters: {
    status: string;
    driver: string;
    broker: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
  periodFilter?: PeriodFilterValue;
  onCreateLoad?: () => void;
}

export function LoadsList({ filters, periodFilter, onCreateLoad }: LoadsListProps) {
  const { t } = useTranslation();
  
  // Convertir el filtro de períodos al formato que espera el hook useLoads
  const loadsFilters = periodFilter ? {
    periodFilter: {
      type: periodFilter.type,
      periodId: periodFilter.periodId,
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate
    }
  } : undefined;
  
  const { data: loads = [], isLoading, error } = useLoads(loadsFilters);
  const deleteLoadMutation = useDeleteLoad();
  
  const [reassignmentDialog, setReassignmentDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });
  
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const [duplicateDialog, setDuplicateDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const [documentsDialog, setDocumentsDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const [viewDialog, setViewDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    load?: any;
  }>({ isOpen: false });

  const handleDeleteLoad = async (loadId: string) => {
    try {
      await deleteLoadMutation.mutateAsync(loadId);
      setDeleteDialog({ isOpen: false });
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };
  
  // Aplicar filtros a los datos reales
  const filteredLoads = loads.filter(load => {
    if (filters.status !== "all" && load.status !== filters.status) return false;
    if (filters.driver !== "all" && load.driver_name !== filters.driver) return false;
    if (filters.broker !== "all" && load.broker_name !== filters.broker) return false;
    
    // Filtro por rango de fechas
    if (filters.dateRange.from && filters.dateRange.to) {
      const loadDate = new Date(load.created_at);
      if (loadDate < filters.dateRange.from || loadDate > filters.dateRange.to) return false;
    }
    
    return true;
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error cargando cargas: {error.message}</div>
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
    <div className="space-y-4">
      {filteredLoads.map((load) => (
        <Card key={load.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">
                  {load.load_number}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (PO#: {load.po_number || ''})
                  </span>
                </CardTitle>
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
                <p className="text-xs text-muted-foreground mb-2">{load.weight_lbs?.toLocaleString()} lbs</p>
                
                <div className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                    Documentos Subidos
                  </label>
                  <LoadDocumentsList 
                    loadId={load.id} 
                    maxItems={3}
                    showActions={false}
                  />
                </div>
              </div>
            </div>
            
            {/* Información del período de pago */}
            <div className="mb-3 pb-3 border-b border-border">
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
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Creada: {format(new Date(load.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
              
               <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setViewDialog({ isOpen: true, load })}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditDialog({ isOpen: true, load })}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => setDuplicateDialog({ 
                          isOpen: true, 
                          load 
                        })}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Duplicar Carga
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setReassignmentDialog({ 
                          isOpen: true, 
                          load 
                        })}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-2" />
                        Reasignar Período
                      </DropdownMenuItem>
                       <DropdownMenuItem 
                         onClick={() => setDocumentsDialog({ 
                           isOpen: true, 
                           load 
                         })}
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
      
      {/* Dialog de reasignación */}
      {reassignmentDialog.load && (
        <PeriodReassignmentDialog
          isOpen={reassignmentDialog.isOpen}
          onClose={() => setReassignmentDialog({ isOpen: false })}
          element={{
            id: reassignmentDialog.load.id,
            type: 'load',
            name: reassignmentDialog.load.load_number,
            amount: reassignmentDialog.load.total_amount,
            currentPeriodId: reassignmentDialog.load.payment_period_id,
            driverUserId: reassignmentDialog.load.driver_user_id
          }}
        />
      )}
      
      {/* Dialog de edición */}
      {editDialog.load && (
        <CreateLoadDialog
          isOpen={editDialog.isOpen}
          onClose={() => setEditDialog({ isOpen: false })}
          mode="edit"
          loadData={editDialog.load}
        />
      )}

      {/* Dialog de duplicación */}
      {duplicateDialog.load && (
        <CreateLoadDialog
          isOpen={duplicateDialog.isOpen}
          onClose={() => setDuplicateDialog({ isOpen: false })}
          mode="duplicate"
          loadData={duplicateDialog.load}
        />
      )}

      {/* Dialog de gestión de documentos */}
      {documentsDialog.load && (
        <LoadDocumentsSection
          isDialogMode={true}
          isOpen={documentsDialog.isOpen}
          onClose={() => setDocumentsDialog({ isOpen: false })}
          loadId={documentsDialog.load.id}
          loadNumber={documentsDialog.load.load_number}
        />
      )}

      {/* Dialog de vista de detalles */}
      {viewDialog.load && (
        <LoadViewDialog
          isOpen={viewDialog.isOpen}
          onClose={() => setViewDialog({ isOpen: false })}
          load={viewDialog.load}
        />
      )}

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la carga <strong>{deleteDialog.load?.load_number}</strong> y todos sus datos asociados (paradas y documentos). 
              <br /><br />
              <span className="text-destructive font-medium">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoadMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.load && handleDeleteLoad(deleteDialog.load.id)}
              disabled={deleteLoadMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Carga
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}