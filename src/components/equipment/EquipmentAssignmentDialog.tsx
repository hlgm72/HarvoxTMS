import { useState } from 'react';
import { Truck, User, Plus, ArrowRightLeft, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEquipment } from '@/hooks/useEquipment';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useEquipmentAssignments } from '@/hooks/useEquipmentAssignments';

interface EquipmentAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverUserId?: string; // Si se proporciona, es para asignar equipos a este conductor específico
}

export function EquipmentAssignmentDialog({
  isOpen,
  onClose,
  driverUserId,
}: EquipmentAssignmentDialogProps) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(driverUserId || '');
  const [assignmentType, setAssignmentType] = useState<'permanent' | 'temporary'>('temporary');
  const [notes, setNotes] = useState('');

  const { equipment } = useEquipment();
  const { drivers } = useCompanyDrivers();
  const { 
    assignments, 
    createAssignment, 
    isCreatingAssignment, 
    getAssignmentByEquipment,
    getAssignmentsByDriver 
  } = useEquipmentAssignments();

  // Filtrar equipos disponibles (no asignados)
  const availableEquipment = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active';
  }) || [];

  // Filtrar conductores activos
  const activeDrivers = drivers?.filter(driver => driver.is_active) || [];

  const handleSubmit = () => {
    if (!selectedEquipmentId || !selectedDriverId) return;

    createAssignment({
      equipment_id: selectedEquipmentId,
      driver_user_id: selectedDriverId,
      assignment_type: assignmentType,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    setSelectedEquipmentId('');
    setSelectedDriverId(driverUserId || '');
    setAssignmentType('temporary');
    setNotes('');
    onClose();
  };

  // Obtener asignaciones del conductor seleccionado
  const driverAssignments = selectedDriverId ? getAssignmentsByDriver(selectedDriverId) : [];
  const selectedDriver = activeDrivers.find(d => d.user_id === selectedDriverId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Asignar Equipo a Conductor
          </DialogTitle>
          <DialogDescription>
            Selecciona un equipo disponible y asígnalo a un conductor de tu flota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de Conductor */}
          <div className="space-y-2">
            <Label htmlFor="driver-select">Conductor</Label>
            <Select
              value={selectedDriverId}
              onValueChange={setSelectedDriverId}
              disabled={!!driverUserId} // Si viene pre-seleccionado, no se puede cambiar
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conductor..." />
              </SelectTrigger>
              <SelectContent>
                {activeDrivers.map((driver) => (
                  <SelectItem key={driver.user_id} value={driver.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {driver.first_name} {driver.last_name}
                      </span>
                      {driver.license_number && (
                        <Badge variant="outline" className="text-xs">
                          {driver.cdl_class}-{driver.license_number}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipos Actuales del Conductor */}
          {selectedDriver && driverAssignments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Equipos Actuales de {selectedDriver.first_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {driverAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {assignment.company_equipment?.equipment_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {assignment.company_equipment?.make} {assignment.company_equipment?.model}
                      </span>
                    </div>
                    <Badge 
                      variant={assignment.assignment_type === 'permanent' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {assignment.assignment_type === 'permanent' ? 'Permanente' : 'Temporal'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Selección de Equipo */}
          <div className="space-y-2">
            <Label htmlFor="equipment-select">Equipo Disponible</Label>
            <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar equipo..." />
              </SelectTrigger>
              <SelectContent>
                {availableEquipment.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay equipos disponibles</p>
                    <p className="text-xs">Todos los equipos están asignados</p>
                  </div>
                ) : (
                  availableEquipment.map((equipment) => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium">{equipment.equipment_number}</span>
                        <span className="text-muted-foreground">
                          {equipment.make} {equipment.model}
                          {equipment.year && ` (${equipment.year})`}
                        </span>
                        {equipment.license_plate && (
                          <Badge variant="outline" className="text-xs">
                            {equipment.license_plate}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Asignación */}
          <div className="space-y-2">
            <Label htmlFor="assignment-type">Tipo de Asignación</Label>
            <Select value={assignmentType} onValueChange={(value: 'permanent' | 'temporary') => setAssignmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">
                  <div>
                    <div className="font-medium">Temporal</div>
                    <div className="text-xs text-muted-foreground">
                      Asignación por tiempo limitado
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="permanent">
                  <div>
                    <div className="font-medium">Permanente</div>
                    <div className="text-xs text-muted-foreground">
                      Asignación fija al conductor
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Añadir notas sobre esta asignación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedEquipmentId || !selectedDriverId || isCreatingAssignment}
              className="gap-2"
            >
              {isCreatingAssignment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Asignando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Asignar Equipo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}