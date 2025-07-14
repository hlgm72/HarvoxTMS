import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const equipmentQuery = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_equipment")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data as Equipment[];
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (newEquipment: CreateEquipmentData) => {
      // Get user's company_id from user_company_roles
      const { data: userRole, error: roleError } = await supabase
        .from("user_company_roles")
        .select("company_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("is_active", true)
        .single();

      if (roleError || !userRole) {
        throw new Error("No se pudo obtener información de la compañía");
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: t("equipment.created.title", "Equipo creado"),
        description: t("equipment.created.description", "El equipo se ha registrado exitosamente"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("equipment.error.title", "Error"),
        description: error.message || t("equipment.error.description", "No se pudo crear el equipo"),
        variant: "destructive",
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: t("equipment.updated.title", "Equipo actualizado"),
        description: t("equipment.updated.description", "Los cambios se han guardado exitosamente"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("equipment.error.title", "Error"),
        description: error.message || t("equipment.error.updateDescription", "No se pudo actualizar el equipo"),
        variant: "destructive",
      });
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
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: t("equipment.deleted.title", "Equipo eliminado"),
        description: t("equipment.deleted.description", "El equipo se ha eliminado exitosamente"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("equipment.error.title", "Error"),
        description: error.message || t("equipment.error.deleteDescription", "No se pudo eliminar el equipo"),
        variant: "destructive",
      });
    },
  });

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