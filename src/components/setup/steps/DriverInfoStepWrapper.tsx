import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSetup } from '@/contexts/SetupContext';

const driverInfoSchema = z.object({
  driverId: z.string().optional(),
  licenseNumber: z.string().min(1, 'El número de licencia es requerido'),
  licenseState: z.string().min(1, 'El estado de la licencia es requerido'),
  licenseIssueDate: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  cdlClass: z.string().optional(),
  cdlEndorsements: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type DriverInfoFormData = z.infer<typeof driverInfoSchema>;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const CDL_CLASSES = ['A', 'B', 'C'];

export function DriverInfoStepWrapper() {
  const { setupData, updateSetupData } = useSetup();

  const form = useForm<DriverInfoFormData>({
    resolver: zodResolver(driverInfoSchema),
    defaultValues: {
      driverId: setupData.driverId || '',
      licenseNumber: setupData.licenseNumber || '',
      licenseState: setupData.licenseState || '',
      licenseIssueDate: setupData.licenseIssueDate || '',
      licenseExpiryDate: setupData.licenseExpiryDate || '',
      cdlClass: setupData.cdlClass || '',
      cdlEndorsements: setupData.cdlEndorsements || '',
      dateOfBirth: setupData.dateOfBirth || '',
      emergencyContactName: setupData.emergencyContactName || '',
      emergencyContactPhone: setupData.emergencyContactPhone || '',
    },
  });

  // Sync form changes with setup context
  const watchedFields = form.watch();
  
  useEffect(() => {
    Object.entries(watchedFields).forEach(([key, value]) => {
      if (value !== setupData[key as keyof typeof setupData]) {
        updateSetupData(key as keyof typeof setupData, value);
      }
    });
  }, [watchedFields, updateSetupData, setupData]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Información del Conductor</h2>
        <p className="text-muted-foreground mt-2">
          Completa tu información de conductor para finalizar la configuración
        </p>
      </div>
      
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID del Conductor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ID único del conductor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Licencia *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número de licencia de conducir" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="licenseState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado de la Licencia *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseIssueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Emisión</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseExpiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cdlClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clase CDL</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona clase CDL" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CDL_CLASSES.map((cdlClass) => (
                        <SelectItem key={cdlClass} value={cdlClass}>
                          Clase {cdlClass}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cdlEndorsements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endorsos CDL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: H, N, P, S, T, X" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacto de Emergencia</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del contacto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de Emergencia</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="(555) 123-4567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    </div>
  );
}