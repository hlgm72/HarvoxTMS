import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useOtherIncome, useCreateOtherIncome, useUpdateOtherIncome, useDeleteOtherIncome } from "@/hooks/useOtherIncome";
import { useATMInput } from "@/hooks/useATMInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Plus, 
  DollarSign, 
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  FileText,
  Loader2
} from "lucide-react";
import { formatDateOnly } from '@/lib/dateFormatting';

interface OtherIncomeItem {
  id: string;
  description: string;
  amount: number;
  income_type: string;
  income_date: string;
  status: string;
  driver_user_id: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export function OtherIncomeSection() {
  const { user, isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers: companyDrivers = [] } = useCompanyDrivers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OtherIncomeItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OtherIncomeItem | null>(null);
  const deleteOtherIncome = useDeleteOtherIncome();

  // Cargar datos reales de otros ingresos
  const { data: incomeData = [], isLoading } = useOtherIncome({
    driverId: isDriver ? user?.id : undefined
  });

  // Helper function para obtener el nombre del conductor
  const getDriverName = (driverUserId: string) => {
    const driver = companyDrivers.find(d => d.user_id === driverUserId);
    if (driver) {
      const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
      return fullName || 'Sin nombre';
    }
    return 'Conductor no encontrado';
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
      reimbursement: "Reembolso",
      compensation: "Compensación",
      overtime: "Horas Extra",
      allowance: "Asignación",
      other: "Otro"
    };
    return types[type] || type;
  };

