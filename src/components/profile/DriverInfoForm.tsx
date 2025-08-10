import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save, RotateCcw, Truck } from 'lucide-react';
import { BirthDateInput } from '@/components/ui/BirthDateInput';
import { createTextHandlers } from '@/lib/textUtils';

const driverInfoSchema = z.object({
  date_of_birth: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

type DriverInfoFormData = z.infer<typeof driverInfoSchema>;

interface DriverInfoFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

interface DriverProfile {
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export function DriverInfoForm({ onCancel, showCancelButton = true, className }: DriverInfoFormProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Create handlers for text inputs
  const phoneHandlers = createTextHandlers((value) => 
    driverInfoForm.setValue('emergency_contact_phone', value), 'phone'
  );

  const driverInfoForm = useForm<DriverInfoFormData>({
    resolver: zodResolver(driverInfoSchema),
    defaultValues: {
      date_of_birth: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    },
  });

  // Fetch driver profile data
  useEffect(() => {
    const fetchDriverProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('driver_profiles')
          .select('date_of_birth, emergency_contact_name, emergency_contact_phone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching driver profile:', error);
          return;
        }

        setDriverProfile(data || {
          date_of_birth: null,
          emergency_contact_name: null,
          emergency_contact_phone: null
        });

        // Update form with fetched data
        if (data) {
          driverInfoForm.reset({
            date_of_birth: data.date_of_birth || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching driver profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverProfile();
  }, [user, driverInfoForm]);

  const onSubmitDriverInfo = async (data: DriverInfoFormData) => {
    if (!user) return;

    setUpdating(true);
    try {
      // Check if driver profile exists
      const { data: existingProfile } = await supabase
        .from('driver_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updateData = {
        user_id: user.id,
        date_of_birth: data.date_of_birth || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        updated_at: new Date().toISOString(),
      };

      let error;

      if (existingProfile) {
        // Update existing profile
        ({ error } = await supabase
          .from('driver_profiles')
          .update(updateData)
          .eq('user_id', user.id));
      } else {
        // Create new profile
        ({ error } = await supabase
          .from('driver_profiles')
          .insert({
            ...updateData,
            is_active: true,
          }));
      }

      if (error) throw error;

      // Update local state
      setDriverProfile({
        date_of_birth: data.date_of_birth || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
      });

      showSuccess(
        "Información de conductor actualizada",
        "Sus datos personales han sido guardados correctamente."
      );
    } catch (error: any) {
      showError(
        "Error en la actualización",
        error.message || "No se ha podido completar la actualización. Por favor, inténtelo nuevamente."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (driverProfile) {
      driverInfoForm.reset({
        date_of_birth: driverProfile.date_of_birth || '',
        emergency_contact_name: driverProfile.emergency_contact_name || '',
        emergency_contact_phone: driverProfile.emergency_contact_phone || '',
      });
    }
    onCancel?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="h-5 w-5 text-primary" />
          <h3 className="text-base md:text-lg font-medium">Información de Conductor</h3>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          Actualiza tu información personal como conductor
        </p>
      </div>
      
      <Form {...driverInfoForm}>
        <form onSubmit={driverInfoForm.handleSubmit(onSubmitDriverInfo)} className="space-y-4">
          <FormField
            control={driverInfoForm.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <BirthDateInput
                    label="Fecha de Nacimiento"
                    value={field.value || ''}
                    onValueChange={(value, isValid) => {
                      field.onChange(value);
                    }}
                    minAge={18}
                    maxAge={80}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Contacto de Emergencia</h4>
            
            <FormField
              control={driverInfoForm.control}
              name="emergency_contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Nombre del Contacto</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nombre completo del contacto de emergencia" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={driverInfoForm.control}
              name="emergency_contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Teléfono del Contacto</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(555) 123-4567"
                      value={field.value || ''} 
                      {...phoneHandlers}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            {showCancelButton && (
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <RotateCcw className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={updating} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {updating ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}