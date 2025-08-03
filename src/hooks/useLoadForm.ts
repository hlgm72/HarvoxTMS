
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadData } from './useLoadData';

const loadFormSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  contact_id: z.string().optional(),
  load_number: z.string().min(1, "El número de carga es requerido"),
  po_number: z.string().optional(),
  total_amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  pu_number: z.string().optional(),
  commodity: z.string().min(1, "Especifica el commodity"),
  weight_lbs: z.number().optional(),
  customer_name: z.string().optional(),
  notes: z.string().optional(),
  factoring_percentage: z.number().optional(),
  dispatching_percentage: z.number().optional(),
  leasing_percentage: z.number().optional(),
});

export type LoadFormData = z.infer<typeof loadFormSchema>;

export const useLoadForm = (initialData?: LoadData | null, mode?: 'create' | 'edit' | 'duplicate') => {
  const [isFormReady, setIsFormReady] = useState(false);

  const form = useForm<LoadFormData>({
    resolver: zodResolver(loadFormSchema),
    defaultValues: {
      client_id: "",
      contact_id: "",
      load_number: "",
      po_number: "",
      total_amount: 0,
      pu_number: "",
      commodity: "",
      weight_lbs: undefined,
      customer_name: "",
      notes: "",
      factoring_percentage: undefined,
      dispatching_percentage: undefined,
      leasing_percentage: undefined,
    },
  });

  // Populate form when initial data is available
  useEffect(() => {
    if ((mode === 'edit' || mode === 'duplicate') && initialData) {
      console.log(`🔄 useLoadForm - Populating form with data for ${mode} mode:`, initialData);
      
      form.reset({
        client_id: initialData.client_id || "",
        contact_id: initialData.client_contact_id || "",
        load_number: mode === 'duplicate' ? "" : (initialData.load_number || ""), // Clear for duplicate
        po_number: mode === 'duplicate' ? "" : (initialData.po_number || ""),     // Clear for duplicate
        total_amount: initialData.total_amount || 0,
        commodity: initialData.commodity || "",
        weight_lbs: initialData.weight_lbs || undefined,
        customer_name: initialData.customer_name || "",
        notes: initialData.notes || "",
        factoring_percentage: initialData.factoring_percentage,
        dispatching_percentage: initialData.dispatching_percentage,
        leasing_percentage: initialData.leasing_percentage,
      });

      setIsFormReady(true);
    } else {
      setIsFormReady(true);
    }
  }, [initialData, form, mode]);

  return {
    form,
    isFormReady
  };
};
