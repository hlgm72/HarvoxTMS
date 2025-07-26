import { useState, useEffect } from 'react';
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
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'permanent' | 'temporary'>('permanent');
  const [notes, setNotes] = useState('');

  // Asegurar que selectedDriverId se inicialice correctamente
  useEffect(() => {
    if (driverUserId && selectedDriverId !== driverUserId) {
      setSelectedDriverId(driverUserId);
    }
  }, [driverUserId, selectedDriverId]);

  const { equipment } = useEquipment();
  const { drivers } = useCompanyDrivers();
  const { 
    assignments, 
    createAssignment, 
    isCreatingAssignment, 
    getAssignmentByEquipment,
    getAssignmentsByDriver 
  } = useEquipmentAssignments();

  // Debug logs
  console.log('🚛 Available equipment:', equipment?.length || 0);
  console.log('👨‍💼 Available drivers:', drivers?.length || 0);
  console.log('🔧 Selected truck ID:', selectedTruckId);
  console.log('👤 Selected driver ID:', selectedDriverId);

  // Filtrar equipos por tipo
  const availableTrucks = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'truck';
  }) || [];

  const availableTrailers = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'trailer';
  }) || [];

  console.log('🚛 Available trucks:', availableTrucks.length);
  console.log('🚚 Available trailers:', availableTrailers.length);

  // Filtrar conductores activos
  const activeDrivers = drivers?.filter(driver => driver.is_active) || [];

  const handleSubmit = async () => {
    if (!selectedTruckId || !selectedDriverId) return;

    // Asignar camión (siempre requerido)
    createAssignment({
      equipment_id: selectedTruckId,
      driver_user_id: selectedDriverId,
      assignment_type: assignmentType,
      notes: notes.trim() || 'Camión asignado',
    });

    // Asignar trailer si se seleccionó (y no es "none")
    if (selectedTrailerId && selectedTrailerId !== 'none') {
      createAssignment({
        equipment_id: selectedTrailerId,
        driver_user_id: selectedDriverId,
        assignment_type: assignmentType,
        notes: notes.trim() || 'Trailer asignado',
      });
    }
  };

  const handleClose = () => {
    setSelectedTruckId('');
    setSelectedTrailerId('');
    setSelectedDriverId(driverUserId || '');
    setAssignmentType('permanent');
    setNotes('');
    onClose();
  };

  // Obtener asignaciones del conductor seleccionado
  const driverAssignments = selectedDriverId ? getAssignmentsByDriver(selectedDriverId) : [];
  const selectedDriver = activeDrivers.find(d => d.user_id === selectedDriverId);
  
  // Separar equipos por tipo
  const driverTrucks = driverAssignments.filter(a => a.company_equipment?.equipment_type === 'truck');
  const driverTrailers = driverAssignments.filter(a => a.company_equipment?.equipment_type === 'trailer');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Asignar Equipo a Conductor{selectedDriver ? `: ${selectedDriver.first_name} ${selectedDriver.last_name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Selecciona un equipo disponible y asígnalo a un conductor de tu flota.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Solo mostrar selector de conductor si no viene predefinido */}
          {!driverUserId && (
            <div className="space-y-2">
              <Label htmlFor="driver-select">Conductor</Label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor..." />
                </SelectTrigger>
                 <SelectContent className="bg-white z-50">
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
          )}

          {/* Equipos Actuales del Conductor */}
          {selectedDriver && driverAssignments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Equipos Actuales de {selectedDriver.first_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camiones */}
                {driverTrucks.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Camiones</Label>
                    <div className="space-y-2">
                      {driverTrucks.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">
                              {assignment.company_equipment?.equipment_number}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {assignment.company_equipment?.make} {assignment.company_equipment?.model}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs border-blue-200">
                            {assignment.assignment_type === 'permanent' ? 'Permanente' : 'Temporal'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trailers */}
                {driverTrailers.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Trailers</Label>
                    <div className="space-y-2">
                      {driverTrailers.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {assignment.company_equipment?.equipment_number}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {assignment.company_equipment?.make} {assignment.company_equipment?.model}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs border-green-200">
                            {assignment.assignment_type === 'permanent' ? 'Permanente' : 'Temporal'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(!driverUserId || (driverUserId && driverAssignments.length > 0)) && <Separator />}

          {/* Selección de Camión (Requerido) */}
          <div className="space-y-2">
            <Label htmlFor="truck-select" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Camión (Requerido)
            </Label>
            <Select value={selectedTruckId} onValueChange={setSelectedTruckId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar camión..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                {availableTrucks.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay camiones disponibles</p>
                    <p className="text-xs">Todos los camiones están asignados</p>
                  </div>
                ) : (
                  availableTrucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{truck.equipment_number}</span>
                        <span className="text-muted-foreground">
                          {truck.make} {truck.model}
                          {truck.year && ` (${truck.year})`}
                        </span>
                        {truck.license_plate && (
                          <Badge variant="outline" className="text-xs">
                            {truck.license_plate}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selección de Trailer (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="trailer-select" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-green-600" />
              Trailer (Opcional)
            </Label>
            <Select value={selectedTrailerId} onValueChange={setSelectedTrailerId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar trailer (opcional)..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span>Sin trailer (Power Only)</span>
                  </div>
                </SelectItem>
                {availableTrailers.map((trailer) => (
                  <SelectItem key={trailer.id} value={trailer.id}>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{trailer.equipment_number}</span>
                      <span className="text-muted-foreground">
                        {trailer.make} {trailer.model}
                        {trailer.year && ` (${trailer.year})`}
                      </span>
                      {trailer.license_plate && (
                        <Badge variant="outline" className="text-xs">
                          {trailer.license_plate}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deja vacío si es una operación "Power Only" (solo camión)
            </p>
          </div>

          {/* Tipo de Asignación */}
          <div className="space-y-2">
            <Label htmlFor="assignment-type">Tipo de Asignación</Label>
            <Select value={assignmentType} onValueChange={(value: 'permanent' | 'temporary') => setAssignmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="permanent">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">Permanente</div>
                    <div className="text-xs text-muted-foreground">
                      Asignación fija al conductor
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="temporary">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">Temporal</div>
                    <div className="text-xs text-muted-foreground">
                      Asignación por tiempo limitado
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
              disabled={!selectedTruckId || !selectedDriverId || isCreatingAssignment}
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
                  Asignar Equipos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}