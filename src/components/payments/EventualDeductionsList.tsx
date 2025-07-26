import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatPaymentPeriod, formatDeductionDate } from "@/lib/dateFormatting";
import { Trash2, AlertTriangle, Calendar, DollarSign, User, FileText } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";

interface EventualDeductionsListProps {
  onRefresh: () => void;
  filters?: {
    status: string;
    driver: string;
    expenseType: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
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
  const { showSuccess, showError } = useFleetNotifications();
  const [deletingExpense, setDeletingExpense] = useState<any>(null);

  // Obtener deducciones eventuales
  const { data: eventualDeductions = [], refetch } = useQuery({
    queryKey: ['eventual-deductions', filters],
    queryFn: async () => {
      try {
        // Construir la consulta base
        let query = supabase
          .from('expense_instances')
          .select(`
            *,
            expense_types(name)
          `)
          .is('recurring_template_id', null); // Solo gastos eventuales (sin plantilla)

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

        // Aplicar filtros de fecha si existen
        if (filters?.dateRange?.from) {
          query = query.gte('expense_date', filters.dateRange.from.toISOString().split('T')[0]);
        }
        if (filters?.dateRange?.to) {
          query = query.lte('expense_date', filters.dateRange.to.toISOString().split('T')[0]);
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

        if (error) throw error;
        
        // Enriquecer con información de períodos y conductores
        const enrichedData = await Promise.all(
          (data || []).map(async (expense) => {
            // Obtener información del período
            const { data: period } = await supabase
              .from('company_payment_periods')
              .select('period_start_date, period_end_date, period_frequency')
              .eq('id', expense.payment_period_id)
              .single();

            // Obtener información del conductor
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', expense.driver_user_id)
              .single();

            return {
              ...expense,
              company_payment_periods: period,
              profiles: profile
            };
          })
        );

        // Aplicar filtro de conductor si está especificado
        if (filters?.driver && filters.driver !== 'all') {
          return enrichedData.filter(expense => 
            expense.driver_user_id === filters.driver
          );
        }

        return enrichedData;
      } catch (error) {
        console.error('Error fetching eventual deductions:', error);
        return [];
      }
    },
    enabled: !!user?.id
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

      toast({
        title: "Éxito",
        description: "Deducción eventual eliminada exitosamente",
      });

      refetch();
      setDeletingExpense(null);
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la deducción",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { variant: "outline" as const, label: "Planificado" },
      applied: { variant: "default" as const, label: "Aplicado" },
      deferred: { variant: "secondary" as const, label: "Diferido" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { variant: "outline" as const, label: status };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (eventualDeductions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No hay deducciones eventuales
        </h3>
        <p className="text-sm text-muted-foreground">
          Las deducciones eventuales que crees aparecerán aquí
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
                    Período: {' '}
                    {deduction.company_payment_periods && 
                      formatPaymentPeriod(
                        deduction.company_payment_periods.period_start_date,
                        deduction.company_payment_periods.period_end_date
                      )
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(deduction.status)}
                  {deduction.is_critical && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Crítico
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-lg">${deduction.amount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{deduction.expense_types?.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Fecha:</span> <span>{formatDeductionDate(deduction.expense_date)}</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingExpense(deduction)}
                  className="text-destructive hover:text-destructive h-8"
                  disabled={deduction.status === 'applied'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {deduction.description && (
                <div className="pt-1">
                  <span className="text-sm text-muted-foreground">Descripción:</span>
                  <span className="text-sm ml-1">{deduction.description}</span>
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
            <AlertDialogTitle>¿Eliminar deducción eventual?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La deducción eventual será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}