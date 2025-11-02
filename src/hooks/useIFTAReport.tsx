import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyCache } from "@/hooks/useCompanyCache";

interface IFTAVehicleData {
  vehicle_id: string | null;
  driver_user_id: string;
  driver_name: string;
  total_gallons: number;
  transaction_count: number;
  states: {
    state: string;
    gallons: number;
    transaction_count: number;
  }[];
}

interface IFTAStateSummary {
  state: string;
  total_gallons: number;
  transaction_count: number;
}

interface IFTAReportData {
  vehicles: IFTAVehicleData[];
  stateSummary: IFTAStateSummary[];
  totalGallons: number;
  totalTransactions: number;
}

interface UseIFTAReportParams {
  year: number;
  quarter: number;
}

export const useIFTAReport = ({ year, quarter }: UseIFTAReportParams) => {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const companyId = userCompany?.company_id;

  return useQuery({
    queryKey: ["ifta-report", companyId, year, quarter],
    queryFn: async (): Promise<IFTAReportData> => {
      if (!user?.id || !companyId) {
        throw new Error("User or company not found");
      }

      // Calculate quarter date range
      const startMonth = (quarter - 1) * 3;
      const endMonth = startMonth + 3;
      const startDate = new Date(year, startMonth, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59).toISOString();

      // Get all company drivers
      const { data: companyDrivers } = await supabase
        .from("user_company_roles")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!companyDrivers || companyDrivers.length === 0) {
        return {
          vehicles: [],
          stateSummary: [],
          totalGallons: 0,
          totalTransactions: 0,
        };
      }

      const driverIds = companyDrivers.map((d) => d.user_id);

      // Fetch fuel expenses with driver profiles
      const { data: expenses, error } = await supabase
        .from("fuel_expenses")
        .select(`
          id,
          vehicle_id,
          driver_user_id,
          gallons_purchased,
          station_state,
          profiles!fuel_expenses_driver_user_id_fkey (
            first_name,
            last_name
          )
        `)
        .in("driver_user_id", driverIds)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .filter("station_state", "not.is", null)
        .order("driver_user_id");

      if (error) throw error;

      // Group by vehicle/driver
      const vehicleMap = new Map<string, IFTAVehicleData>();
      const stateMap = new Map<string, IFTAStateSummary>();
      let totalGallons = 0;
      let totalTransactions = 0;

      expenses?.forEach((expense: any) => {
        const key = expense.vehicle_id || expense.driver_user_id;
        const gallons = parseFloat(expense.gallons_purchased) || 0;
        const state = expense.station_state;

        totalGallons += gallons;
        totalTransactions++;

        // Vehicle/Driver summary
        if (!vehicleMap.has(key)) {
          const profile = expense.profiles;
          vehicleMap.set(key, {
            vehicle_id: expense.vehicle_id,
            driver_user_id: expense.driver_user_id,
            driver_name: profile
              ? `${profile.first_name} ${profile.last_name}`
              : "Unknown Driver",
            total_gallons: 0,
            transaction_count: 0,
            states: [],
          });
        }

        const vehicleData = vehicleMap.get(key)!;
        vehicleData.total_gallons += gallons;
        vehicleData.transaction_count++;

        // State breakdown per vehicle
        const stateIndex = vehicleData.states.findIndex((s) => s.state === state);
        if (stateIndex === -1) {
          vehicleData.states.push({
            state,
            gallons,
            transaction_count: 1,
          });
        } else {
          vehicleData.states[stateIndex].gallons += gallons;
          vehicleData.states[stateIndex].transaction_count++;
        }

        // Overall state summary
        if (!stateMap.has(state)) {
          stateMap.set(state, {
            state,
            total_gallons: 0,
            transaction_count: 0,
          });
        }

        const stateSummary = stateMap.get(state)!;
        stateSummary.total_gallons += gallons;
        stateSummary.transaction_count++;
      });

      // Sort states within each vehicle
      vehicleMap.forEach((vehicle) => {
        vehicle.states.sort((a, b) => b.gallons - a.gallons);
      });

      return {
        vehicles: Array.from(vehicleMap.values()).sort(
          (a, b) => b.total_gallons - a.total_gallons
        ),
        stateSummary: Array.from(stateMap.values()).sort(
          (a, b) => b.total_gallons - a.total_gallons
        ),
        totalGallons,
        totalTransactions,
      };
    },
    enabled: !!user?.id && !!companyId,
  });
};
