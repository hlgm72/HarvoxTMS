import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AddressForm } from '@/components/ui/AddressForm';
import { Facility, useCreateFacility, useUpdateFacility } from '@/hooks/useFacilities';

interface CreateFacilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  facility?: Facility;
}

export function CreateFacilityDialog({ isOpen, onClose, facility }: CreateFacilityDialogProps) {
  const { t } = useTranslation('facilities');
  const isEditMode = !!facility;

  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();

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
          name: '',
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
  }, [isOpen, facility]);

  const handleSubmit = async (data: FacilityForm) => {
    try {
      if (isEditMode && facility) {
        await updateFacility.mutateAsync({ id: facility.id, ...data });
      } else {
        await createFacility.mutateAsync(data as any);
      }
      form.reset();
      onClose();
    } catch (error) {
      console.error('Error saving facility:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
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
                        value={field.value.toUpperCase()}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
            disabled={createFacility.isPending || updateFacility.isPending}
          >
            {isEditMode 
              ? t('create_facility_dialog.buttons.update') 
              : t('create_facility_dialog.buttons.create')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
