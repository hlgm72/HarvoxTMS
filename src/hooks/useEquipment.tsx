import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

export interface Equipment {
  id: string;
  company_id: string;
  equipment_number: string;
  equipment_type: string;
  make?: string;
  model?: string;
  year?: number;
  vin_number?: string;
  license_plate?: string;
  license_plate_expiry_date?: string;
  registration_expiry_date?: string;
  insurance_expiry_date?: string;
  annual_inspection_expiry_date?: string;
  fuel_type?: string;
  status: string;
  current_mileage?: number;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  geotab_vehicle_id?: string;
}

export interface CreateEquipmentData {
  equipment_number: string;
  equipment_type: string;
  make?: string;
  model?: string;
  year?: number;
  vin_number?: string;
  license_plate?: string;
  license_plate_expiry_date?: string;
  registration_expiry_date?: string;
  insurance_expiry_date?: string;
  annual_inspection_expiry_date?: string;
  fuel_type?: string;
  status?: string;
  current_mileage?: number;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
}

export function useEquipment() {
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const equipmentQuery = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      console.log('🔧 Fetching equipment data...');
      const { data, error } = await supabase
        .from("company_equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('🔧 Error fetching equipment:', error);
        throw error;
      }

      console.log('🔧 Equipment data fetched:', data?.length, 'items');
      return data as Equipment[];
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (newEquipment: CreateEquipmentData) => {
      // Get user's company_id from user_company_roles
      const { data: userRoles, error: roleError } = await supabase
        .from("user_company_roles")
        .select("company_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("is_active", true);

      if (roleError || !userRoles || userRoles.length === 0) {
        throw new Error("No se pudo obtener información de la compañía");
      }

      // Use the first company_id (or you could add logic to select the preferred company)
      const userRole = userRoles[0];

      const { data, error } = await supabase
        .from("company_equipment")
        .insert({
          ...newEquipment,
          company_id: userRole.company_id,
          status: newEquipment.status || "active",
          fuel_type: newEquipment.fuel_type || "diesel",
          equipment_type: newEquipment.equipment_type || "truck",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('🔧 Equipment created successfully:', data);
      // Force immediate refresh of equipment list
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.refetchQueries({ queryKey: ["equipment"] });
      showSuccess(
        t("equipment.created.title", "Equipo creado"),
        t("equipment.created.description", "El equipo se ha registrado exitosamente")
      );
    },
    onError: (error: any) => {
      showError(
        t("equipment.error.title", "Error"),
        error.message || t("equipment.error.description", "No se pudo crear el equipo")
      );
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateEquipmentData> }) => {
      const { data, error } = await supabase
        .from("company_equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('🔧 Equipment updated successfully:', data);
      // Force immediate refresh of equipment list
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.refetchQueries({ queryKey: ["equipment"] });
      showSuccess(
        t("equipment.updated.title", "Equipo actualizado"),
        t("equipment.updated.description", "Los cambios se han guardado exitosamente")
      );
    },
    onError: (error: any) => {
      showError(
        t("equipment.error.title", "Error"),
        error.message || t("equipment.error.updateDescription", "No se pudo actualizar el equipo")
      );
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("company_equipment")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      console.log('🔧 Equipment deleted successfully');
      // Force immediate refresh of equipment list
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.refetchQueries({ queryKey: ["equipment"] });
      showSuccess(
        t("equipment.deleted.title", "Equipo eliminado"),
        t("equipment.deleted.description", "El equipo se ha eliminado exitosamente")
      );
    },
    onError: (error: any) => {
      showError(
        t("equipment.error.title", "Error"),
        error.message || t("equipment.error.deleteDescription", "No se pudo eliminar el equipo")
      );
    },
  });

  // Set up real-time subscription to automatically refresh equipment list
  useEffect(() => {
    if (!user?.id) {
      console.log('🔧 User not authenticated, skipping realtime setup');
      return;
    }

    console.log('🔧 Setting up equipment realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel('equipment-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'company_equipment'
        },
        (payload) => {
          console.log('🔧 Equipment change detected:', payload.eventType, payload);
          
          // Invalidate and refetch the equipment query
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
          
          // Also manually refetch to ensure immediate update
          queryClient.refetchQueries({ queryKey: ["equipment"] });
        }
      )
      .subscribe((status) => {
        console.log('🔧 Equipment subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('🔧 ✅ Equipment realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('🔧 ❌ Equipment subscription error');
        }
      });

    return () => {
      console.log('🔧 Cleaning up equipment subscription...');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    equipment: equipmentQuery.data,
    isLoading: equipmentQuery.isLoading,
    error: equipmentQuery.error,
    createEquipment: createEquipmentMutation.mutate,
    updateEquipment: updateEquipmentMutation.mutate,
    deleteEquipment: deleteEquipmentMutation.mutate,
    isCreating: createEquipmentMutation.isPending,
    isUpdating: updateEquipmentMutation.isPending,
    isDeleting: deleteEquipmentMutation.isPending,
  };
}