  const handleViewItem = (item: OtherIncomeItem) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleDeleteItem = async (item: OtherIncomeItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteOtherIncome.mutateAsync(itemToDelete.id);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error("Error deleting other income:", error);
      }
    }
  };

  // Los datos ya están filtrados por el hook según el rol
  const displayData = incomeData;

  const totalPending = displayData.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const totalApproved = displayData.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Cargando otros ingresos...</span>
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
                <p className="text-xl font-semibold">${totalApproved.toLocaleString()}</p>
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
                <p className="text-xl font-semibold">${totalPending.toLocaleString()}</p>
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
                <p className="text-xl font-semibold">${(totalApproved + totalPending).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de otros ingresos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Otros Ingresos
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Ingreso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle>Nuevo Ingreso</DialogTitle>
                </DialogHeader>
                <CreateOtherIncomeForm onClose={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha</TableHead>
                {!isDriver && <TableHead>Conductor</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDriver ? 6 : 7} className="text-center text-muted-foreground py-8">
                    No hay registros de otros ingresos
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{getIncomeTypeLabel(item.income_type)}</TableCell>
                    <TableCell className="font-semibold">${item.amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{formatDateOnly(item.income_date)}</TableCell>
                    {!isDriver && <TableCell>{getDriverName(item.driver_user_id)}</TableCell>}
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
                              disabled={deleteOtherIncome.isPending}
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
            <DialogTitle>Detalles del Ingreso</DialogTitle>
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
            <AlertDialogTitle>¿Eliminar ingreso adicional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el ingreso "{itemToDelete?.description}" 
              por ${itemToDelete?.amount.toLocaleString()}. El período del conductor será 
              recalculado automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteOtherIncome.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOtherIncome.isPending ? (
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

// Componente para crear nuevo ingreso
function CreateOtherIncomeForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers: companyDrivers = [], loading: driversLoading } = useCompanyDrivers();
  const createOtherIncome = useCreateOtherIncome();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    income_type: "",
    income_date: null as Date | null,
    driver_user_id: "",
    reference_number: "",
    notes: ""
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: () => {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.driver_user_id || !formData.income_date) {
      console.error("Driver or date not selected");
      return;
    }

    try {
      await createOtherIncome.mutateAsync({
        driver_user_id: formData.driver_user_id,
        description: formData.description,
        amount: atmInput.numericValue,
        income_type: formData.income_type,
        income_date: formData.income_date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        status: 'pending'
      });
      onClose();
    } catch (error) {
      console.error("Error creating other income:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="driver">Conductor *</Label>
        <Select 
          value={formData.driver_user_id} 
          onValueChange={(value) => setFormData({ ...formData, driver_user_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar conductor" />
          </SelectTrigger>
          <SelectContent>
            {driversLoading ? (
              <SelectItem value="loading" disabled>Cargando conductores...</SelectItem>
            ) : companyDrivers.length === 0 ? (
              <SelectItem value="no-drivers" disabled>No hay conductores disponibles</SelectItem>
            ) : (
              companyDrivers.map((driver) => (
                <SelectItem key={driver.user_id} value={driver.user_id}>
                  {`${driver.first_name || ''} ${driver.last_name || ''}`.trim() || driver.user_id}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Descripción *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descripción del ingreso"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Monto *</Label>
          <Input
            id="amount"
            value={atmInput.displayValue}
            onKeyDown={atmInput.handleKeyDown}
            onPaste={atmInput.handlePaste}
            placeholder="$0.00"
            readOnly
            className="text-right"
            required
          />
        </div>
        <div>
          <Label>Fecha *</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !formData.income_date && "text-muted-foreground"
                )}
              >
                {formData.income_date ? (
                  format(formData.income_date, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4 bg-white">
                {/* Selectores de mes y año */}
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={formData.income_date ? format(formData.income_date, 'MMMM', { locale: es }) : format(new Date(), 'MMMM', { locale: es })}
                    onValueChange={(monthName) => {
                      const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                        .indexOf(monthName.toLowerCase());
                      if (monthIndex !== -1) {
                        const currentYear = formData.income_date?.getFullYear() || new Date().getFullYear();
                        const currentDay = formData.income_date?.getDate() || new Date().getDate();
                        setFormData({ ...formData, income_date: new Date(currentYear, monthIndex, currentDay) });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enero">Enero</SelectItem>
                      <SelectItem value="febrero">Febrero</SelectItem>
                      <SelectItem value="marzo">Marzo</SelectItem>
                      <SelectItem value="abril">Abril</SelectItem>
                      <SelectItem value="mayo">Mayo</SelectItem>
                      <SelectItem value="junio">Junio</SelectItem>
                      <SelectItem value="julio">Julio</SelectItem>
                      <SelectItem value="agosto">Agosto</SelectItem>
                      <SelectItem value="septiembre">Septiembre</SelectItem>
                      <SelectItem value="octubre">Octubre</SelectItem>
                      <SelectItem value="noviembre">Noviembre</SelectItem>
                      <SelectItem value="diciembre">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={formData.income_date?.getFullYear()?.toString() || new Date().getFullYear().toString()}
                    onValueChange={(year) => {
                      const currentMonth = formData.income_date?.getMonth() || new Date().getMonth();
                      const currentDay = formData.income_date?.getDate() || new Date().getDate();
                      setFormData({ ...formData, income_date: new Date(parseInt(year), currentMonth, currentDay) });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Calendar */}
                <Calendar
                  mode="single"
                  selected={formData.income_date || undefined}
                  onSelect={(date) => {
                    setFormData({ ...formData, income_date: date || null });
                    setIsDatePickerOpen(false);
                  }}
                  month={formData.income_date || undefined}
                  onMonthChange={(date) => setFormData({ ...formData, income_date: date })}
                  className="p-0 pointer-events-auto"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="incomeType">Tipo de Ingreso *</Label>
        <Select value={formData.income_type} onValueChange={(value) => setFormData({ ...formData, income_type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bonus">Bonificación</SelectItem>
            <SelectItem value="reimbursement">Reembolso</SelectItem>
            <SelectItem value="compensation">Compensación</SelectItem>
            <SelectItem value="overtime">Horas Extra</SelectItem>
            <SelectItem value="allowance">Asignación</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="referenceNumber">Número de Referencia</Label>
        <Input
          id="referenceNumber"
          value={formData.reference_number}
          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
          placeholder="Opcional"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Información adicional..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          className="flex-1"
          disabled={createOtherIncome.isPending}
        >
          {createOtherIncome.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creando...
            </>
          ) : (
            'Crear Ingreso'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
}