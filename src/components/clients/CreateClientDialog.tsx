import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useFleetNotifications } from '@/components/notifications';
import { ClientLogoUpload } from '@/components/clients/ClientLogoUpload';
import { FMCSALookupModal } from '@/components/clients/FMCSALookupModal';
import { createTextHandlers, createPhoneHandlers, createMCHandlers, createDOTHandlers } from '@/lib/textUtils';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Plus, Trash2, Phone, Mail, Search } from 'lucide-react';

interface CreateClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (brokerId: string) => void;
}

export function CreateClientDialog({ isOpen, onClose, onSuccess }: CreateClientDialogProps) {
  const { t } = useTranslation('clients');
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showFMCSAModal, setShowFMCSAModal] = useState(false);

  const dispatcherSchema = z.object({
    name: z.string().min(1, t('create_client_dialog.validation.name_required')),
    email: z.string().email(t('create_client_dialog.validation.email_invalid')).optional().or(z.literal("")),
    phone_office: z.string().optional(),
    phone_mobile: z.string().optional(),
    extension: z.string().optional(),
    notes: z.string().optional(),
  });

  const createClientSchema = z.object({
    name: z.string().min(1, t('create_client_dialog.validation.client_name_required')),
    alias: z.string().optional(),
    phone: z.string().optional(),
    dot_number: z.string().optional(),
    mc_number: z.string().optional(),
    address: z.string().optional(),
    email_domain: z.string().optional(),
    logo_url: z.string().optional(),
    notes: z.string().optional(),
    dispatchers: z.array(dispatcherSchema).optional(),
  });

  type CreateClientForm = z.infer<typeof createClientSchema>;

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      alias: '',
      phone: '',
      dot_number: '',
      mc_number: '',
      address: '',
      email_domain: '@',
      logo_url: '',
      notes: '',
      dispatchers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dispatchers",
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientForm) => {
      if (!user || !userCompany) {
        throw new Error(t('create_client_dialog.messages.user_not_found'));
      }

      // 1. Crear el cliente
      const { data: client, error: clientError } = await supabase
        .from('company_clients')
        .insert([{
          company_id: userCompany.company_id,
          name: data.name,
          alias: data.alias || null,
          phone: data.phone || null,
          dot_number: data.dot_number || null,
          mc_number: data.mc_number || null,
          address: data.address || null,
          email_domain: data.email_domain || null,
          logo_url: data.logo_url || null,
          notes: data.notes || null,
          is_active: true,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Crear contactos si los hay
      if (data.dispatchers && data.dispatchers.length > 0) {
        const contactsToCreate = data.dispatchers
          .filter(d => d.name.trim()) // Solo crear contactos con nombre
          .map(contact => ({
            client_id: client.id,
            name: contact.name,
            email: contact.email || null,
            phone_office: contact.phone_office || null,
            phone_mobile: contact.phone_mobile || null,
            extension: contact.extension || null,
            notes: contact.notes || null,
            is_active: true,
          }));

        if (contactsToCreate.length > 0) {
          const { error: contactsError } = await supabase
            .from('company_client_contacts')
            .insert(contactsToCreate);

          if (contactsError) throw contactsError;
        }
      }

      return client;
    },
    onSuccess: (client) => {
      // Invalidar TODAS las queries relacionadas con clientes
      queryClient.invalidateQueries({ 
        queryKey: ['company-clients'],
        exact: false
      });
      // También refrescar directamente
      queryClient.refetchQueries({ 
        queryKey: ['company-clients'],
        exact: false
      });
      
      showSuccess(
        t('create_client_dialog.messages.success_title'),
        t('create_client_dialog.messages.success_description', { clientName: client.name })
      );

      // Resetear formulario y cerrar
      form.reset();
      setCurrentStep(1);
      onSuccess?.(client.id);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creando cliente:', error);
      showError(
        t('create_client_dialog.messages.error_title'),
        t('create_client_dialog.messages.error_description')
      );
    },
  });

  const handleSubmitForm = (data: CreateClientForm) => {
    createClientMutation.mutate(data);
  };

  const addDispatcher = () => {
    append({
      name: '',
      email: '',
      phone_office: '',
      phone_mobile: '',
      extension: '',
      notes: '',
    }, { shouldFocus: false });
  };

  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
    onClose();
  };

  const handleNextStep = () => {
    setCurrentStep(2);
  };

  return (
    <Dialog open={isOpen && !showFMCSAModal} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('create_client_dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('create_client_dialog.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">{t('create_client_dialog.steps.client_info')}</span>
          </div>
          
          <div className="w-8 h-px bg-border" />
          
          <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">{t('create_client_dialog.steps.contacts')}</span>
          </div>
        </div>

        <Form {...form}>
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Step 1: Client Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('create_client_dialog.steps.client_info')}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFMCSAModal(true)}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      {t('create_client_dialog.form.fmcsa_lookup')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo Upload Section */}
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('create_client_dialog.form.logo_section')}</FormLabel>
                        <FormControl>
                          <ClientLogoUpload
                            logoUrl={field.value || undefined}
                            clientName={form.watch("name") || form.watch("alias")}
                            emailDomain={form.watch("email_domain")}
                            onLogoChange={(url) => field.onChange(url || "")}
                            disabled={createClientMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                       control={form.control}
                       name="name"
                       render={({ field }) => {
                         const handlers = createTextHandlers(field.onChange, 'text');
                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.client_name_required')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.client_name')} 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onBlur={handlers.onBlur}
                                 tabIndex={1}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />

                     <FormField
                       control={form.control}
                       name="alias"
                       render={({ field }) => {
                         const handlers = createTextHandlers(field.onChange, 'text');
                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.alias')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.alias')} 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onBlur={handlers.onBlur}
                                 tabIndex={2}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />

                     <FormField
                       control={form.control}
                       name="phone"
                       render={({ field }) => {
                         const handlers = createPhoneHandlers(field.onChange);
                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.phone')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.phone')} 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
                                 tabIndex={3}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />

                     <FormField
                       control={form.control}
                       name="email_domain"
                       render={({ field }) => {
                         const handleEmailDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                           let value = e.target.value;
                           // Asegurar que siempre comience con @
                           if (!value.startsWith('@')) {
                             value = '@' + value.replace('@', '');
                           }
                           // Limpiar espacios y convertir a minúsculas
                           value = value.replace(/\s/g, '').toLowerCase();
                           field.onChange(value);
                         };

                         const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                           // Prevenir borrar el @ si el cursor está al principio
                           if ((e.key === 'Backspace' || e.key === 'Delete') && 
                               e.currentTarget.selectionStart === 1 && 
                               field.value.startsWith('@')) {
                             e.preventDefault();
                           }
                         };

                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.email_domain')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.email_domain')} 
                                 value={field.value}
                                 onChange={handleEmailDomainChange}
                                 onKeyDown={handleKeyDown}
                                 tabIndex={4}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />

                     <FormField
                       control={form.control}
                       name="dot_number"
                       render={({ field }) => {
                         const handlers = createDOTHandlers(field.onChange);
                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.dot_number')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.dot_number')} 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
                                 tabIndex={5}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />

                     <FormField
                       control={form.control}
                       name="mc_number"
                       render={({ field }) => {
                         const handlers = createMCHandlers(field.onChange);
                         return (
                           <FormItem>
                             <FormLabel>{t('create_client_dialog.form.mc_number')}</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder={t('create_client_dialog.placeholders.mc_number')} 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
                                 tabIndex={6}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         );
                       }}
                     />
                  </div>

                   <FormField
                     control={form.control}
                     name="address"
                     render={({ field }) => {
                       const handlers = createTextHandlers(field.onChange, 'text');
                       return (
                         <FormItem>
                           <FormLabel>{t('create_client_dialog.form.address')}</FormLabel>
                           <FormControl>
                             <Input 
                               placeholder={t('create_client_dialog.placeholders.address')} 
                               value={field.value}
                               onChange={handlers.onChange}
                               onBlur={handlers.onBlur}
                               tabIndex={7}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       );
                     }}
                   />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('create_client_dialog.form.notes')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('create_client_dialog.placeholders.notes')}
                            className="min-h-[80px]"
                            tabIndex={8}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons for Step 1 */}
              <div className="flex justify-between">
                <div></div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t('create_client_dialog.buttons.cancel')}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleNextStep}
                  >
                    {t('create_client_dialog.buttons.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
              {/* Step 2: Dispatchers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('create_client_dialog.dispatcher_section.title')}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDispatcher}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('create_client_dialog.buttons.add_contact')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="mx-auto h-8 w-8 mb-2" />
                      <p>{t('create_client_dialog.dispatcher_section.no_contacts')}</p>
                      <p className="text-sm">{t('create_client_dialog.dispatcher_section.add_first')}</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">{t('create_client_dialog.contact_label', { index: index + 1 })}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.name`}
                            render={({ field }) => {
                              const handlers = createTextHandlers(field.onChange, 'text');
                              return (
                                <FormItem>
                                  <FormLabel>{t('create_client_dialog.dispatcher_form.name')} *</FormLabel>
                                  <FormControl>
                                     <Input
                                       placeholder={t('create_client_dialog.dispatcher_placeholders.name')}
                                       value={field.value}
                                       onChange={handlers.onChange}
                                       onBlur={handlers.onBlur}
                                       autoFocus={false}
                                     />
                                   </FormControl>
                                   <FormMessage />
                                 </FormItem>
                               );
                             }}
                           />

                           <FormField
                             control={form.control}
                             name={`dispatchers.${index}.email`}
                             render={({ field }) => {
                               const handlers = createTextHandlers(field.onChange, 'email');
                               return (
                                 <FormItem>
                                   <FormLabel>{t('create_client_dialog.dispatcher_form.email')}</FormLabel>
                                   <FormControl>
                                     <div className="flex">
                                       <Mail className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                       <Input
                                         type="email"
                                         placeholder={t('create_client_dialog.dispatcher_placeholders.email')}
                                         value={field.value}
                                        onChange={handlers.onChange}
                                        onBlur={handlers.onBlur}
                                        autoFocus={false}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.phone_office`}
                            render={({ field }) => {
                              const handlers = createPhoneHandlers(field.onChange);
                              return (
                                <FormItem>
                                  <FormLabel>{t('create_client_dialog.dispatcher_form.phone_office')}</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Phone className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                      <Input
                                        placeholder={t('create_client_dialog.dispatcher_placeholders.phone_office')}
                                        value={field.value}
                                        onChange={handlers.onChange}
                                        onKeyPress={handlers.onKeyPress}
                                        autoFocus={false}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.phone_mobile`}
                            render={({ field }) => {
                              const handlers = createPhoneHandlers(field.onChange);
                              return (
                                <FormItem>
                                  <FormLabel>{t('create_client_dialog.dispatcher_form.phone_mobile')}</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Phone className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                      <Input
                                        placeholder={t('create_client_dialog.dispatcher_placeholders.phone_mobile')}
                                        value={field.value}
                                        onChange={handlers.onChange}
                                        onKeyPress={handlers.onKeyPress}
                                        autoFocus={false}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.extension`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('create_client_dialog.dispatcher_form.extension')}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={t('create_client_dialog.dispatcher_placeholders.extension')}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.notes`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>{t('create_client_dialog.dispatcher_form.notes')}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={t('create_client_dialog.dispatcher_placeholders.notes')}
                                    className="min-h-[60px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons for Step 2 */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  {t('create_client_dialog.buttons.previous')}
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t('create_client_dialog.buttons.cancel')}
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? t('create_client_dialog.buttons.creating') : t('create_client_dialog.buttons.create_client')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Form>
      </DialogContent>

      {/* FMCSA Lookup Modal - Renderizado independiente */}
      {isOpen && (
        <FMCSALookupModal
          isOpen={showFMCSAModal}
          onClose={() => setShowFMCSAModal(false)}
          onDataFound={(data) => {
            // Aplicar los datos al formulario
            Object.entries(data).forEach(([key, value]) => {
              if (value && typeof value === 'string') {
                form.setValue(key as keyof CreateClientForm, value);
              }
            });
          }}
        />
      )}
    </Dialog>
  );
}