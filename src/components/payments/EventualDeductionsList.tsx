import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatPaymentPeriod, formatDetailedPaymentPeriod, formatDeductionDate, formatDateInUserTimeZone, convertUserDateToUTC } from "@/lib/dateFormatting";
import { Trash2, AlertTriangle, Calendar, DollarSign, User, FileText, Edit2, Lock } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { EventualDeductionDialog } from "./EventualDeductionDialog";
import { useTranslation } from 'react-i18next';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useCalculatedPeriods } from '@/hooks/useCalculatedPeriods';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EventualDeductionsListProps {
  onRefresh: () => void;
  filters?: {
    status: string;
    driver: string;
    expenseType: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
    periodFilter?: { 
      type: string;
      startDate?: string;
      endDate?: string;
      periodId?: string;
    };
  };
  viewConfig?: {
    density: string;
    sortBy: string;
    groupBy: string;
    showDriverInfo: boolean;
    showAmounts: boolean;
    showDates: boolean;
    showExpenseType: boolean;
  };
}

export function EventualDeductionsList({ onRefresh, filters, viewConfig }: EventualDeductionsListProps) {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { t } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const [deletingExpense, setDeletingExpense] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Obtener períodos calculados
  const { data: calculatedPeriods } = useCalculatedPeriods(userCompany?.company_id);

  // Obtener deducciones eventuales
  const { data: eventualDeductions = [], refetch } = useQuery({
    queryKey: ['eventual-deductions', user?.id, userCompany?.company_id, filters],
    queryFn: async () => {
      if (!user?.id || !userCompany?.company_id) {
        return [];
      }

      try {
        // ✅ Construir la consulta base - ahora incluye TODAS las deducciones del período
        // (eventuales + generadas desde plantillas recurrentes)
        let query = supabase
          .from('expense_instances')
          .select(`
            *,
            expense_types(name, category)
          `);

        // Aplicar filtros de estado
        if (filters?.status && filters.status !== 'all') {
          if (filters.status === 'planned') {
            query = query.eq('status', 'planned');
          } else {
            query = query.eq('status', filters.status);
          }
        }

        // Aplicar filtros de tipo de gasto
        if (filters?.expenseType && filters.expenseType !== 'all') {
          query = query.eq('expense_type_id', filters.expenseType);
        }

        // Aplicar filtros de conductor
        if (filters?.driver && filters.driver !== 'all') {
          query = query.eq('user_id', filters.driver);
        }

        // Aplicar filtro de período si está especificado
        if (filters?.periodFilter) {
          // ✅ CORREGIDO: Filtrar solo por fechas del período, sin incluir deducciones sin fecha
          if (filters.periodFilter.type === 'specific' && (filters.periodFilter as any).periodId) {
            const periodId = (filters.periodFilter as any).periodId;
            
            // Verificar si es un período calculado
            if (periodId.startsWith('calculated-')) {
              // Para períodos calculados, usar las fechas del filtro
              if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
                query = query
                  .gte('expense_date', filters.periodFilter.startDate)
                  .lte('expense_date', filters.periodFilter.endDate);
              } else {
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
              }
            } else {
              // Para períodos reales de BD, filtrar por payment_period_id
              query = query.eq('payment_period_id', periodId);
            }
          }
          // Si el filtro tiene fechas específicas, usarlas
          else if (filters.periodFilter.startDate && filters.periodFilter.endDate) {
            query = query
              .gte('expense_date', filters.periodFilter.startDate)
              .lte('expense_date', filters.periodFilter.endDate);
          }
          // Si es período actual, filtrar por fechas del período calculado
          else if (filters.periodFilter.type === 'current') {
            if (calculatedPeriods?.current) {
              const startDate = calculatedPeriods.current.period_start_date;
              const endDate = calculatedPeriods.current.period_end_date;
              
              query = query
                .gte('expense_date', startDate)
                .lte('expense_date', endDate);
            } else {
              query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }
          // Si es período anterior, filtrar por fechas del período calculado
          else if (filters.periodFilter.type === 'previous') {
            if (calculatedPeriods?.previous) {
              const startDate = calculatedPeriods.previous.period_start_date;
              const endDate = calculatedPeriods.previous.period_end_date;
              
              query = query
                .gte('expense_date', startDate)
                .lte('expense_date', endDate);
            } else {
              query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }
          // Para 'all', no aplicar filtro de período
          else if (filters.periodFilter.type === 'all') {
            // No aplicar filtro
          }
        } else {
          // Si no hay filtro de período, usar el período actual calculado por defecto
          if (calculatedPeriods?.current) {
            const startDate = calculatedPeriods.current.period_start_date;
            const endDate = calculatedPeriods.current.period_end_date;
            
            query = query
              .gte('expense_date', startDate)
              .lte('expense_date', endDate);
          }
        }

        // Aplicar filtros de fecha si existen (solo si no se aplicó filtro de período)
        if (!filters?.periodFilter && filters?.dateRange?.from && filters?.dateRange?.to) {

          // Validar que las fechas sean objetos Date válidos
          const fromDate = filters.dateRange.from instanceof Date 
            ? filters.dateRange.from 
            : new Date(filters.dateRange.from);
          const toDate = filters.dateRange.to instanceof Date 
            ? filters.dateRange.to 
            : new Date(filters.dateRange.to);

          // Solo aplicar si las fechas son válidas
          if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
            const startUTC = convertUserDateToUTC(fromDate);
            const endUTC = convertUserDateToUTC(toDate);
            
            query = query
              .gte('expense_date', startUTC.split('T')[0])
              .lte('expense_date', endUTC.split('T')[0]);
          }
        }

        // Aplicar ordenación según viewConfig
        const sortBy = viewConfig?.sortBy || 'date_desc';
        switch (sortBy) {
          case 'amount_desc':
            query = query.order('amount', { ascending: false });
            break;
          case 'amount_asc':
            query = query.order('amount', { ascending: true });
            break;
          case 'date_asc':
            query = query.order('expense_date', { ascending: true });
            break;
          case 'status':
            query = query.order('status');
            break;
          default:
            query = query.order('expense_date', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }
        
        // Enriquecer con información de períodos y conductores
        const enrichedData = await Promise.all(
          (data || []).map(async (expense) => {
            // Solo obtener información del período si existe payment_period_id
            let driverPeriod = null;
            if (expense.payment_period_id) {
              const { data } = await supabase
                .from('user_payrolls')
                .select(`
                  period:company_payment_periods!company_payment_period_id(
                    period_start_date,
                    period_end_date,
                    period_frequency
                  )
                `)
                .eq('id', expense.payment_period_id)
                .maybeSingle();
              driverPeriod = data;
            }

            // Obtener información del conductor
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', expense.user_id)
              .maybeSingle();

            return {
              ...expense,
              period_data: driverPeriod, // Agregar datos del período aquí
              profiles: profile
            };
          })
        );

        return enrichedData;
      } catch (error) {
        console.error('Error fetching eventual deductions:', error);
        return [];
      }
    },
    enabled: !!user?.id && !!userCompany?.company_id
  });

  useEffect(() => {
    refetch();
  }, [onRefresh, refetch]);

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;

    try {
      const { error } = await supabase
        .from('expense_instances')
        .delete()
        .eq('id', deletingExpense.id);

      if (error) throw error;

      showSuccess(t("deductions.notifications.success"), t("deductions.period_dialog.success_deleted"));

      refetch();
      setDeletingExpense(null);
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showError(t("deductions.notifications.error"), error.message || t("deductions.period_dialog.error_delete"));
    }
  };

  const handleEditExpense = (expense: any) => {
    // Formatear los datos para el dialog de edición
    setEditingExpense({
      id: expense.id,
      user_id: expense.user_id,
      expense_type_id: expense.expense_type_id,
      amount: expense.amount,
      description: expense.description || '',
      expense_date: expense.expense_date,
      applied_to_role: expense.applied_to_role || 'driver'
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { variant: "outline" as const, label: t("deductions.status_labels.planned") },
      applied: { variant: "default" as const, label: t("deductions.status_labels.applied") },
      deferred: { variant: "secondary" as const, label: t("deductions.status_labels.deferred") }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canEdit = (expense: any) => {
    return expense.status === 'planned';
  };

  const isAutomaticDeduction = (expense: any) => {
    // Es automática si:
    // 1. Es una deducción de porcentaje (Factoring, Dispatching, Leasing)
    // 2. Fue generada desde una plantilla recurrente
    return expense.expense_types?.category === 'percentage_deduction' || 
           expense.recurring_template_id !== null;
  };

  if (eventualDeductions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {t("deductions.period_dialog.no_records_title", "No hay deducciones del período")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("deductions.period_dialog.no_records_description", "Las deducciones del período que crees aparecerán aquí")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lista de deducciones */}
      <div className="grid gap-4">
        {eventualDeductions.map((deduction) => (
          <Card key={deduction.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {deduction.profiles?.first_name} {' '}
                    {deduction.profiles?.last_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {deduction.period_data && 
                      formatDetailedPaymentPeriod(
                        deduction.period_data.period.period_start_date,
                        deduction.period_data.period.period_end_date,
                        deduction.period_data.period.period_frequency
                      )
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(deduction.status)}
                  {isAutomaticDeduction(deduction) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {t("deductions.status_labels.automatic")}
                    </Badge>
                  )}
                  {deduction.is_critical && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {t("deductions.status_labels.critical")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">${Number(deduction.amount).toFixed(2)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t("deductions.labels.type")}</span> <span className="font-medium">{deduction.expense_types?.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t("deductions.labels.date")}</span> <span>{formatDeductionDate(deduction.expense_date)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    {canEdit(deduction) && !isAutomaticDeduction(deduction) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditExpense(deduction)}
                        className="h-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {isAutomaticDeduction(deduction) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="h-8"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Las deducciones automáticas no se pueden editar</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    
                    {isAutomaticDeduction(deduction) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="text-destructive hover:text-destructive h-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Las deducciones automáticas no se pueden eliminar manualmente</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingExpense(deduction)}
                        className="text-destructive hover:text-destructive h-8"
                        disabled={deduction.status === 'applied'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TooltipProvider>
                </div>
              </div>

              {deduction.description && (
                <div className="pt-1">
                  <span className="text-sm text-muted-foreground">{t("deductions.labels.description")}</span>
                  <span className="text-sm ml-1">{deduction.description}</span>
                </div>
              )}
              
              {deduction.notes && (
                <div className="pt-1">
                  <span className="text-sm text-muted-foreground">{t("deductions.labels.notes")}</span>
                  <span className="text-sm ml-1">{deduction.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deductions.period_dialog.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deductions.period_dialog.delete_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deductions.labels.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground">
              {t("deductions.labels.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edición */}
      <EventualDeductionDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          refetch();
          setIsEditDialogOpen(false);
          setEditingExpense(null);
        }}
        editingDeduction={editingExpense}
      />
    </div>
  );
}