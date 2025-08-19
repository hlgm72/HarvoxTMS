import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { useDeleteFuelExpense, useFuelExpenses } from '@/hooks/useFuelExpenses';
import { useToast } from '@/components/ui/use-toast';
import { formatDateAuto, formatCurrency } from '@/lib/dateFormatting';

export const FuelExpenseCleanup = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const { toast } = useToast();
  
  // Get recent fuel expenses (from last 2 hours)
  const { data: fuelExpenses, isLoading } = useFuelExpenses();
  const deleteFuelExpense = useDeleteFuelExpense();

  // Filter expenses created in the last 2 hours
  const recentExpenses = fuelExpenses?.filter(expense => {
    const createdAt = new Date(expense.created_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return createdAt >= twoHoursAgo && expense.status === 'pending';
  }) || [];

  const handleDeleteRecentExpenses = async () => {
    if (recentExpenses.length === 0) {
      toast({
        title: "Sin transacciones",
        description: "No hay transacciones recientes para eliminar",
        variant: "default",
      });
      return;
    }

    setIsDeleting(true);
    let successCount = 0;

    try {
      for (const expense of recentExpenses) {
        try {
          await deleteFuelExpense.mutateAsync(expense.id);
          successCount++;
        } catch (error) {
          console.error(`Error eliminando transacción ${expense.id}:`, error);
        }
      }

      setDeletedCount(successCount);
      
      toast({
        title: "Eliminación completada",
        description: `Se eliminaron ${successCount} de ${recentExpenses.length} transacciones`,
        variant: successCount === recentExpenses.length ? "default" : "destructive",
      });

    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Cargando transacciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Limpieza de Transacciones con Fechas Incorrectas
        </CardTitle>
        <CardDescription>
          Eliminar transacciones de combustible importadas recientemente con problemas de zona horaria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentExpenses.length > 0 ? (
          <>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium mb-3">
                📊 Transacciones encontradas: {recentExpenses.length}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{expense.vehicle?.equipment_number || 'Sin vehículo'}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatDateAuto(expense.transaction_date)} - {expense.station_name}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(expense.total_amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium">
                  Total: {formatCurrency(recentExpenses.reduce((sum, exp) => sum + exp.total_amount, 0))}
                </p>
              </div>
            </div>

            <Button
              onClick={handleDeleteRecentExpenses}
              disabled={isDeleting}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Eliminando...' : `Eliminar ${recentExpenses.length} transacciones`}
            </Button>

            {deletedCount > 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-4 w-4" />
                <span>Se eliminaron {deletedCount} transacciones exitosamente</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-green-700">
              No hay transacciones recientes para eliminar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Todas las transacciones de combustible están correctas
            </p>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">ℹ️ Información importante:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Solo se eliminarán transacciones creadas en las últimas 2 horas</li>
            <li>Solo transacciones con estado "pending"</li>
            <li>Después de eliminar, puedes volver a importar el PDF con las fechas corregidas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};