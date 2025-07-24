import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ExpenseInstancesView() {
  const { user } = useAuth();

  // Obtener instancias de gastos de la empresa
  const { data: expenseInstances = [], isLoading } = useQuery({
    queryKey: ['expense-instances', user?.user_metadata?.company_id],
    queryFn: async () => {
      if (!user?.user_metadata?.company_id) return [];

      // Por ahora, retornamos un array vacío hasta que se implemente completamente
      const { data, error } = await supabase
        .from('expense_instances')
        .select(`
          *,
          expense_types(name, category)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching expense instances:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.user_metadata?.company_id,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planned': return 'secondary';
      case 'applied': return 'default';
      case 'deferred': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'planned': 'Planificado',
      'applied': 'Aplicado',
      'deferred': 'Diferido',
      'cancelled': 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'deferred': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Cargando instancias de gastos...</div>
        </CardContent>
      </Card>
    );
  }

  if (expenseInstances.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48">
          <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-center">
            No hay instancias de gastos generadas aún
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Las instancias se generan automáticamente cuando se procesan los períodos de pago
          </p>
        </CardContent>
      </Card>
    );
  }

  // Estadísticas
  const appliedInstances = expenseInstances.filter(i => i.status === 'applied');
  const deferredInstances = expenseInstances.filter(i => i.status === 'deferred');
  const plannedInstances = expenseInstances.filter(i => i.status === 'planned');

  const totalAppliedAmount = appliedInstances.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalDeferredAmount = deferredInstances.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplicados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appliedInstances.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalAppliedAmount.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diferidos</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deferredInstances.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalDeferredAmount.toLocaleString('es-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planificados</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plannedInstances.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instancias</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseInstances.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Instancias */}
      <div className="grid gap-4">
        {expenseInstances.map((instance) => (
          <Card key={instance.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(instance.status)}
                    {instance.expense_types?.name || 'Tipo no definido'}
                  </CardTitle>
                  <CardDescription>
                    {instance.description || 'Sin descripción'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    ${(instance.amount || 0).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(instance.status)}>
                    {getStatusLabel(instance.status)}
                  </Badge>
                  {instance.is_critical && (
                    <Badge variant="destructive">Crítico</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha del Gasto</p>
                  <p className="font-medium">
                    {instance.expense_date 
                      ? format(new Date(instance.expense_date), 'dd MMM yyyy', { locale: es })
                      : 'No definida'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prioridad</p>
                  <p className="font-medium">{instance.priority || 'Normal'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoría</p>
                  <p className="font-medium">{instance.expense_types?.category || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha de Aplicación</p>
                  <p className="font-medium">
                    {instance.applied_at 
                      ? format(new Date(instance.applied_at), 'dd MMM yyyy HH:mm', { locale: es })
                      : 'No aplicado'
                    }
                  </p>
                </div>
              </div>
              {instance.notes && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{instance.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}