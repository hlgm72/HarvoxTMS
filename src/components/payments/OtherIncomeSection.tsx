import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  FileText
} from "lucide-react";
import { formatDateOnly } from '@/lib/dateFormatting';

interface OtherIncomeItem {
  id: string;
  description: string;
  amount: number;
  incomeType: string;
  incomeDate: string;
  status: "pending" | "approved" | "rejected";
  driverName?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export function OtherIncomeSection() {
  const { isDriver, isOperationsManager, isCompanyOwner } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OtherIncomeItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Mock data - en implementación real vendría de la API
  const mockIncomeData: OtherIncomeItem[] = [
    {
      id: "1",
      description: "Bonificación por entrega urgente",
      amount: 150.00,
      incomeType: "bonus",
      incomeDate: "2024-01-15",
      status: "approved",
      driverName: "Juan Pérez",
      referenceNumber: "BON-2024-001",
      notes: "Entrega realizada en tiempo récord",
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: "2",
      description: "Reembolso de casetas",
      amount: 85.50,
      incomeType: "reimbursement",
      incomeDate: "2024-01-14",
      status: "pending",
      driverName: "María García",
      referenceNumber: "REM-2024-002",
      notes: "Casetas ruta Dallas-Houston",
      createdAt: "2024-01-14T14:20:00Z"
    },
    {
      id: "3",
      description: "Compensación por tiempo de espera",
      amount: 75.00,
      incomeType: "compensation",
      incomeDate: "2024-01-13",
      status: "approved",
      driverName: "Carlos Rodríguez",
      referenceNumber: "COMP-2024-003",
      createdAt: "2024-01-13T16:45:00Z"
    }
  ];

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

  // Filtrar datos según el rol
  const displayData = isDriver 
    ? mockIncomeData.filter(item => item.driverName === "Juan Pérez") // En realidad sería el usuario actual
    : mockIncomeData;

  const totalPending = displayData.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const totalApproved = displayData.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);

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
              <DialogContent className="max-w-md">
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
                    <TableCell>{getIncomeTypeLabel(item.incomeType)}</TableCell>
                    <TableCell className="font-semibold">${item.amount.toLocaleString()}</TableCell>
                    <TableCell>{formatDateOnly(item.incomeDate)}</TableCell>
                    {!isDriver && <TableCell>{item.driverName}</TableCell>}
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
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
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
                  <p className="text-sm text-muted-foreground">{getIncomeTypeLabel(selectedItem.incomeType)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Monto</Label>
                  <p className="text-sm font-semibold text-green-600">${selectedItem.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(selectedItem.incomeDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
                {selectedItem.referenceNumber && (
                  <div>
                    <Label className="text-sm font-medium">Referencia</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.referenceNumber}</p>
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
    </div>
  );
}

// Componente para crear nuevo ingreso
function CreateOtherIncomeForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    incomeType: "",
    incomeDate: "",
    referenceNumber: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para guardar en la base de datos
    console.log("Creating other income:", formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="incomeDate">Fecha *</Label>
          <Input
            id="incomeDate"
            type="date"
            value={formData.incomeDate}
            onChange={(e) => setFormData({ ...formData, incomeDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="incomeType">Tipo de Ingreso *</Label>
        <Select value={formData.incomeType} onValueChange={(value) => setFormData({ ...formData, incomeType: value })}>
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
          value={formData.referenceNumber}
          onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
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
        <Button type="submit" className="flex-1">Crear Ingreso</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
}