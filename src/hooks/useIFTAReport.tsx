import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyCache } from "@/hooks/useCompanyCache";

interface IFTATransaction {
  id: string;
  transaction_date: string;
  station_name: string | null;
  gallons: number;
  price_per_gallon: number | null;
  total_amount: number | null;
}

interface IFTAVehicleData {
  vehicle_id: string | null;
  vehicle_number: string | null;
  driver_user_id: string;
  driver_name: string;
  total_gallons: number;
  transaction_count: number;
  states: {
    state: string;
    gallons: number;
    transaction_count: number;
    transactions: IFTATransaction[];
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

export const useIFTAAvailableYears = () => {
  const { user } = useAuth();
  const { userCompany } = useCompanyCache();
  const companyId = userCompany?.company_id;

  return useQuery({
    queryKey: ["ifta-available-years", companyId],
    queryFn: async (): Promise<number[]> => {
      if (!user?.id || !companyId) {
        return [];
      }

      // Get all company drivers
      const { data: companyDrivers } = await supabase
        .from("user_company_roles")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!companyDrivers || companyDrivers.length === 0) {
        return [];
      }

      const driverIds = companyDrivers.map((d) => d.user_id);

      // Get distinct years from fuel_expenses
      const { data: expenses } = await supabase
        .from("fuel_expenses")
        .select("transaction_date")
        .in("driver_user_id", driverIds)
        .not("station_state", "is", null)
        .order("transaction_date", { ascending: false });

      if (!expenses || expenses.length === 0) {
        return [];
      }

      // Extract unique years
      const yearsSet = new Set<number>();
      expenses.forEach((expense: any) => {
        const year = new Date(expense.transaction_date).getFullYear();
        yearsSet.add(year);
      });

      // Convert to sorted array (most recent first)
      return Array.from(yearsSet).sort((a, b) => b - a);
    },
    enabled: !!user?.id && !!companyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

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

      // Fetch fuel expenses with additional fields
      const { data: expenses, error } = await supabase
        .from("fuel_expenses")
        .select("id, vehicle_id, driver_user_id, gallons_purchased, station_state, transaction_date, station_name, price_per_gallon, total_amount")
        .in("driver_user_id", driverIds)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("driver_user_id");

      if (error) throw error;

      // Filter out expenses without state
      const filteredExpenses = expenses?.filter((exp: any) => exp.station_state !== null) || [];

      // Fetch driver profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", driverIds);

      // Create a map of profiles for quick lookup
      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`]) || []
      );

      // Fetch vehicle information for expenses with vehicle_id
      const vehicleIds = [...new Set(filteredExpenses.filter((exp: any) => exp.vehicle_id).map((exp: any) => exp.vehicle_id))];
      const { data: vehicles } = await supabase
        .from("company_equipment")
        .select("id, equipment_number")
        .in("id", vehicleIds);

      // Create a map of vehicles for quick lookup
      const vehicleMapLookup = new Map(
        vehicles?.map((v) => [v.id, v.equipment_number]) || []
      );

      // Group by vehicle/driver
      const vehicleMap = new Map<string, IFTAVehicleData>();
      const stateMap = new Map<string, IFTAStateSummary>();
      let totalGallons = 0;
      let totalTransactions = 0;

      filteredExpenses.forEach((expense: any) => {
        const key = expense.vehicle_id || expense.driver_user_id;
        const gallons = parseFloat(expense.gallons_purchased) || 0;
        const state = expense.station_state;

        totalGallons += gallons;
        totalTransactions++;

        // Vehicle/Driver summary
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            vehicle_id: expense.vehicle_id,
            vehicle_number: expense.vehicle_id ? vehicleMapLookup.get(expense.vehicle_id) || null : null,
            driver_user_id: expense.driver_user_id,
            driver_name: profileMap.get(expense.driver_user_id) || "Unknown Driver",
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
        const transaction: IFTATransaction = {
          id: expense.id,
          transaction_date: expense.transaction_date,
          station_name: expense.station_name,
          gallons,
          price_per_gallon: expense.price_per_gallon ? parseFloat(expense.price_per_gallon) : null,
          total_amount: expense.total_amount ? parseFloat(expense.total_amount) : null,
        };
        
        if (stateIndex === -1) {
          vehicleData.states.push({
            state,
            gallons,
            transaction_count: 1,
            transactions: [transaction],
          });
        } else {
          vehicleData.states[stateIndex].gallons += gallons;
          vehicleData.states[stateIndex].transaction_count++;
          vehicleData.states[stateIndex].transactions.push(transaction);
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
