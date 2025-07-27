import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";

export interface Client {
  id: string;
  name: string;
  alias?: string;
  company_id: string;
  is_active: boolean;
  email_domain?: string;
  address?: string;
  notes?: string;
  logo_url?: string;
  mc_number?: string;
  dot_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email?: string;
  phone_office?: string;
  phone_mobile?: string;
  extension?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all clients for the current user's company
export const useClients = () => {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      // Get current user's company from user metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.company_id) {
        console.warn("⚠️ No company_id found in user metadata");
        return [];
      }

      const { data, error } = await supabase
        .from("company_clients")
        .select("id, name, alias, company_id, is_active, email_domain, address, notes, logo_url, mc_number, dot_number, created_at, updated_at")
        .eq("company_id", user.user_metadata.company_id)
        .order("name");

      if (error) {
        console.error("❌ Error fetching clients:", error);
        throw error;
      }
      console.log("🔍 Datos de clientes recibidos:", data);
      return data as Client[];
    },
  });
};

// Fetch contacts for a specific client
export const useClientContacts = (clientId: string) => {
  return useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("name");

      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });
};

// Get contact count for a specific client
export const useClientContactCount = (clientId: string) => {
  return useQuery({
    queryKey: ["client-contact-count", clientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("company_client_contacts")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!clientId,
  });
};

// Create a new client
export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (clientData: Omit<Client, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("company_clients")
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Cliente creado", "El cliente ha sido creado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo crear el cliente: ${error.message}`);
    },
  });
};

// Update a client
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("company_clients")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Cliente actualizado", "Los datos del cliente han sido actualizados exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo actualizar el cliente: ${error.message}`);
    },
  });
};

// Delete a client
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("company_clients")
        .delete()
        .eq("id", clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Cliente eliminado", "El cliente ha sido eliminado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo eliminar el cliente: ${error.message}`);
    },
  });
};

// Create a new contact
export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (contactData: Omit<ClientContact, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("company_client_contacts")
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", variables.client_id] });
      showSuccess("Contacto creado", "El contacto ha sido creado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo crear el contacto: ${error.message}`);
    },
  });
};

// Update a contact
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, client_id, ...updateData }: Partial<ClientContact> & { id: string; client_id: string }) => {
      const { data, error } = await supabase
        .from("company_client_contacts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", variables.client_id] });
      showSuccess("Contacto actualizado", "Los datos del contacto han sido actualizados exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo actualizar el contacto: ${error.message}`);
    },
  });
};

// Delete a contact
export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, client_id }: { id: string; client_id: string }) => {
      const { error } = await supabase
        .from("company_client_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { client_id };
    },
    onSuccess: (data) => {
      // Invalidar cache de contactos del cliente específico
      queryClient.invalidateQueries({ queryKey: ["client-contacts", data.client_id] });
      
      // Invalidar cache de company-clients para actualizar el wizard de cargas
      queryClient.invalidateQueries({ 
        queryKey: ['company-clients'],
        exact: false
      });
      
      showSuccess("Contacto eliminado", "El contacto ha sido eliminado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo eliminar el contacto: ${error.message}`);
    },
  });
};