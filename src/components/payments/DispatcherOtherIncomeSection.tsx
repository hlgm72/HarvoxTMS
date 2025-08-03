import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
import { useDispatcherOtherIncome, useDeleteDispatcherOtherIncome } from "@/hooks/useDispatcherOtherIncome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { formatDateOnly } from '@/lib/dateFormatting';

interface DispatcherOtherIncomeItem {
  id: string;
  description: string;
  amount: number;
  income_type: string;
  income_date: string;
  status: string;
  dispatcher_user_id: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export function DispatcherOtherIncomeSection() {
  const { user, isDispatcher, isOperationsManager, isCompanyOwner } = useAuth();
  const { data: companyDispatchers = [] } = useCompanyDispatchers();
  const [selectedItem, setSelectedItem] = useState<DispatcherOtherIncomeItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DispatcherOtherIncomeItem | null>(null);
  const deleteDispatcherOtherIncome = useDeleteDispatcherOtherIncome();

  // Cargar datos reales de otros ingresos de despachadores
  const { data: incomeData = [], isLoading } = useDispatcherOtherIncome({
    dispatcherId: isDispatcher ? user?.id : undefined
  });

  // Helper function para obtener el nombre del despachador
  const getDispatcherName = (dispatcherUserId: string) => {
    const dispatcher = companyDispatchers.find(d => d.user_id === dispatcherUserId);
    if (dispatcher) {
      const fullName = `${dispatcher.first_name || ''} ${dispatcher.last_name || ''}`.trim();
      return fullName || 'Sin nombre';
    }
    return 'Despachador no encontrado';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Aprobado</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIncomeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      bonus: "Bonificación",
      commission: "Comisión",
      reimbursement: "Reembolso",
      compensation: "Compensación",
      overtime: "Horas Extra",
      allowance: "Asignación",
      other: "Otro"
    };
    return types[type] || type;
  };

  const handleViewItem = (item: DispatcherOtherIncomeItem) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleDeleteItem = async (item: DispatcherOtherIncomeItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteDispatcherOtherIncome.mutateAsync(itemToDelete.id);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error("Error deleting dispatcher other income:", error);
      }
    }
  };

  const displayData = incomeData;
  const totalPending = displayData.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const totalApproved = displayData.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando ingresos de despachadores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aprobados</p>
                <p className="text-xl font-semibold">${totalApproved.toLocaleString('es-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-xl font-semibold">${totalPending.toLocaleString('es-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">${(totalApproved + totalPending).toLocaleString('es-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de otros ingresos de despachadores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ingresos Adicionales de Despachadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha</TableHead>
                {!isDispatcher && <TableHead>Despachador</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDispatcher ? 6 : 7} className="text-center text-muted-foreground py-8">
                    No hay registros de ingresos adicionales para despachadores
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{getIncomeTypeLabel(item.income_type)}</TableCell>
                    <TableCell className="font-semibold">${item.amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{formatDateOnly(item.income_date)}</TableCell>
                    {!isDispatcher && <TableCell>{getDispatcherName(item.dispatcher_user_id)}</TableCell>}
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(item.status === "pending" && (isOperationsManager || isCompanyOwner)) && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleDeleteItem(item)}
                              disabled={deleteDispatcherOtherIncome.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Ingreso de Despachador</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Descripción</Label>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm text-muted-foreground">{getIncomeTypeLabel(selectedItem.income_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Monto</Label>
                  <p className="text-sm font-semibold text-green-600">${selectedItem.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(selectedItem.income_date)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
                {selectedItem.reference_number && (
                  <div>
                    <Label className="text-sm font-medium">Referencia</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.reference_number}</p>
                  </div>
                )}
              </div>
              {selectedItem.notes && (
                <div>
                  <Label className="text-sm font-medium">Notas</Label>
                  <p className="text-sm text-muted-foreground">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ingreso adicional de despachador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el ingreso "{itemToDelete?.description}" 
              por ${itemToDelete?.amount.toLocaleString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteDispatcherOtherIncome.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDispatcherOtherIncome.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}