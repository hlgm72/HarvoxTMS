import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatPaymentPeriod, formatDeductionDate } from "@/lib/dateFormatting";
import { Trash2, AlertTriangle, Calendar, DollarSign, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventualDeductionsListProps {
  onRefresh: () => void;
}

export function EventualDeductionsList({ onRefresh }: EventualDeductionsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deletingExpense, setDeletingExpense] = useState<any>(null);
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Obtener deducciones eventuales
  const { data: eventualDeductions = [], refetch } = useQuery({
    queryKey: ['eventual-deductions'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('expense_instances')
          .select(`
            *,
            expense_types(name)
          `)
          .is('recurring_template_id', null) // Solo gastos eventuales (sin plantilla)
          .order('expense_date', { ascending: false });

        if (error) throw error;
        
        // Get driver info separately for each expense
        const expensesWithDriverInfo = await Promise.all(
          (data || []).map(async (expense) => {
            // Get driver calculation to find the driver
            const { data: driverCalc } = await supabase
              .from('driver_period_calculations')
              .select(`
                driver_user_id,
                company_payment_period_id,
                company_payment_periods:company_payment_period_id(
                  period_start_date,
                  period_end_date,
                  period_frequency
                )
              `)
              .eq('id', expense.payment_period_id)
              .single();

            if (!driverCalc) return { ...expense, driver_period_calculations: null };

            // Get driver profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', driverCalc.driver_user_id)
              .single();

            return {
              ...expense,
              driver_period_calculations: {
                ...driverCalc,
                profiles: profile
              }
            };
          })
        );

        return expensesWithDriverInfo;
      } catch (error) {
        console.error('Error fetching eventual deductions:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });

  // Obtener lista de conductores para filtro
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-for-filter'],
    queryFn: async () => {
      try {
        const { data: companyDrivers, error: driversError } = await supabase
          .from('company_drivers')
          .select('user_id')
          .eq('is_active', true);

        if (driversError) throw driversError;
        if (!companyDrivers || companyDrivers.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', companyDrivers.map(d => d.user_id));

        if (profilesError) throw profilesError;
        return profiles || [];
      } catch (error) {
        console.error('Error fetching drivers:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    refetch();
  }, [onRefresh, refetch]);

  // Filtrar deducciones
  const filteredDeductions = eventualDeductions.filter(deduction => {
    const driverMatch = filterDriver === 'all' || 
      deduction.driver_period_calculations?.driver_user_id === filterDriver;
    const statusMatch = filterStatus === 'all' || deduction.status === filterStatus;
    
    return driverMatch && statusMatch;
  });

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
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Filtrar por Conductor</Label>
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los conductores</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.user_id} value={driver.user_id}>
                  {driver.first_name} {driver.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Filtrar por Estado</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="planned">Planificado</SelectItem>
              <SelectItem value="applied">Aplicado</SelectItem>
              <SelectItem value="deferred">Diferido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de deducciones */}
      <div className="grid gap-4">
        {filteredDeductions.map((deduction) => (
          <Card key={deduction.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {deduction.driver_period_calculations?.profiles?.first_name} {' '}
                    {deduction.driver_period_calculations?.profiles?.last_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Período: {' '}
                    {deduction.driver_period_calculations?.company_payment_periods && 
                      formatPaymentPeriod(
                        deduction.driver_period_calculations.company_payment_periods.period_start_date,
                        deduction.driver_period_calculations.company_payment_periods.period_end_date
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
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">${deduction.amount}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo: </span>
                    <span className="text-sm font-medium">{deduction.expense_types?.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Fecha: </span>
                    <span className="text-sm">
                      {formatDeductionDate(deduction.expense_date)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Prioridad: </span>
                    <span className="text-sm font-medium">{deduction.priority}/10</span>
                  </div>
                  {deduction.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">Descripción: </span>
                      <p className="text-sm">{deduction.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingExpense(deduction)}
                  className="text-destructive hover:text-destructive"
                  disabled={deduction.status === 'applied'}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
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