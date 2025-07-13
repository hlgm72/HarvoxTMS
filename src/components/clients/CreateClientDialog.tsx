import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Building2, Users, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import { ClientLogoUpload } from "./ClientLogoUpload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateClient, useCreateDispatcher, Client, ClientDispatcher } from "@/hooks/useClients";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreateClientForm = Omit<Client, "id" | "created_at" | "updated_at"> & {
  dispatchers: Omit<ClientDispatcher, "id" | "broker_id" | "created_at" | "updated_at">[];
};

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const createClient = useCreateClient();
  const createDispatcher = useCreateDispatcher();
  
  const form = useForm<CreateClientForm>({
    defaultValues: {
      name: "",
      alias: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      logo_url: "",
      is_active: true,
      company_id: "", // This will be set automatically by the backend
      dispatchers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dispatchers",
  });

  const onSubmit = async (data: CreateClientForm) => {
    try {
      // Create the client first
      const { dispatchers, ...clientData } = data;
      const newClient = await createClient.mutateAsync(clientData);
      
      // Then create dispatchers if any
      for (const dispatcher of dispatchers) {
        await createDispatcher.mutateAsync({
          ...dispatcher,
          broker_id: newClient.id,
        });
      }
      
      form.reset();
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleNext = async () => {
    const isValidStep1 = await form.trigger(["name"]);
    if (isValidStep1) {
      setCurrentStep(2);
    }
  };

  const addDispatcher = () => {
    append({
      name: "",
      email: "",
      phone_office: "",
      phone_mobile: "",
      extension: "",
      notes: "",
      is_active: true,
    });
  };

  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-muted/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 1 ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            {currentStep === 1 ? "Crear Nuevo Cliente" : "Agregar Contactos"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 
              ? "Paso 1 de 2: Información básica del cliente"
              : "Paso 2 de 2: Agrega contactos y dispatchers (opcional)"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {currentStep === 1 && (
              <>
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
                          onLogoChange={(url) => field.onChange(url || "")}
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
                    rules={{ required: "El nombre es requerido" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Empresa *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. ABC Transport LLC" {...field} />
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
                        <FormLabel>Nombre Comercial / Alias</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. ABC Transport" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="correo@empresa.com"
                            {...field}
                          />
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
                          <Input placeholder="(555) 123-4567" {...field} />
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
                        <Input
                          placeholder="123 Main St, Ciudad, Estado, CP"
                          {...field}
                        />
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
                          placeholder="Información adicional sobre el cliente..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cliente Activo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          El cliente aparecerá en las listas de selección
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Contactos y Dispatchers</h3>
                      <p className="text-sm text-muted-foreground">
                        Agrega contactos para el cliente {form.watch("name")} (opcional)
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={addDispatcher}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Contacto
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-lg">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Sin contactos</h3>
                      <p className="text-muted-foreground mb-4">
                        Puedes agregar contactos ahora o hacerlo más tarde
                      </p>
                      <Button
                        type="button"
                        onClick={addDispatcher}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Primer Contacto
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Contacto {index + 1}</h4>
                            <Button
                              type="button"
                              onClick={() => remove(index)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`dispatchers.${index}.name`}
                              rules={{ required: "El nombre es requerido" }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre Completo *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej. María González" {...field} />
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
                                      placeholder="maria@empresa.com" 
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
                                    <Input placeholder="(555) 987-6543" {...field} />
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
                                    <Input placeholder="(555) 123-4567" {...field} />
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
                                    <Input placeholder="1234" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`dispatchers.${index}.notes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notas</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Información adicional..."
                                    rows={2}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              {currentStep === 1 ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    className="bg-gradient-fleet hover:opacity-90 gap-2"
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createClient.isPending || createDispatcher.isPending}
                    className="bg-gradient-fleet hover:opacity-90"
                  >
                    {(createClient.isPending || createDispatcher.isPending) ? "Creando..." : "Crear Cliente"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}