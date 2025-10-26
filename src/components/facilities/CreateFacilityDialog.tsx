import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Building2, AlertTriangle, MapPin } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AddressForm } from '@/components/ui/AddressForm';
import { Facility, useCreateFacility, useUpdateFacility, useCheckDuplicateFacilityName } from '@/hooks/useFacilities';

interface CreateFacilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facility?: Facility;
  initialName?: string;
  onSuccess?: (facility: Facility) => void;
}

export function CreateFacilityDialog({ isOpen, onClose, facility, initialName, onSuccess }: CreateFacilityDialogProps) {
  const { t } = useTranslation('facilities');
  const isEditMode = !!facility;

  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const checkDuplicateName = useCheckDuplicateFacilityName();

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateFacilities, setDuplicateFacilities] = useState<Facility[]>([]);
  const [pendingData, setPendingData] = useState<any>(null);

  const facilitySchema = z.object({
    name: z.string().min(1, t('create_facility_dialog.validation.name_required')),
    address: z.string().min(1, t('create_facility_dialog.validation.address_required')),
    city: z.string().optional(),
    state: z.string().min(1, t('create_facility_dialog.validation.state_required')),
    zip_code: z.string().min(1, t('create_facility_dialog.validation.zip_code_required')),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    notes: z.string().optional(),
    is_active: z.boolean().default(true),
  });

  type FacilityForm = z.infer<typeof facilitySchema>;

  const form = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_name: '',
      contact_phone: '',
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (facility) {
        form.reset({
          name: facility.name,
          address: facility.address,
          city: facility.city || '',
          state: facility.state,
          zip_code: facility.zip_code,
          contact_name: facility.contact_name || '',
          contact_phone: facility.contact_phone || '',
          notes: facility.notes || '',
          is_active: facility.is_active,
        });
      } else {
        form.reset({
          name: initialName || '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          contact_name: '',
          contact_phone: '',
          notes: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, facility, initialName, form]);

  const handleSubmit = async (data: FacilityForm) => {
    try {
      if (isEditMode && facility) {
        // Al editar, verificar si el nombre cambió y si ya existe
        const nameChanged = facility.name !== data.name;
        if (nameChanged) {
          const duplicates = await checkDuplicateName.mutateAsync({
            name: data.name,
            excludeId: facility.id,
          });

          if (duplicates && duplicates.length > 0) {
            setDuplicateFacilities(duplicates);
            setPendingData({ id: facility.id, ...data });
            setShowDuplicateDialog(true);
            return;
          }
        }
        
        const updatedFacility = await updateFacility.mutateAsync({ id: facility.id, ...data });
        form.reset();
        if (updatedFacility && onSuccess) {
          onSuccess(updatedFacility as Facility);
        }
        onClose();
      } else {
        // Verificar si ya existe una facility con el mismo nombre
        const duplicates = await checkDuplicateName.mutateAsync({
          name: data.name,
        });

        if (duplicates && duplicates.length > 0) {
          // Mostrar diálogo de advertencia
          setDuplicateFacilities(duplicates);
          setPendingData(data);
          setShowDuplicateDialog(true);
        } else {
          // No hay duplicados, crear directamente
          const newFacility = await createFacility.mutateAsync(data as any);
          form.reset();
          if (newFacility && onSuccess) {
            onSuccess(newFacility as Facility);
          }
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error saving facility:', error);
      // Si el error viene del trigger de la base de datos
      if (error.message?.includes('Ya existe una facility')) {
        form.setError('name', { 
          type: 'manual',
          message: error.message 
        });
      }
    }
  };

  const handleConfirmCreate = async () => {
    try {
      if (pendingData) {
        let savedFacility;
        if (pendingData.id) {
          // Es una actualización
          savedFacility = await updateFacility.mutateAsync(pendingData);
        } else {
          // Es una creación
          savedFacility = await createFacility.mutateAsync(pendingData as any);
        }
        form.reset();
        setShowDuplicateDialog(false);
        setPendingData(null);
        setDuplicateFacilities([]);
        if (savedFacility && onSuccess) {
          onSuccess(savedFacility as Facility);
        }
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving facility:', error);
      if (error.message?.includes('Ya existe una facility')) {
        setShowDuplicateDialog(false);
        form.setError('name', { 
          type: 'manual',
          message: error.message 
        });
      }
    }
  };

  const handleCancelCreate = () => {
    setShowDuplicateDialog(false);
    setPendingData(null);
    setDuplicateFacilities([]);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Formatear número de teléfono a (xxx) xxx-xxxx
  const formatPhoneNumber = (value: string) => {
    // Eliminar todo excepto números
    const phoneNumber = value.replace(/\D/g, '');
    
    // Aplicar formato
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    const formatted = formatPhoneNumber(value);
    onChange(formatted);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {isEditMode ? t('create_facility_dialog.edit_title') : t('create_facility_dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? t('create_facility_dialog.edit_description') : t('create_facility_dialog.description')}
            </DialogDescription>
          </DialogHeader>

        {/* Scrollable Content with white background */}
        <div className="flex-1 overflow-y-auto bg-white px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.name_required')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('create_facility_dialog.placeholders.name')} 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address Form Component */}
              <div className="space-y-4">
                <AddressForm
                  streetAddress={form.watch('address')}
                  onStreetAddressChange={(value) => form.setValue('address', value)}
                  stateId={form.watch('state')}
                  onStateChange={(value) => form.setValue('state', value || '')}
                  city={form.watch('city')}
                  onCityChange={(value) => form.setValue('city', value || '')}
                  zipCode={form.watch('zip_code')}
                  onZipCodeChange={(value) => form.setValue('zip_code', value)}
                  required={true}
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('create_facility_dialog.form.contact_name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('create_facility_dialog.placeholders.contact_name')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('create_facility_dialog.form.contact_phone')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 555-5555" 
                          value={field.value}
                          onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.notes')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('create_facility_dialog.placeholders.notes')} 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t bg-muted/50 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('create_facility_dialog.buttons.cancel')}
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSubmit)} 
              disabled={createFacility.isPending || updateFacility.isPending || checkDuplicateName.isPending}
            >
              {checkDuplicateName.isPending ? 'Verificando...' : (
                isEditMode 
                  ? t('create_facility_dialog.buttons.update') 
                  : t('create_facility_dialog.buttons.create')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de advertencia de nombre duplicado */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={handleCancelCreate}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Nombre de Facility Ya Existe
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe{duplicateFacilities.length > 1 ? 'n' : ''} {duplicateFacilities.length} facility{duplicateFacilities.length > 1 ? 's' : ''} con el mismo nombre:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {duplicateFacilities.map((dup) => (
              <div key={dup.id} className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {dup.name}
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{dup.address}, {dup.city}, {dup.state} {dup.zip_code}</span>
                </div>
                {dup.contact_name && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Contacto: {dup.contact_name} {dup.contact_phone && `- ${dup.contact_phone}`}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">💡 Sugerencia:</p>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              Si es una ubicación diferente de la misma empresa, agregue información adicional al nombre:
            </p>
            <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 mt-1 ml-2">
              <li>"Amazon - Dallas Warehouse"</li>
              <li>"Amazon - Houston Distribution Center"</li>
              <li>"Job Site - Bridge Project I-95"</li>
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCreate}>
              Cancelar y Cambiar Nombre
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate} className="bg-yellow-600 hover:bg-yellow-700">
              Usar Este Nombre de Todos Modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
