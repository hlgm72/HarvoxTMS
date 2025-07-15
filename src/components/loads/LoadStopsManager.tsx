import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableStopItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLoadStops } from '@/hooks/useLoadStops';
import { StopFormCard } from './StopFormCard';

interface LoadStopsManagerProps {
  onStopsChange?: (stops: any[]) => void;
  showValidation?: boolean;
}

export function LoadStopsManager({ onStopsChange, showValidation = false }: LoadStopsManagerProps) {
  const {
    stops,
    addStop,
    removeStop,
    updateStop,
    reorderStops,
    validateStops,
    getCalculatedDates
  } = useLoadStops();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const validation = validateStops(showValidation);
  const { pickupDate, deliveryDate } = getCalculatedDates();

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = stops.findIndex(stop => stop.id === active.id);
      const newIndex = stops.findIndex(stop => stop.id === over.id);
      
      reorderStops(oldIndex, newIndex);
    }
  };

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
                  {' '}Pickup: {pickupDate.toLocaleDateString()}, Delivery: {deliveryDate.toLocaleDateString()}
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
            <div className="space-y-4">
              {stops.map((stop, index) => (
                <SortableItem key={stop.id} id={stop.id}>
                  <StopFormCard
                    stop={stop}
                    onUpdate={(updates) => updateStop(stop.id, updates)}
                    onRemove={() => removeStop(stop.id)}
                    canRemove={stops.length > 2}
                    isFirst={index === 0}
                    isLast={index === stops.length - 1}
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
          <p>• Arrastra las paradas para reordenarlas</p>
          <p>• Mínimo 2 paradas requeridas</p>
          <p>• Las fechas deben estar en orden cronológico</p>
        </div>
      </CardContent>
    </Card>
  );
}