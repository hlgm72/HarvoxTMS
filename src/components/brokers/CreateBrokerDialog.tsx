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
import { FMCSALookupModal } from '@/components/brokers/FMCSALookupModal';

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

const createBrokerSchema = z.object({
  name: z.string().min(1, "Nombre del broker requerido"),
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

type CreateBrokerForm = z.infer<typeof createBrokerSchema>;

interface CreateBrokerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (brokerId: string) => void;
}

export function CreateBrokerDialog({ isOpen, onClose, onSuccess }: CreateBrokerDialogProps) {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [showFMCSAModal, setShowFMCSAModal] = useState(false);

  const form = useForm<CreateBrokerForm>({
    resolver: zodResolver(createBrokerSchema),
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

  const createBrokerMutation = useMutation({
    mutationFn: async (data: CreateBrokerForm) => {
      if (!user || !userCompany) {
        throw new Error('Usuario o compañía no encontrados');
      }

      // 1. Crear el broker
      const { data: broker, error: brokerError } = await supabase
        .from('company_brokers')
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

      if (brokerError) throw brokerError;

      // 2. Crear dispatchers si los hay
      if (data.dispatchers && data.dispatchers.length > 0) {
        const dispatchersToCreate = data.dispatchers
          .filter(d => d.name.trim()) // Solo crear dispatchers con nombre
          .map(dispatcher => ({
            broker_id: broker.id,
            name: dispatcher.name,
            email: dispatcher.email || null,
            phone_office: dispatcher.phone_office || null,
            phone_mobile: dispatcher.phone_mobile || null,
            extension: dispatcher.extension || null,
            notes: dispatcher.notes || null,
            is_active: true,
          }));

        if (dispatchersToCreate.length > 0) {
          const { error: dispatchersError } = await supabase
            .from('company_broker_dispatchers')
            .insert(dispatchersToCreate);

          if (dispatchersError) throw dispatchersError;
        }
      }

      return broker;
    },
    onSuccess: (broker) => {
      // Invalidar cache de brokers
      queryClient.invalidateQueries({ queryKey: ['company-brokers'] });
      
      toast({
        title: "Broker creado exitosamente",
        description: `${broker.name} ha sido agregado al sistema`,
      });

      // Resetear formulario y cerrar
      form.reset();
      setCurrentStep(1);
      onSuccess?.(broker.id);
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creando broker:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el broker. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateBrokerForm) => {
    createBrokerMutation.mutate(data);
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Crear Nuevo Broker
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo broker al sistema y opcionalmente sus dispatchers
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
            <span className="text-sm font-medium">Información del Broker</span>
          </div>
          
          <div className="w-8 h-px bg-border" />
          
          <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Dispatchers (Opcional)</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Broker Information */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Broker</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* FMCSA Search Button */}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFMCSAModal(true)}
                      className="gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Buscar en FMCSA
                    </Button>
                  </div>

                  {/* Logo Upload Section */}
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo del Broker</FormLabel>
                        <FormControl>
                          <ClientLogoUpload
                            logoUrl={field.value || undefined}
                            clientName={form.watch("name") || form.watch("alias")}
                            emailDomain={form.watch("email_domain")}
                            onLogoChange={(url) => field.onChange(url || "")}
                            disabled={createBrokerMutation.isPending}
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Broker *</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC Logistics Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alias / Nombre Corto</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC" {...field} />
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
                          <FormLabel>Teléfono Principal</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dominio de Email</FormLabel>
                          <FormControl>
                            <Input placeholder="abclogistics.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dot_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número DOT</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mc_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número MC</FormLabel>
                          <FormControl>
                            <Input placeholder="MC-123456" {...field} />
                          </FormControl>
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
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, Ciudad, Estado 12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional sobre el broker..."
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
            )}

            {/* Step 2: Dispatchers */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dispatchers
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDispatcher}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Dispatcher
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No hay dispatchers agregados</p>
                      <p className="text-xs">Los dispatchers son opcionales y se pueden agregar después</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <Badge variant="outline">Dispatcher {index + 1}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Juan Pérez" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email" 
                                    placeholder="juan@abclogistics.com" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.phone_office`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teléfono Oficina</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.phone_mobile`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teléfono Móvil</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 987-6543" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.extension`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Extensión</FormLabel>
                                <FormControl>
                                  <Input placeholder="123" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notas</FormLabel>
                                <FormControl>
                                  <Input placeholder="Información adicional..." {...field} />
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
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                
                {currentStep < 2 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createBrokerMutation.isPending}
                  >
                    {createBrokerMutation.isPending ? 'Creando...' : 'Crear Broker'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* FMCSA Lookup Modal */}
      <FMCSALookupModal
        isOpen={showFMCSAModal}
        onClose={() => setShowFMCSAModal(false)}
        onDataFound={(data) => {
          // Aplicar los datos al formulario
          Object.entries(data).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
              form.setValue(key as keyof CreateBrokerForm, value);
            }
          });
        }}
      />
    </Dialog>
  );
}