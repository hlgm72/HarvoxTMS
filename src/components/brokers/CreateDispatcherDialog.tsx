import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { User, Phone, Mail, Building2 } from "lucide-react";
import { createPhoneHandlers } from '@/lib/textUtils';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const createDispatcherSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone_office: z.string().optional(),
  phone_mobile: z.string().optional(),
  extension: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CreateDispatcherForm = z.infer<typeof createDispatcherSchema>;

interface CreateDispatcherDialogProps {
  brokerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (dispatcherId: string) => void;
}

export function CreateDispatcherDialog({
  brokerId,
  isOpen,
  onClose,
  onSuccess
}: CreateDispatcherDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateDispatcherForm>({
    resolver: zodResolver(createDispatcherSchema),
    defaultValues: {
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
    if (!brokerId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un broker primero",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Crear el dispatcher
      const { data: newDispatcher, error } = await supabase
        .from('company_broker_dispatchers')
        .insert({
          broker_id: brokerId,
          name: data.name,
          email: data.email || null,
          phone_office: data.phone_office || null,
          phone_mobile: data.phone_mobile || null,
          extension: data.extension || null,
          notes: data.notes || null,
          is_active: data.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidar cache de brokers y refetch para actualizar dispatchers
      await queryClient.invalidateQueries({ 
        queryKey: ['company-brokers'],
        exact: false
      });
      
      await queryClient.refetchQueries({ 
        queryKey: ['company-brokers'],
        exact: false
      });

      toast({
        title: "Dispatcher creado exitosamente",
        description: `${data.name} ha sido agregado como dispatcher`,
      });

      // Limpiar formulario y cerrar
      form.reset();
      onClose();
      
      // Llamar callback de éxito si existe
      if (onSuccess && newDispatcher) {
        onSuccess(newDispatcher.id);
      }

    } catch (error) {
      console.error('Error creating dispatcher:', error);
      toast({
        title: "Error al crear dispatcher",
        description: "No se pudo crear el dispatcher. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Nuevo Dispatcher
          </DialogTitle>
          <DialogDescription>
            Agregar un nuevo contacto dispatcher para este broker
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nombre Completo *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="juan.perez@broker.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfonos en grid */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_office"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Teléfono Oficina
                    </FormLabel>
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
                name="phone_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Teléfono Móvil
                    </FormLabel>
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
            </div>

            {/* Extensión */}
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

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Información adicional sobre este dispatcher..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado activo */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Dispatcher Activo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      El dispatcher estará disponible para asignar a cargas
                    </div>
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

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {isSubmitting ? "Creando..." : "Crear Dispatcher"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}