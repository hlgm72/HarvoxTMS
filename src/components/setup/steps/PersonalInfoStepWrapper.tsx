import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSetup } from '@/contexts/SetupContext';

const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

export function PersonalInfoStepWrapper() {
  const { setupData, updateSetupData } = useSetup();

  const form = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: setupData.firstName || '',
      lastName: setupData.lastName || '',
      email: setupData.email || '',
      phone: setupData.phone || '',
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
        <h2 className="text-2xl font-bold text-foreground">Información Personal</h2>
        <p className="text-muted-foreground mt-2">
          Completa tu información básica para personalizar tu experiencia
        </p>
      </div>
      
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tu nombre" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tu apellido" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico *</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="tu@email.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder="(555) 123-4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );
}