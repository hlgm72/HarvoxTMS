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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    facility_type: z.enum(['shipper', 'receiver', 'both']),
    address: z.string().min(1, t('create_facility_dialog.validation.address_required')),
    city: z.string().min(1, t('create_facility_dialog.validation.city_required')),
    state: z.string().min(1, t('create_facility_dialog.validation.state_required')),
    zip_code: z.string().min(1, t('create_facility_dialog.validation.zip_code_required')),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().email(t('create_facility_dialog.validation.email_invalid')).optional().or(z.literal("")),
    notes: z.string().optional(),
    is_active: z.boolean().default(true),
  });

  type FacilityForm = z.infer<typeof facilitySchema>;

  const form = useForm<FacilityForm>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      facility_type: 'both',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (facility) {
        form.reset({
          name: facility.name,
          facility_type: facility.facility_type,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zip_code: facility.zip_code,
          contact_name: facility.contact_name || '',
          contact_phone: facility.contact_phone || '',
          contact_email: facility.contact_email || '',
          notes: facility.notes || '',
          is_active: facility.is_active,
        });
      } else {
        form.reset({
          name: '',
          facility_type: 'both',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditMode ? t('create_facility_dialog.edit_title') : t('create_facility_dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t('create_facility_dialog.edit_description') : t('create_facility_dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="facility_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.type_required')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('create_facility_dialog.form.type_required')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="shipper">{t('facility_type.shipper')}</SelectItem>
                        <SelectItem value="receiver">{t('facility_type.receiver')}</SelectItem>
                        <SelectItem value="both">{t('facility_type.both')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('create_facility_dialog.form.address_required')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('create_facility_dialog.placeholders.address')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.city_required')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('create_facility_dialog.placeholders.city')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.state_required')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('create_facility_dialog.placeholders.state')} 
                        {...field}
                        value={field.value.toUpperCase()}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        maxLength={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.zip_code_required')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('create_facility_dialog.placeholders.zip_code')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('create_facility_dialog.form.contact_email')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('create_facility_dialog.placeholders.contact_email')} {...field} />
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

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('create_facility_dialog.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={createFacility.isPending || updateFacility.isPending}>
                {isEditMode 
                  ? t('create_facility_dialog.buttons.update') 
                  : t('create_facility_dialog.buttons.create')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
