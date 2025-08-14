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
  driverUserId?: string; // If provided, it's for assigning equipment to this specific driver
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
  const [equipmentTypeToCreate, setEquipmentTypeToCreate] = useState<"truck" | "trailer">("truck");

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

  // Function to close the modal
  const handleClose = useCallback(() => {
    setSelectedTruckId('');
    setSelectedTrailerId('');
    setSelectedDriverId(driverUserId || '');
    setAssignmentType('permanent');
    setNotes('');
    onClose();
  }, [driverUserId, onClose]);

  // Ensure selectedDriverId initializes correctly
  useEffect(() => {
    if (driverUserId && selectedDriverId !== driverUserId) {
      setSelectedDriverId(driverUserId);
    }
  }, [driverUserId, selectedDriverId]);


  // Filter equipment by type
  const availableTrucks = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'truck';
  }) || [];

  const availableTrailers = equipment?.filter(eq => {
    const assignment = getAssignmentByEquipment(eq.id);
    return !assignment && eq.status === 'active' && eq.equipment_type === 'trailer';
  }) || [];

  // Filter active drivers
  const activeDrivers = drivers?.filter(driver => driver.is_active) || [];

  const handleSubmit = () => {
    if (!selectedTruckId || !selectedDriverId) return;

    // Assign truck (always required)
    createAssignment({
      equipment_id: selectedTruckId,
      driver_user_id: selectedDriverId,
      assignment_type: assignmentType,
      notes: notes.trim() || 'Truck assigned',
    });

    // Assign trailer if selected (and not "none")
    if (selectedTrailerId && selectedTrailerId !== 'none') {
      createAssignment({
        equipment_id: selectedTrailerId,
        driver_user_id: selectedDriverId,
        assignment_type: assignmentType,
        notes: notes.trim() || 'Trailer assigned',
      });
    }

    // Close modal after calling assignments
    // Success toast is handled in the hook
    setTimeout(() => {
      handleClose();
    }, 1000); // Give time for mutations to execute
  };


  // Get assignments for selected driver
  const driverAssignments = selectedDriverId ? getAssignmentsByDriver(selectedDriverId) : [];
  const selectedDriver = activeDrivers.find(d => d.user_id === selectedDriverId);
  
  // Separate equipment by type
  const driverTrucks = driverAssignments.filter(a => a.company_equipment?.equipment_type === 'truck');
  const driverTrailers = driverAssignments.filter(a => a.company_equipment?.equipment_type === 'trailer');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Assign Equipment to Driver{selectedDriver ? `: ${selectedDriver.first_name} ${selectedDriver.last_name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Select available equipment and assign it to a driver in your fleet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Only show driver selector if not predefined */}
          {!driverUserId && (
            <div className="space-y-2">
              <Label htmlFor="driver-select">Driver</Label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver..." />
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

          {/* Current Driver Equipment */}
          {selectedDriver && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Current Equipment for {selectedDriver.first_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {driverAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No equipment assigned</p>
                    <p className="text-sm">This driver currently has no equipment assigned</p>
                  </div>
                ) : (
                  <>
                    {/* Trucks */}
                    {driverTrucks.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Trucks</Label>
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
                                   {assignment.assignment_type === 'permanent' ? 'Permanent' : 'Temporary'}
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
                                   {assignment.assignment_type === 'permanent' ? 'Permanent' : 'Temporary'}
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

          {/* Truck Selection (Required) */}
          <div className="space-y-2">
            <Label htmlFor="truck-select" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Truck (Required)
            </Label>
            <Select 
              value={selectedTruckId} 
              onValueChange={(value) => {
                if (value === "add-new-truck") {
                  setEquipmentTypeToCreate("truck");
                  setShowCreateEquipmentDialog(true);
                  return;
                }
                setSelectedTruckId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select truck..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                {/* Option to add new truck */}
                <SelectItem 
                  value="add-new-truck" 
                  onSelect={() => {
                    setShowCreateEquipmentDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2 text-blue-600">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add New Truck</span>
                  </div>
                </SelectItem>
                
                {availableTrucks.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground border-t">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No trucks available</p>
                    <p className="text-xs">All trucks are assigned</p>
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

          {/* Trailer Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="trailer-select" className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-green-600" />
              Trailer (Optional)
            </Label>
            <Select 
              value={selectedTrailerId} 
              onValueChange={(value) => {
                if (value === "add-new-trailer") {
                  setEquipmentTypeToCreate("trailer");
                  setShowCreateEquipmentDialog(true);
                  return;
                }
                setSelectedTrailerId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trailer (optional)..." />
              </SelectTrigger>
               <SelectContent className="bg-white z-50">
                {/* Option to add new trailer */}
                <SelectItem 
                  value="add-new-trailer" 
                  onSelect={() => {
                    setShowCreateEquipmentDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2 text-green-600">
                    <Plus className="h-4 w-4" />
                    <span className="font-medium">Add New Trailer</span>
                  </div>
                </SelectItem>
                
                <div className="h-px bg-border my-1" />
                
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span>No trailer (Power Only)</span>
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
              Leave empty if it's a "Power Only" operation (truck only)
            </p>
          </div>

          {/* Assignment Type */}
          <div className="space-y-2">
            <Label htmlFor="assignment-type">Assignment Type</Label>
            <Select value={assignmentType} onValueChange={(value: 'permanent' | 'temporary') => setAssignmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="permanent">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">Permanent</div>
                    <div className="text-xs text-muted-foreground">
                      Fixed assignment to driver
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="temporary">
                  <div className="flex flex-col items-start">
                    <div className="font-medium">Temporary</div>
                    <div className="text-xs text-muted-foreground">
                      Time-limited assignment
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedTruckId || !selectedDriverId || isCreatingAssignment}
              className="gap-2"
            >
              {isCreatingAssignment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Assigning...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Assign Equipment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal to create new equipment */}
      <CreateEquipmentDialog
        open={showCreateEquipmentDialog}
        onOpenChange={setShowCreateEquipmentDialog}
        defaultEquipmentType={equipmentTypeToCreate}
      />
    </Dialog>
  );
}