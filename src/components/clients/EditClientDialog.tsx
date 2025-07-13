import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Building2 } from "lucide-react";
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
import { useUpdateClient, Client } from "@/hooks/useClients";

interface EditClientDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UpdateClientForm = Omit<Client, "created_at" | "updated_at">;

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const updateClient = useUpdateClient();
  
  const form = useForm<UpdateClientForm>({
    defaultValues: {
      id: client.id,
      name: client.name,
      alias: client.alias || "",
      company_id: client.company_id,
      email_domain: client.email_domain || "",
      address: client.address || "",
      notes: client.notes || "",
      logo_url: client.logo_url || "",
      is_active: client.is_active,
    },
  });

  // Reset form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        id: client.id,
        name: client.name,
        alias: client.alias || "",
        company_id: client.company_id,
        email_domain: client.email_domain || "",
        address: client.address || "",
        notes: client.notes || "",
        logo_url: client.logo_url || "",
        is_active: client.is_active,
      });
    }
  }, [client, form]);

  const onSubmit = async (data: UpdateClientForm) => {
    try {
      await updateClient.mutateAsync(data);
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
            <Building2 className="h-5 w-5" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Actualiza la información del cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="email_domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dominio de Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. empresa.com" {...field} />
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
                disabled={updateClient.isPending}
                className="bg-gradient-fleet hover:opacity-90"
              >
                {updateClient.isPending ? "Actualizando..." : "Actualizar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}