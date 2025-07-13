import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";

export interface Client {
  id: string;
  name: string;
  company_id: string;
  is_active: boolean;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDispatcher {
  id: string;
  broker_id: string;
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
      const { data, error } = await supabase
        .from("company_brokers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Client[];
    },
  });
};

// Fetch dispatchers for a specific client
export const useClientDispatchers = (clientId: string) => {
  return useQuery({
    queryKey: ["client-dispatchers", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_broker_dispatchers")
        .select("*")
        .eq("broker_id", clientId)
        .order("name");

      if (error) throw error;
      return data as ClientDispatcher[];
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
        .from("company_brokers")
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
        .from("company_brokers")
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
        .from("company_brokers")
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

// Create a new dispatcher
export const useCreateDispatcher = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async (dispatcherData: Omit<ClientDispatcher, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("company_broker_dispatchers")
        .insert([dispatcherData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-dispatchers", variables.broker_id] });
      showSuccess("Contacto creado", "El contacto ha sido creado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo crear el contacto: ${error.message}`);
    },
  });
};

// Update a dispatcher
export const useUpdateDispatcher = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, broker_id, ...updateData }: Partial<ClientDispatcher> & { id: string; broker_id: string }) => {
      const { data, error } = await supabase
        .from("company_broker_dispatchers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-dispatchers", variables.broker_id] });
      showSuccess("Contacto actualizado", "Los datos del contacto han sido actualizados exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo actualizar el contacto: ${error.message}`);
    },
  });
};

// Delete a dispatcher
export const useDeleteDispatcher = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useFleetNotifications();

  return useMutation({
    mutationFn: async ({ id, broker_id }: { id: string; broker_id: string }) => {
      const { error } = await supabase
        .from("company_broker_dispatchers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { broker_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-dispatchers", data.broker_id] });
      showSuccess("Contacto eliminado", "El contacto ha sido eliminado exitosamente.");
    },
    onError: (error) => {
      showError("Error", `No se pudo eliminar el contacto: ${error.message}`);
    },
  });
};