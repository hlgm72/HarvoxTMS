import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useConsolidatedDispatchers } from "@/hooks/useConsolidatedDispatchers";
import { useOtherIncome, useCreateOtherIncome, useUpdateOtherIncome, useDeleteOtherIncome } from "@/hooks/useOtherIncome";
import { useATMInput } from "@/hooks/useATMInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency, formatPrettyDate, formatMonthName, formatDateInUserTimeZone } from '@/lib/dateFormatting';
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
import { UnifiedOtherIncomeForm } from './UnifiedOtherIncomeForm';
import { useTranslation } from "react-i18next";

interface OtherIncomeItem {
  id: string;
  description: string;
  amount: number;
  income_type: string;
  income_date: string;
  status: string;
  user_id: string;
  applied_to_role: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export function OtherIncomeSection({ hideAddButton = false }: { hideAddButton?: boolean }) {
  const { user, isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers: companyDrivers = [] } = useCompanyDrivers();
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OtherIncomeItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OtherIncomeItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<OtherIncomeItem | null>(null);
  const deleteOtherIncome = useDeleteOtherIncome();

  // Cargar datos reales de otros ingresos
  const { data: incomeData = [], isLoading } = useOtherIncome({
    driverId: isDriver ? user?.id : undefined
  });

  // Helper function para obtener el nombre del usuario según su rol
  const getUserName = (userId: string, role: string) => {
    if (role === 'driver') {
      const driver = companyDrivers.find(d => d.user_id === userId);
      if (driver) {
        const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
        return fullName || t('additional_payments.errors.no_name');
      }
      return t('additional_payments.errors.driver_not_found');
    } else if (role === 'dispatcher') {
      const dispatcher = dispatchers.find(d => d.id === userId);
      if (dispatcher) {
        const fullName = `${dispatcher.first_name || ''} ${dispatcher.last_name || ''}`.trim();
        return fullName || t('additional_payments.errors.no_name');
      }
      return t('additional_payments.errors.dispatcher_not_found');
    }
    return t('additional_payments.errors.user_not_found');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />{t('additional_payments.status.approved')}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{t('additional_payments.status.pending')}</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{t('additional_payments.status.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIncomeTypeLabel = (type: string) => {
    const typeKey = `additional_payments.types.${type}`;
    return t(typeKey, { defaultValue: type });
  };

  const handleViewItem = (item: OtherIncomeItem) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleEditItem = (item: OtherIncomeItem) => {
    setItemToEdit(item);
    setIsEditDialogOpen(true);
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

  // Agrupar datos por rol
  const groupedData = incomeData.reduce((acc, item) => {
    const role = item.applied_to_role || 'driver'; // Default to driver if no role specified
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(item);
    return acc;
  }, {} as Record<string, typeof incomeData>);

  // Calcular totales por rol
  const getRoleStats = (roleData: typeof incomeData) => {
    const pending = roleData.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
    const approved = roleData.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);
    return { pending, approved, total: pending + approved };
  };

  const totalPending = incomeData.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const totalApproved = incomeData.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">{t('additional_payments.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('additional_payments.stats.approved')}</p>
                <p className="text-lg sm:text-xl font-semibold">{formatCurrency(totalApproved)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('additional_payments.stats.pending')}</p>
                <p className="text-lg sm:text-xl font-semibold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('additional_payments.stats.total')}</p>
                <p className="text-lg sm:text-xl font-semibold">{formatCurrency(totalApproved + totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón global de agregar */}
      {!hideAddButton && (
        <div className="flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('additional_payments.actions.add_income')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>{t('additional_payments.dialogs.new_income_title')}</DialogTitle>
                <DialogDescription>
                  Agregar un ingreso adicional para el período de pago actual
                </DialogDescription>
              </DialogHeader>
              <UnifiedOtherIncomeForm onClose={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Secciones separadas por rol */}
      {Object.keys(groupedData).length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('additional_payments.no_records.title')}</p>
              <p className="text-sm">{t('additional_payments.no_records.subtitle')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedData).map(([role, roleData]) => {
          const roleStats = getRoleStats(roleData);
          const roleName = role === 'driver' ? t('additional_payments.roles.drivers') : role === 'dispatcher' ? t('additional_payments.roles.dispatchers') : t('additional_payments.roles.others');
          
          return (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {t('additional_payments.section_title')} - {roleName}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <span>{t('additional_payments.stats.approved')}: {formatCurrency(roleStats.approved)}</span>
                       <span>{t('additional_payments.stats.pending')}: {formatCurrency(roleStats.pending)}</span>
                       <span className="font-medium">{t('additional_payments.stats.total')}: {formatCurrency(roleStats.total)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('additional_payments.table.description')}</TableHead>
                      <TableHead>{t('additional_payments.table.type')}</TableHead>
                      <TableHead>{t('additional_payments.table.amount')}</TableHead>
                      <TableHead>{t('additional_payments.table.date')}</TableHead>
                      {!isDriver && <TableHead>{role === 'driver' ? t('additional_payments.table.driver') : t('additional_payments.table.dispatcher')}</TableHead>}
                      <TableHead>{t('additional_payments.table.status')}</TableHead>
                      <TableHead className="w-[100px]">{t('additional_payments.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{getIncomeTypeLabel(item.income_type)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{formatDateOnly(item.income_date)}</TableCell>
                        {!isDriver && <TableCell>{getUserName(item.user_id, item.applied_to_role)}</TableCell>}
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
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEditItem(item)}
                                >
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Dialog para ver detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('additional_payments.dialogs.view_details_title')}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.description')}</Label>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.type')}</Label>
                  <p className="text-sm text-muted-foreground">{getIncomeTypeLabel(selectedItem.income_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.amount')}</Label>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedItem.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.date')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(selectedItem.income_date)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.status')}</Label>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
                {selectedItem.reference_number && (
                  <div>
                    <Label className="text-sm font-medium">{t('additional_payments.detail_labels.reference')}</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.reference_number}</p>
                  </div>
                )}
              </div>
              {selectedItem.notes && (
                <div>
                  <Label className="text-sm font-medium">{t('additional_payments.detail_labels.notes')}</Label>
                  <p className="text-sm text-muted-foreground">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar ingreso */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{t('additional_payments.dialogs.edit_title')}</DialogTitle>
          </DialogHeader>
          {itemToEdit && (
            <UnifiedOtherIncomeForm 
              onClose={() => {
                setIsEditDialogOpen(false);
                setItemToEdit(null);
              }}
              editData={{
                id: itemToEdit.id,
                description: itemToEdit.description,
                amount: itemToEdit.amount,
                income_type: itemToEdit.income_type,
                income_date: itemToEdit.income_date,
                user_id: itemToEdit.user_id,
                applied_to_role: itemToEdit.applied_to_role as "driver" | "dispatcher",
                reference_number: itemToEdit.reference_number
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('additional_payments.dialogs.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('additional_payments.dialogs.delete_description', {
                description: itemToDelete?.description || '',
                amount: formatCurrency(itemToDelete?.amount || 0)
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('additional_payments.actions_labels.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteOtherIncome.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOtherIncome.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('additional_payments.actions_labels.deleting')}
                </>
              ) : (
                t('additional_payments.actions_labels.delete')
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
        user_id: formData.driver_user_id,
        description: formData.description,
        amount: atmInput.numericValue,
        income_type: formData.income_type,
        income_date: formatDateInUserTimeZone(formData.income_date), // Convert to YYYY-MM-DD
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        status: 'pending',
        applied_to_role: 'driver'
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
                  formatPrettyDate(formData.income_date)
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
                    value={formData.income_date ? formatMonthName(formData.income_date) : formatMonthName(new Date())}
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