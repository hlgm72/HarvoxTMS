
import { useState, useCallback } from 'react';
import { format, isAfter, isBefore, isValid, differenceInDays } from 'date-fns';

export interface LoadStop {
  id: string;
  stop_number: number;
  stop_type: 'pickup' | 'delivery';
  company_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  contact_name?: string;
  contact_phone?: string;
  reference_number?: string;
  scheduled_date?: Date;
  scheduled_time?: string;
  special_instructions?: string;
}

export interface LoadStopsValidation {
  isValid: boolean;
  errors: string[];
}

export function useLoadStops(initialStops?: LoadStop[]) {
  const getDefaultStops = (): LoadStop[] => [
    {
      id: 'stop-1',
      stop_number: 1,
      stop_type: 'pickup',
      company_name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    },
    {
      id: 'stop-2', 
      stop_number: 2,
      stop_type: 'delivery',
      company_name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    }
  ];

  const [stops, setStops] = useState<LoadStop[]>(() => {
    if (initialStops && initialStops.length > 0) {
      // Convert database stops to the format expected by the component
      return initialStops.map((stop, index) => ({
        ...stop,
        scheduled_date: stop.scheduled_date ? new Date(stop.scheduled_date) : undefined,
        stop_number: index + 1
      }));
    }
    return getDefaultStops();
  });

  const validateStops = useCallback((showFieldValidations: boolean = false): LoadStopsValidation => {
    const errors: string[] = [];
    const stopErrors: { [key: number]: string[] } = {};

    // Minimum 2 stops
    if (stops.length < 2) {
      errors.push('Debe haber al menos 2 paradas');
      return { isValid: false, errors };
    }

    // First stop must be pickup
    if (stops[0].stop_type !== 'pickup') {
      errors.push('La primera parada debe ser una recogida (pickup)');
    }

    // Last stop must be delivery
    if (stops[stops.length - 1].stop_type !== 'delivery') {
      errors.push('La última parada debe ser una entrega (delivery)');
    }

    // Validate each stop has required fields (only if showFieldValidations is true)
    if (showFieldValidations) {
      stops.forEach((stop, index) => {
        const stopNumber = index + 1;
        const fieldsErrors: string[] = [];
        
        if (!stop.company_name.trim()) {
          fieldsErrors.push('Empresa');
        }
        if (!stop.address.trim()) {
          fieldsErrors.push('Dirección');
        }
        if (!stop.city.trim()) {
          fieldsErrors.push('Ciudad');
        }
        if (!stop.state.trim()) {
          fieldsErrors.push('Estado');
        }

        // Validación obligatoria de fecha para paradas mínimas (primera y última)
        if ((index === 0 || index === stops.length - 1) && !stop.scheduled_date) {
          fieldsErrors.push('Fecha programada');
        }

        if (fieldsErrors.length > 0) {
          stopErrors[stopNumber] = fieldsErrors;
        }
      });

      // Convertir errores agrupados en mensajes compactos
      Object.entries(stopErrors).forEach(([stopNum, fieldErrors]) => {
        const stopType = stops[parseInt(stopNum) - 1]?.stop_type === 'pickup' ? 'P' : 'D';
        errors.push(`${stopType}${stopNum}: Faltan ${fieldErrors.join(', ')}`);
      });
    }

    // Date validations
    const stopsWithDates = stops.filter(stop => stop.scheduled_date && isValid(stop.scheduled_date));
    
    if (stopsWithDates.length > 1) {
      // Check chronological order
      for (let i = 1; i < stopsWithDates.length; i++) {
        const prevStop = stopsWithDates[i - 1];
        const currentStop = stopsWithDates[i];
        
        if (prevStop.scheduled_date && currentStop.scheduled_date) {
          // Same day is allowed, but if different days, must be chronological
          if (isBefore(currentStop.scheduled_date, prevStop.scheduled_date)) {
            errors.push(`Las fechas deben estar en orden cronológico. Parada ${currentStop.stop_number} es anterior a parada ${prevStop.stop_number}`);
          }
        }
      }

      // Check reasonable time frame (not more than 30 days apart)
      const firstDate = stopsWithDates[0].scheduled_date!;
      const lastDate = stopsWithDates[stopsWithDates.length - 1].scheduled_date!;
      
      if (differenceInDays(lastDate, firstDate) > 30) {
        errors.push('Las fechas no deben estar separadas por más de 30 días');
      }

      // Check dates are not too far in the past or future
      const today = new Date();
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(today.getMonth() + 6); // 6 months in future
      
      const minPastDate = new Date();
      minPastDate.setDate(today.getDate() - 7); // 7 days in past
      
      stopsWithDates.forEach((stop, index) => {
        if (stop.scheduled_date) {
          if (isAfter(stop.scheduled_date, maxFutureDate)) {
            errors.push(`Parada ${stop.stop_number}: Fecha no puede ser más de 6 meses en el futuro`);
          }
          if (isBefore(stop.scheduled_date, minPastDate)) {
            errors.push(`Parada ${stop.stop_number}: Fecha no puede ser más de 7 días en el pasado`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [stops]);

  const addStop = useCallback(() => {
    console.log('🚨 useLoadStops - addStop called, current stops:', stops.length);
    const newStopNumber = stops.length + 1;
    const newStop: LoadStop = {
      id: `stop-${newStopNumber}`,
      stop_number: newStopNumber,
      stop_type: 'delivery', // Default to delivery for intermediate stops
      company_name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    };

    // Insert before the last stop (which should remain delivery)
    const newStops = [...stops];
    newStops.splice(-1, 0, newStop);
    
    // Renumber all stops
    const renumberedStops = newStops.map((stop, index) => ({
      ...stop,
      stop_number: index + 1
    }));

    console.log('🚨 useLoadStops - setting new stops:', renumberedStops);
    setStops(renumberedStops);
  }, [stops]);

  const removeStop = useCallback((stopId: string) => {
    if (stops.length <= 2) return; // Cannot remove if only 2 stops
    
    const newStops = stops
      .filter(stop => stop.id !== stopId)
      .map((stop, index) => ({
        ...stop,
        stop_number: index + 1
      }));
    
    setStops(newStops);
  }, []);

  const updateStop = useCallback((stopId: string, updates: Partial<LoadStop>) => {
    console.log('🚨 useLoadStops - updateStop called', { stopId, updates });
    setStops(currentStops => {
      const updatedStops = currentStops.map(stop => {
        if (stop.id === stopId) {
          return { ...stop, ...updates };
        }
        return stop;
      });
      console.log('🚨 useLoadStops - updated stops:', updatedStops);
      return updatedStops;
    });
  }, []);

  const reorderStops = useCallback((startIndex: number, endIndex: number) => {
    const newStops = Array.from(stops);
    const [removed] = newStops.splice(startIndex, 1);
    newStops.splice(endIndex, 0, removed);

    // Renumber and ensure first is pickup, last is delivery
    const reorderedStops = newStops.map((stop, index) => ({
      ...stop,
      stop_number: index + 1,
      stop_type: index === 0 ? 'pickup' as const : 
                index === newStops.length - 1 ? 'delivery' as const : 
                stop.stop_type
    }));

    setStops(reorderedStops);
  }, [stops]);

  const getCalculatedDates = useCallback(() => {
    const stopsWithDates = stops.filter(stop => stop.scheduled_date && isValid(stop.scheduled_date));
    
    if (stopsWithDates.length === 0) return { pickupDate: null, deliveryDate: null };

    const pickupDate = stopsWithDates[0]?.scheduled_date || null;
    const deliveryDate = stopsWithDates[stopsWithDates.length - 1]?.scheduled_date || null;

    return { pickupDate, deliveryDate };
  }, [stops]);

  return {
    stops,
    setStops,
    addStop,
    removeStop,
    updateStop,
    reorderStops,
    validateStops,
    getCalculatedDates,
  };
}
