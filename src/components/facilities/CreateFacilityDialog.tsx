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
import { Facility, useCreateFacility, useUpdateFacility, useCheckDuplicateFacility } from '@/hooks/useFacilities';

interface CreateFacilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facility?: Facility;
  initialName?: string;
}

export function CreateFacilityDialog({ isOpen, onClose, facility, initialName }: CreateFacilityDialogProps) {
  const { t } = useTranslation('facilities');
  const isEditMode = !!facility;

  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const checkDuplicate = useCheckDuplicateFacility();

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
        await updateFacility.mutateAsync({ id: facility.id, ...data });
        form.reset();
        onClose();
      } else {
        // Verificar si ya existe una facility similar
        const duplicates = await checkDuplicate.mutateAsync({
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zip_code,
        });

        if (duplicates && duplicates.length > 0) {
          // Mostrar diálogo de confirmación
          setDuplicateFacilities(duplicates);
          setPendingData(data);
          setShowDuplicateDialog(true);
        } else {
          // No hay duplicados, crear directamente
          await createFacility.mutateAsync(data as any);
          form.reset();
          onClose();
        }
      }
    } catch (error) {
      console.error('Error saving facility:', error);
    }
  };

  const handleConfirmCreate = async () => {
    try {
      if (pendingData) {
        await createFacility.mutateAsync(pendingData as any);
        form.reset();
        setShowDuplicateDialog(false);
        setPendingData(null);
        setDuplicateFacilities([]);
        onClose();
      }
    } catch (error) {
      console.error('Error creating facility:', error);
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
                        <Input placeholder={t('create_facility_dialog.placeholders.contact_phone')} {...field} />
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
              disabled={createFacility.isPending || updateFacility.isPending || checkDuplicate.isPending}
            >
              {checkDuplicate.isPending ? 'Verificando...' : (
                isEditMode 
                  ? t('create_facility_dialog.buttons.update') 
                  : t('create_facility_dialog.buttons.create')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de advertencia de duplicados */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={handleCancelCreate}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Facility Similar Encontrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe{duplicateFacilities.length > 1 ? 'n' : ''} {duplicateFacilities.length} facility{duplicateFacilities.length > 1 ? 's' : ''} con una dirección similar:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {duplicateFacilities.map((dup) => (
              <div key={dup.id} className="p-3 border rounded-lg bg-muted/50">
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

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCreate}>
              Cancelar y Revisar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate}>
              Crear de Todos Modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
