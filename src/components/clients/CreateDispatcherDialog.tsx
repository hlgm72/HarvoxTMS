import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateContact, ClientContact } from "@/hooks/useClients";
import { createPhoneHandlers } from '@/lib/textUtils';
import { contactNameSchema, emailSchema, phoneSchema, notesSchema } from '@/lib/validationSchemas';

interface CreateDispatcherDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createDispatcherSchema = z.object({
  client_id: z.string(),
  name: contactNameSchema,
  email: emailSchema,
  phone_office: phoneSchema,
  phone_mobile: phoneSchema,
  extension: z.string().max(10, { message: "Extension must be less than 10 characters" }).optional().nullable(),
  notes: notesSchema,
  is_active: z.boolean(),
});

type CreateDispatcherForm = z.infer<typeof createDispatcherSchema>;

export function CreateDispatcherDialog({ clientId, open, onOpenChange }: CreateDispatcherDialogProps) {
  const createDispatcher = useCreateContact();
  
  const form = useForm<CreateDispatcherForm>({
    resolver: zodResolver(createDispatcherSchema),
    defaultValues: {
      client_id: clientId,
      name: "",
      email: "",
      phone_office: "",
      phone_mobile: "",
      extension: "",
      notes: "",
      is_active: true,
    },
  });

  const onSubmit = async (data: CreateDispatcherForm) => {
    try {
      // Ensure all required fields are present
      const submitData = {
        client_id: clientId,
        name: data.name,
        email: data.email || null,
        phone_office: data.phone_office || null,
        phone_mobile: data.phone_mobile || null,
        extension: data.extension || null,
        notes: data.notes || null,
        is_active: data.is_active,
      };
      
      await createDispatcher.mutateAsync(submitData);
      form.reset();
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
            Agregar Contacto
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo contacto o despachador para este cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej. María González" 
                      {...field} 
                      maxLength={100}
                    />
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
                        placeholder="email@ejemplo.com" 
                        {...field} 
                        value={field.value || ''}
                        maxLength={255}
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
                      <Input placeholder="1234" {...field} value={field.value || ''} maxLength={10} />
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
                      value={field.value || ''}
                      maxLength={1000}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{(field.value || '').length}/1000</p>
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
                disabled={createDispatcher.isPending}
                className="bg-gradient-fleet hover:opacity-90"
              >
                {createDispatcher.isPending ? "Creando..." : "Crear Contacto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
