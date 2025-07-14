import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from "react-i18next";

export interface GeotabVehicle {
  id: string;
  geotab_id: string;
  name: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  device_serial_number?: string;
  created_at: string;
  updated_at: string;
}

export interface GeotabVehiclePosition {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  bearing?: number;
  odometer?: number;
  engine_hours?: number;
  date_time: string;
  geotab_device_id: string;
  created_at: string;
}

export function useGeotabVehicles() {
  const { showSuccess, showError } = useFleetNotifications();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Get all Geotab vehicles
  const geotabVehiclesQuery = useQuery({
    queryKey: ["geotab-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geotab_vehicles")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      return data as GeotabVehicle[];
    },
  });

  // Get Geotab vehicles with their latest positions
  const geotabVehiclesWithPositionsQuery = useQuery({
    queryKey: ["geotab-vehicles-with-positions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geotab_vehicles")
        .select(`
          *,
          geotab_vehicle_positions!inner (
            latitude,
            longitude,
            speed,
            bearing,
            odometer,
            engine_hours,
            date_time,
            geotab_device_id
          )
        `)
        .order("name");

      if (error) {
        throw error;
      }

      // Get only the latest position for each vehicle
      const vehiclesWithLatestPosition = data.map(vehicle => {
        const positions = vehicle.geotab_vehicle_positions || [];
        const latestPosition = positions.sort((a, b) => 
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
        )[0];

        return {
          ...vehicle,
          latest_position: latestPosition || null
        };
      });

      return vehiclesWithLatestPosition;
    },
  });

  // Link equipment to Geotab vehicle
  const linkEquipmentMutation = useMutation({
    mutationFn: async ({ equipmentId, geotabVehicleId }: { equipmentId: string; geotabVehicleId: string | null }) => {
      const { data, error } = await supabase
        .from("company_equipment")
        .update({ geotab_vehicle_id: geotabVehicleId })
        .eq("id", equipmentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["geotab-vehicles"] });
      showSuccess(
        t("equipment.geotab.linked.title", "Vinculación exitosa"),
        t("equipment.geotab.linked.description", "El equipo se ha vinculado con el vehículo de Geotab")
      );
    },
    onError: (error: any) => {
      showError(
        t("equipment.geotab.error.title", "Error de vinculación"),
        error.message || t("equipment.geotab.error.description", "No se pudo vincular el equipo")
      );
    },
  });

  // Get equipment with their linked Geotab vehicles and positions
  const equipmentWithGeotabQuery = useQuery({
    queryKey: ["equipment-with-geotab"],
    queryFn: async () => {
      // First get all equipment
      const { data: equipment, error: equipmentError } = await supabase
        .from("company_equipment")
        .select("*")
        .order("equipment_number");

      if (equipmentError) {
        throw equipmentError;
      }

      // Then get the linked Geotab vehicles with their latest positions
      const equipmentWithGeotabData = await Promise.all(
        equipment.map(async (item) => {
          if (!item.geotab_vehicle_id) {
            return { ...item, geotab_vehicle: null };
          }

          // Get the linked Geotab vehicle
          const { data: geotabVehicle, error: vehicleError } = await supabase
            .from("geotab_vehicles")
            .select("*")
            .eq("id", item.geotab_vehicle_id)
            .single();

          if (vehicleError || !geotabVehicle) {
            return { ...item, geotab_vehicle: null };
          }

          // Get the latest position for this vehicle
          const { data: positions, error: positionsError } = await supabase
            .from("geotab_vehicle_positions")
            .select("*")
            .eq("vehicle_id", geotabVehicle.id)
            .order("date_time", { ascending: false })
            .limit(1);

          const latestPosition = positions && positions.length > 0 ? positions[0] : null;

          return {
            ...item,
            geotab_vehicle: {
              ...geotabVehicle,
              latest_position: latestPosition
            }
          };
        })
      );

      return equipmentWithGeotabData;
    },
  });

  return {
    geotabVehicles: geotabVehiclesQuery.data,
    geotabVehiclesWithPositions: geotabVehiclesWithPositionsQuery.data,
    equipmentWithGeotab: equipmentWithGeotabQuery.data,
    isLoadingGeotabVehicles: geotabVehiclesQuery.isLoading,
    isLoadingEquipmentWithGeotab: equipmentWithGeotabQuery.isLoading,
    linkEquipment: linkEquipmentMutation.mutate,
    isLinking: linkEquipmentMutation.isPending,
  };
}