import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useToast } from '@/hooks/use-toast';
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

const dispatcherSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone_office: z.string().optional(),
  phone_mobile: z.string().optional(),
  extension: z.string().optional(),
  notes: z.string().optional(),
});

const createClientSchema = z.object({
  name: z.string().min(1, "Nombre del cliente requerido"),
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

interface CreateClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (brokerId: string) => void;
}

export function CreateClientDialog({ isOpen, onClose, onSuccess }: CreateClientDialogProps) {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showFMCSAModal, setShowFMCSAModal] = useState(false);

  const form = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      alias: '',
      phone: '',
      dot_number: '',
      mc_number: '',
      address: '',
      email_domain: '',
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
        throw new Error('Usuario o compañía no encontrados');
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
      
      toast({
        title: "Cliente creado exitosamente",
        description: `${client.name} ha sido agregado al sistema`,
      });

      // Resetear formulario y cerrar
      form.reset();
      setCurrentStep(1);
      onSuccess?.(client.id);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creando cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente. Intenta nuevamente.",
        variant: "destructive",
      });
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
    });
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
            Crear Nuevo Cliente
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo cliente al sistema y opcionalmente sus contactos
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
            <span className="text-sm font-medium">Información del Cliente</span>
          </div>
          
          <div className="w-8 h-px bg-border" />
          
          <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Contactos (Opcional)</span>
          </div>
        </div>

        <Form {...form}>
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Step 1: Broker Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Información del Cliente</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFMCSAModal(true)}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Buscar en FMCSA
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
                        <FormLabel>Logo del Cliente</FormLabel>
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
                             <FormLabel>Nombre del Cliente *</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="ABC Logistics Inc." 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onBlur={handlers.onBlur}
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
                             <FormLabel>Alias / Nombre Corto</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="ABC" 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onBlur={handlers.onBlur}
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
                             <FormLabel>Teléfono Principal</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="(555) 123-4567" 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
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
                         const handlers = createTextHandlers((value) => field.onChange(value.toLowerCase()), 'email');
                         return (
                           <FormItem>
                             <FormLabel>Dominio de Email</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="abclogistics.com" 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onBlur={handlers.onBlur}
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
                             <FormLabel>Número DOT</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="1234567" 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
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
                             <FormLabel>Número MC</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="MC-123456" 
                                 value={field.value}
                                 onChange={handlers.onChange}
                                 onKeyPress={handlers.onKeyPress}
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
                           <FormLabel>Dirección</FormLabel>
                           <FormControl>
                             <Input 
                               placeholder="123 Main St, Ciudad, Estado 12345" 
                               value={field.value}
                               onChange={handlers.onChange}
                               onBlur={handlers.onBlur}
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
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional sobre el cliente..."
                            className="min-h-[80px]"
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
                    Cancelar
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleNextStep}
                  >
                    Siguiente
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
                       Contactos de Cliente
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDispatcher}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Contacto
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="mx-auto h-8 w-8 mb-2" />
                       <p>No hay contactos agregados</p>
                       <p className="text-sm">Puedes agregar contactos o continuar sin ellos</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Contacto {index + 1}</h4>
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
                                  <FormLabel>Nombre *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Juan Pérez"
                                      value={field.value}
                                      onChange={handlers.onChange}
                                      onBlur={handlers.onBlur}
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
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Mail className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                      <Input
                                        type="email"
                                        placeholder="juan@empresa.com"
                                        value={field.value}
                                        onChange={handlers.onChange}
                                        onBlur={handlers.onBlur}
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
                                  <FormLabel>Teléfono Oficina</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Phone className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                      <Input
                                        placeholder="(555) 123-4567"
                                        value={field.value}
                                        onChange={handlers.onChange}
                                        onKeyPress={handlers.onKeyPress}
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
                                  <FormLabel>Teléfono Móvil</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Phone className="mr-2 h-4 w-4 self-center text-muted-foreground" />
                                      <Input
                                        placeholder="(555) 987-6543"
                                        value={field.value}
                                        onChange={handlers.onChange}
                                        onKeyPress={handlers.onKeyPress}
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
                                <FormLabel>Extensión</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="123"
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
                                <FormLabel>Notas</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Información adicional..."
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
                  Anterior
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? 'Creando...' : 'Crear Cliente'}
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