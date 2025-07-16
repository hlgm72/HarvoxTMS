import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Users } from "lucide-react";
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
import { useUpdateDispatcher, ClientDispatcher } from "@/hooks/useClients";
import { createPhoneHandlers } from '@/lib/textUtils';

interface EditDispatcherDialogProps {
  dispatcher: ClientDispatcher;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UpdateDispatcherForm = Omit<ClientDispatcher, "created_at" | "updated_at">;

export function EditDispatcherDialog({ dispatcher, open, onOpenChange }: EditDispatcherDialogProps) {
  const updateDispatcher = useUpdateDispatcher();
  
  const form = useForm<UpdateDispatcherForm>({
    defaultValues: {
      id: dispatcher.id,
      broker_id: dispatcher.broker_id,
      name: dispatcher.name,
      email: dispatcher.email || "",
      phone_office: dispatcher.phone_office || "",
      phone_mobile: dispatcher.phone_mobile || "",
      extension: dispatcher.extension || "",
      notes: dispatcher.notes || "",
      is_active: dispatcher.is_active,
    },
  });

  useEffect(() => {
    if (dispatcher) {
      form.reset({
        id: dispatcher.id,
        broker_id: dispatcher.broker_id,
        name: dispatcher.name,
        email: dispatcher.email || "",
        phone_office: dispatcher.phone_office || "",
        phone_mobile: dispatcher.phone_mobile || "",
        extension: dispatcher.extension || "",
        notes: dispatcher.notes || "",
        is_active: dispatcher.is_active,
      });
    }
  }, [dispatcher, form]);

  const onSubmit = async (data: UpdateDispatcherForm) => {
    try {
      await updateDispatcher.mutateAsync(data);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Editar Contacto
          </DialogTitle>
          <DialogDescription>
            Actualiza la información del contacto.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
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
                name="phone_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Móvil</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 123-4567" 
                        value={field.value || ''}
                        {...createPhoneHandlers(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono Oficina</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(555) 987-6543" 
                        value={field.value || ''}
                        {...createPhoneHandlers(field.onChange)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extension"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre el contacto..."
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
                    <FormLabel className="text-base">Contacto Activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      El contacto aparecerá en las listas de selección
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

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateDispatcher.isPending}
                className="bg-gradient-fleet hover:opacity-90"
              >
                {updateDispatcher.isPending ? "Actualizando..." : "Actualizar Contacto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}