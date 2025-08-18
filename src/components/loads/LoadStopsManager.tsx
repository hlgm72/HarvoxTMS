import React, { useState } from 'react';
import { formatDateAuto } from '@/lib/dateFormatting';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableStopItem';
import { StopListItem } from './StopListItem';
import { StopEditModal } from './StopEditModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLoadStops, LoadStop } from '@/hooks/useLoadStops';

interface LoadStopsManagerProps {
  onStopsChange?: (stops: any[]) => void;
  showValidation?: boolean;
  initialStops?: any[];
}

export function LoadStopsManager({ onStopsChange, showValidation = false, initialStops }: LoadStopsManagerProps) {
  const {
    stops,
    setStops,
    addStop,
    removeStop,
    updateStop,
    reorderStops,
    validateStops,
    getCalculatedDates
  } = useLoadStops(initialStops);

  const [editingStop, setEditingStop] = useState<LoadStop | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const validation = validateStops(showValidation);
  const { pickupDate, deliveryDate } = getCalculatedDates();

  // Validate chronological order for drag and drop
  const validateDragOrder = (oldIndex: number, newIndex: number) => {
    const newStops = [...stops];
    const [moved] = newStops.splice(oldIndex, 1);
    newStops.splice(newIndex, 0, moved);

    // Check if the new order respects chronological dates
    for (let i = 1; i < newStops.length; i++) {
      const prev = newStops[i - 1];
      const curr = newStops[i];
      
      if (prev.scheduled_date && curr.scheduled_date) {
        const prevDate = new Date(prev.scheduled_date);
        const currDate = new Date(curr.scheduled_date);
        
        if (prevDate > currDate) {
          return false; // Would violate chronological order
        }
      }
    }
    return true;
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = stops.findIndex(stop => stop.id === active.id);
      const newIndex = stops.findIndex(stop => stop.id === over.id);
      
      if (validateDragOrder(oldIndex, newIndex)) {
        reorderStops(oldIndex, newIndex);
      } else {
        // Could show a toast notification here about invalid order
        console.warn('No se puede reordenar: las fechas deben estar en orden cronológico');
      }
    }
  };

  const handleEditStop = (stop: LoadStop) => {
    // console.log('🔧 LoadStopsManager - handleEditStop called for stop:', stop.id);
    setEditingStop(stop);
    setIsModalOpen(true);
  };

  const handleSaveStop = (updates: Partial<LoadStop>) => {
    // console.log('💾 LoadStopsManager - handleSaveStop called with updates:', updates);
    if (editingStop) {
      updateStop(editingStop.id, updates);
    }
    setEditingStop(null);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    // console.log('❌ LoadStopsManager - handleCloseModal called');
    setEditingStop(null);
    setIsModalOpen(false);
  };

  // Check for date errors
  const getDateErrors = () => {
    const errors: { [key: string]: boolean } = {};
    
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const curr = stops[i];
      
      if (prev.scheduled_date && curr.scheduled_date) {
        const prevDate = new Date(prev.scheduled_date);
        const currDate = new Date(curr.scheduled_date);
        
        if (prevDate > currDate) {
          errors[curr.id] = true;
        }
      }
    }
    
    return errors;
  };

  const dateErrors = getDateErrors();

  // Notify parent component of stops changes
  React.useEffect(() => {
    if (onStopsChange) {
      onStopsChange(stops);
    }
  }, [stops, onStopsChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Paradas de la Carga</CardTitle>
        </div>
        <CardDescription>
          Define las paradas de recogida y entrega. La primera debe ser pickup y la última delivery.
        </CardDescription>
        
        {/* Validation Summary - Solo mostrar si hay errores Y showValidation es true */}
        {showValidation && !validation.isValid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.isValid && stops.length >= 2 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Configuración de paradas válida. 
              {pickupDate && deliveryDate && (
                <>
                  {' '}Pickup: {formatDateAuto(pickupDate)}, Delivery: {formatDateAuto(deliveryDate)}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <SortableItem key={stop.id} id={stop.id}>
                  <StopListItem
                    stop={stop}
                    onEdit={() => handleEditStop(stop)}
                    isFirst={index === 0}
                    isLast={index === stops.length - 1}
                    hasDateError={dateErrors[stop.id]}
                  />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Stop Button */}
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addStop}
            className="w-full max-w-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Parada Intermedia
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>• Haz clic en una parada para editarla</p>
          <p>• Arrastra las paradas para reordenarlas</p>
          <p>• Las fechas deben estar en orden cronológico</p>
        </div>
      </CardContent>

      {/* Edit Modal */}
      <StopEditModal
        stop={editingStop}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveStop}
        isFirst={editingStop ? stops.findIndex(s => s.id === editingStop.id) === 0 : false}
        isLast={editingStop ? stops.findIndex(s => s.id === editingStop.id) === stops.length - 1 : false}
      />
    </Card>
  );
}
