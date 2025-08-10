import { useState, useEffect, useCallback } from 'react';
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
import { capitalizeWords } from '@/lib/textUtils';
import { CreateEquipmentDialog } from './CreateEquipmentDialog';

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
  const [showCreateEquipmentDialog, setShowCreateEquipmentDialog] = useState(false);

  const { equipment } = useEquipment();
  const { drivers } = useCompanyDrivers();
  const { 
    assignments, 
    createAssignment, 
    isCreatingAssignment, 
    createAssignmentSuccess,
    unassignEquipment,
    isUnassigning,
    getAssignmentByEquipment,
    getAssignmentsByDriver 
  } = useEquipmentAssignments();

  // Función para cerrar el modal
  const handleClose = useCallback(() => {
    setSelectedTruckId('');
    setSelectedTrailerId('');
    setSelectedDriverId(driverUserId || '');
    setAssignmentType('permanent');
    setNotes('');
    onClose();
  }, [driverUserId, onClose]);

  // Asegurar que selectedDriverId se inicialice correctamente
  useEffect(() => {
    if (driverUserId && selectedDriverId !== driverUserId) {
      setSelectedDriverId(driverUserId);
    }
  }, [driverUserId, selectedDriverId]);


  // Filtrar equipos por tipo
  const availableTrucks = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'truck';
  }) || [];

  const availableTrailers = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'trailer';
  }) || [];

  // Filtrar conductores activos
  const activeDrivers = drivers?.filter(driver => driver.is_active) || [];

  const handleSubmit = () => {
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

    // Cerrar modal después de llamar a las asignaciones
    // El toast de éxito se maneja en el hook
    setTimeout(() => {
      handleClose();
    }, 1000); // Dar tiempo a que se ejecuten las mutaciones
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
          {selectedDriver && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Equipos Actuales de {selectedDriver.first_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {driverAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Sin equipos asignados</p>
                    <p className="text-sm">Este conductor no tiene equipos asignados actualmente</p>
                  </div>
                ) : (
                  <>
                    {/* Camiones */}
                    {driverTrucks.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Camiones</Label>
                        <div className="space-y-2">
                          {driverTrucks.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                            >
                              <div className="flex items-center gap-3">
                                <Truck className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="font-medium">
                                    {assignment.company_equipment?.equipment_number}
                                  </div>
                                   <div className="text-sm text-muted-foreground">
                                     {capitalizeWords(assignment.company_equipment?.make)} {capitalizeWords(assignment.company_equipment?.model)}
                                    {assignment.company_equipment?.year && ` (${assignment.company_equipment.year})`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs border-blue-200">
                                  {assignment.assignment_type === 'permanent' ? 'Permanente' : 'Temporal'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => unassignEquipment(assignment.id)}
                                  disabled={isUnassigning}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
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
                              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                            >
                              <div className="flex items-center gap-3">
                                <Truck className="h-5 w-5 text-green-600" />
                                <div>
                                  <div className="font-medium">
                                    {assignment.company_equipment?.equipment_number}
                                  </div>
                                   <div className="text-sm text-muted-foreground">
                                     {capitalizeWords(assignment.company_equipment?.make)} {capitalizeWords(assignment.company_equipment?.model)}
                                    {assignment.company_equipment?.year && ` (${assignment.company_equipment.year})`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs border-green-200">
                                  {assignment.assignment_type === 'permanent' ? 'Permanente' : 'Temporal'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => unassignEquipment(assignment.id)}
                                  disabled={isUnassigning}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
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
            <Select 
              value={selectedTruckId} 
              onValueChange={(value) => {
                if (value === "add-new-truck") {
                  setShowCreateEquipmentDialog(true);
                  return;
                }
                setSelectedTruckId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar camión..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                {/* Opción para agregar nuevo camión */}
                <SelectItem 
                  value="add-new-truck" 
                  onSelect={() => {
                    setShowCreateEquipmentDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2 text-blue-600">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Añadir Nuevo Camión</span>
                  </div>
                </SelectItem>
                
                {availableTrucks.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground border-t">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay camiones disponibles</p>
                    <p className="text-xs">Todos los camiones están asignados</p>
                  </div>
                ) : (
                  <>
                    <div className="h-px bg-border my-1" />
                    {availableTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{truck.equipment_number}</span>
                           <span className="text-muted-foreground">
                             {capitalizeWords(truck.make)} {capitalizeWords(truck.model)}
                            {truck.year && ` (${truck.year})`}
                          </span>
                          {truck.license_plate && (
                            <Badge variant="outline" className="text-xs">
                              {truck.license_plate}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </>
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
            <Select 
              value={selectedTrailerId} 
              onValueChange={(value) => {
                if (value === "add-new-trailer") {
                  setShowCreateEquipmentDialog(true);
                  return;
                }
                setSelectedTrailerId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar trailer (opcional)..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                {/* Opción para agregar nuevo trailer */}
                <SelectItem 
                  value="add-new-trailer" 
                  onSelect={() => {
                    setShowCreateEquipmentDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2 text-green-600">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Añadir Nuevo Trailer</span>
                  </div>
                </SelectItem>
                
                <div className="h-px bg-border my-1" />
                
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
                         {capitalizeWords(trailer.make)} {capitalizeWords(trailer.model)}
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

      {/* Modal para crear nuevo equipo */}
      <CreateEquipmentDialog
        open={showCreateEquipmentDialog}
        onOpenChange={setShowCreateEquipmentDialog}
      />
    </Dialog>
  );
}