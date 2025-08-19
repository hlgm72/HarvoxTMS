import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Edit, MapPin, DollarSign, Calendar, MoreHorizontal, ArrowRightLeft, Loader2, FileText, Trash2, Copy, Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { formatDateTimeAuto } from '@/lib/dateFormatting';
import { useLoads } from "@/hooks/useLoads";
import { useDeleteLoad } from "@/hooks/useDeleteLoad";
import { useUpdateLoadStatusWithValidation } from "@/hooks/useUpdateLoadStatusWithValidation";
import { useLoadDocumentValidation } from "@/hooks/useLoadDocumentValidation";
import { PeriodFilterValue } from "./PeriodFilter";
import PaymentPeriodInfo from "./PaymentPeriodInfo";
import PeriodReassignmentDialog from "./PeriodReassignmentDialog";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { EmptyLoadsState } from "./EmptyLoadsState";
import { CreateLoadDialog } from "./CreateLoadDialog";
import { LoadViewDialog } from "./LoadViewDialog";
import { LoadDocumentsList } from "./LoadDocumentsList";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";
import { LoadDocumentValidationIndicator } from "./LoadDocumentValidationIndicator";
import { LoadDocumentStatusIndicator } from "./LoadDocumentStatusIndicator";
import { LoadStatusHistoryButton } from "./LoadStatusHistoryButton";

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
const LoadingState = ({ t }: { t: any }) => (
  <div className="space-y-4">
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="text-lg font-medium">{t('list.loading')}</div>
      </div>
      <div className="text-sm text-muted-foreground animate-pulse">
        {t('list.getting_data')}
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

const getStatusLabel = (status: string, t: any) => {
  return t(`status.${status}`) || status;
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
  const { t } = useTranslation('loads');
  const { refreshTrigger } = useLoadDocuments();
  
  // console.log('📋 LoadsList - periodFilter recibido:', periodFilter);
  // console.log('📋 LoadsList - filters recibido:', filters);
  
  // Convertir el filtro de períodos al formato que espera el hook useLoads
  const loadsFilters = periodFilter ? {
    periodFilter: {
      type: periodFilter.type,
      periodId: periodFilter.periodId,
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate
    }
  } : undefined;
  
  // console.log('📋 LoadsList - loadsFilters enviado a useLoads:', loadsFilters);
  
  const { data: loads = [], isLoading, error } = useLoads(loadsFilters);
  
  // console.log('📋 LoadsList - Resultado useLoads:', { 
  //   loadsCount: loads?.length || 0, 
  //   isLoading, 
  //   error: error?.message || 'No error' 
  // });
  const deleteLoadMutation = useDeleteLoad();
  const updateStatusMutation = useUpdateLoadStatusWithValidation();
  
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

  const handleUpdateStatus = async (loadId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        loadId,
        newStatus
      });
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  const getStatusActions = (currentStatus: string, loadId: string) => {
    const actions: { status: string; label: string; icon: React.ReactNode; disabled?: boolean; warning?: string }[] = [];
    
    switch (currentStatus) {
      case 'draft':
      case 'open':
      case 'created':
        actions.push(
          { status: 'assigned', label: t('actions.assign_status'), icon: <Play className="h-3 w-3 mr-2" /> },
          { status: 'cancelled', label: t('actions.cancel_status'), icon: <XCircle className="h-3 w-3 mr-2" /> }
        );
        break;
      case 'assigned':
        actions.push(
          { status: 'in_transit', label: t('actions.in_transit_status'), icon: <Play className="h-3 w-3 mr-2" /> },
          { status: 'cancelled', label: t('actions.cancel_status'), icon: <XCircle className="h-3 w-3 mr-2" /> }
        );
        break;
      case 'in_progress':
      case 'in_transit':
        actions.push(
          { status: 'delivered', label: t('actions.delivered_status'), icon: <CheckCircle className="h-3 w-3 mr-2" /> },
          { status: 'cancelled', label: t('actions.cancel_status'), icon: <XCircle className="h-3 w-3 mr-2" /> }
        );
        break;
      case 'delivered':
        actions.push(
          { status: 'completed', label: t('actions.complete_status'), icon: <CheckCircle className="h-3 w-3 mr-2" /> }
        );
        break;
      case 'completed':
        actions.push(
          { status: 'in_transit', label: t('actions.reopen_status'), icon: <Clock className="h-3 w-3 mr-2" /> }
        );
        break;
    }
    
    return actions;
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
    return <LoadingState t={t} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{t('list.error_loading')} {error.message}</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredLoads.map((load) => (
          <Card key={load.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <CardTitle className="text-lg font-semibold">
                      Load #{load.load_number}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (PO #{load.po_number || ''})
                      </span>
                    </CardTitle>
                    
                    {/* Documentos Subidos al lado del PO# */}
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                         {t('list.documents')}
                       </span>
                      <LoadDocumentValidationIndicator 
                        loadId={load.id} 
                        loadStatus={load.status}
                        compact={true}
                      />
                      <LoadDocumentsList 
                        loadId={load.id} 
                        maxItems={3}
                        showActions={false}
                        refreshTrigger={refreshTrigger}
                      />
                      <LoadDocumentStatusIndicator 
                        loadId={load.id}
                        showDetails={false}
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
                      <span>
                        {formatCurrency(load.total_amount)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({[
                            load.leasing_percentage && load.leasing_percentage > 0 ? 
                              `L${load.leasing_percentage}%-${formatCurrency((load.total_amount || 0) * (load.leasing_percentage || 0) / 100)}` : null,
                            load.factoring_percentage && load.factoring_percentage > 0 ? 
                              `F${load.factoring_percentage}%-${formatCurrency((load.total_amount || 0) * (load.factoring_percentage || 0) / 100)}` : null,
                            load.dispatching_percentage && load.dispatching_percentage > 0 ? 
                              `D${load.dispatching_percentage}%-${formatCurrency((load.total_amount || 0) * (load.dispatching_percentage || 0) / 100)}` : null
                          ].filter(Boolean).join(', ')})
                        </span>
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Badge 
                     variant="outline" 
                     className={statusColors[load.status as keyof typeof statusColors]}
                   >
                     {getStatusLabel(load.status, t)}
                   </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                   <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                     {t('list.broker_client')}
                   </label>
                  <div className="flex items-center gap-3 mt-1">
                    {load.broker_logo_url ? (
                      <img 
                        src={load.broker_logo_url} 
                        alt={t('list.logo_alt', { brokerName: load.broker_name })}
                        className="h-8 w-8 rounded object-contain bg-white border border-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted border border-border flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {load.broker_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{load.broker_name}</p>
                       {load.dispatcher_name && (
                          <p className="text-xs text-muted-foreground">{t('list.contact')} {load.dispatcher_name}</p>
                        )}
                    </div>
                  </div>
                </div>
                
                <div>
                   <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                     {t('list.assigned_driver')}
                   </label>
                  <div className="flex items-center gap-3 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={load.driver_avatar_url || ''} 
                        alt={load.driver_name || t('list.not_assigned')} 
                      />
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                        {load.driver_name ? 
                          load.driver_name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                          '?'
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                         {load.driver_name || (
                           <span className="text-muted-foreground italic">{t('list.not_assigned')}</span>
                         )}
                      </p>
                       {load.internal_dispatcher_name && (
                          <p className="text-xs text-muted-foreground">{t('list.dispatcher')} {load.internal_dispatcher_name}</p>
                        )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('list.commodity')}
                  </label>
                  <p className="text-sm font-medium">{load.commodity}</p>
                  <p className="text-xs text-muted-foreground">{load.weight_lbs?.toLocaleString()} lbs</p>
                </div>
              </div>
              
              {/* Información del período de pago */}
              <div className="mb-3 pb-3 border-b border-border">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    {t('list.payment_period')}
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
                  {t('list.created')} {formatDateTimeAuto(load.created_at)}
                </div>
                
                <div className="flex gap-2 relative z-20">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewDialog({ isOpen: true, load })}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('list.view')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditDialog({ isOpen: true, load })}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('list.edit')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-lg z-40">
                      {/* Opciones de cambio de estado */}
                      {getStatusActions(load.status, load.id).map((action) => (
                        <DropdownMenuItem
                          key={action.status}
                          onClick={() => handleUpdateStatus(load.id, action.status)}
                          disabled={action.disabled || updateStatusMutation.isPending}
                        >
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      
                      {getStatusActions(load.status, load.id).length > 0 && (
                        <div className="border-t my-1" />
                      )}

                      <DropdownMenuItem 
                        onClick={() => setDuplicateDialog({ 
                          isOpen: true, 
                          load 
                        })}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        {t('list.duplicate_load')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setReassignmentDialog({ 
                          isOpen: true, 
                          load 
                        })}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-2" />
                        {t('list.reassign_period')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDocumentsDialog({ 
                          isOpen: true, 
                          load 
                        })}
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        {t('list.manage_documents')}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // The LoadStatusHistoryButton will handle the dialog
                        }}
                        className="p-0"
                      >
                        <LoadStatusHistoryButton
                          loadId={load.id}
                          loadNumber={load.load_number}
                          variant="ghost"
                          size="sm"
                          showText={true}
                        />
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
                        {t('list.delete_load')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
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
          loadData={documentsDialog.load}
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
            <AlertDialogTitle>{t('list.confirm_deletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('list.deletion_warning', { loadNumber: deleteDialog.load?.load_number })}
              <br /><br />
              <span className="text-destructive font-medium">{t('list.deletion_irreversible')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoadMutation.isPending}>
              {t('list.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.load && handleDeleteLoad(deleteDialog.load.id)}
              disabled={deleteLoadMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('list.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('list.delete_load')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}