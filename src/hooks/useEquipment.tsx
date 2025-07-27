import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyCache } from "@/hooks/useCompanyCache";

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
  const { userCompany, isLoading: companyLoading } = useCompanyCache();

  console.log('🔧 useEquipment debug:', { 
    user: user?.id, 
    userCompany: userCompany?.company_id,
    companyLoading 
  });

  const equipmentQuery = useQuery({
    queryKey: ["equipment", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) {
        console.log('🔧 No company_id available');
        throw new Error("No se pudo obtener información de la compañía");
      }

      console.log('🔧 Fetching equipment for company:', userCompany.company_id);

      // Get equipment for user's company
      const { data, error } = await supabase
        .from("company_equipment")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('🔧 Equipment fetch error:', error);
        throw error;
      }

      console.log('🔧 Equipment fetched successfully:', data);
      return data as Equipment[];
    },
    enabled: !!userCompany?.company_id && !companyLoading,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (newEquipment: CreateEquipmentData) => {
      if (!userCompany?.company_id) {
        throw new Error("No se pudo obtener información de la compañía");
      }

      // Clean up data - convert empty strings to null for optional fields
      const cleanedData = {
        ...newEquipment,
        company_id: userCompany.company_id,
        status: newEquipment.status || "active",
        fuel_type: newEquipment.fuel_type || "diesel",
        equipment_type: newEquipment.equipment_type || "truck",
        // Convert empty strings to null for date fields
        license_plate_expiry_date: newEquipment.license_plate_expiry_date === "" ? null : newEquipment.license_plate_expiry_date,
        registration_expiry_date: newEquipment.registration_expiry_date === "" ? null : newEquipment.registration_expiry_date,
        insurance_expiry_date: newEquipment.insurance_expiry_date === "" ? null : newEquipment.insurance_expiry_date,
        annual_inspection_expiry_date: newEquipment.annual_inspection_expiry_date === "" ? null : newEquipment.annual_inspection_expiry_date,
        purchase_date: newEquipment.purchase_date === "" ? null : newEquipment.purchase_date,
        // Convert empty strings to null for other optional fields
        make: newEquipment.make === "" ? null : newEquipment.make,
        model: newEquipment.model === "" ? null : newEquipment.model,
        vin_number: newEquipment.vin_number === "" ? null : newEquipment.vin_number,
        license_plate: newEquipment.license_plate === "" ? null : newEquipment.license_plate,
        notes: newEquipment.notes === "" ? null : newEquipment.notes,
        year: newEquipment.year || null,
        current_mileage: newEquipment.current_mileage || null,
        purchase_price: newEquipment.purchase_price || null,
      };

      const { data, error } = await supabase
        .from("company_equipment")
        .insert(cleanedData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('🔧 Equipment created successfully:', data);
      // Update cache immediately by adding the new equipment to the list
      queryClient.setQueryData(["equipment", userCompany?.company_id], (oldData: Equipment[] | undefined) => {
        return oldData ? [data, ...oldData] : [data];
      });
      // Also invalidate for consistency
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-with-geotab"] });
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
      queryClient.invalidateQueries({ queryKey: ["equipment-with-geotab"] });
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
      
      return id; // Return the deleted id
    },
    onSuccess: (deletedId) => {
      console.log('🔧 Equipment deleted successfully');
      // Update cache immediately by removing the equipment from the list
      queryClient.setQueryData(["equipment", userCompany?.company_id], (oldData: Equipment[] | undefined) => {
        return oldData ? oldData.filter(equipment => equipment.id !== deletedId) : [];
      });
      // Also invalidate for consistency
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-with-geotab"] });
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
    if (!userCompany?.company_id) return;

    const channel = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_equipment'
        },
        () => {
          // Invalidate and refetch the equipment query
          queryClient.invalidateQueries({ queryKey: ["equipment"] });
          queryClient.invalidateQueries({ queryKey: ["equipment-with-geotab"] });
        }
      )
      .subscribe();

    // Force initial refresh
    queryClient.invalidateQueries({ queryKey: ["equipment"] });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userCompany?.company_id, queryClient]);

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