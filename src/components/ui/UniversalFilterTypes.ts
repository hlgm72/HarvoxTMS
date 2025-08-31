import { LucideIcon } from "lucide-react";
import { PeriodFilterValue } from "@/components/loads/PeriodFilter";

// ========================================
// TIPOS BASE PARA FILTROS UNIVERSALES
// ========================================

export interface BaseFilters {
  search: string;
  driverId: string;
  status: string;
  periodFilter?: PeriodFilterValue;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

// Extensiones específicas por contexto
export interface FuelFilters extends BaseFilters {
  vehicleId: string;
  periodFilter: PeriodFilterValue;
}

export interface LoadsFilters extends BaseFilters {
  brokerId: string;
  sortBy: string;
}

export interface DeductionsFilters extends BaseFilters {
  expenseTypeId: string;
}

export interface PaymentFilters extends BaseFilters {
  periodFilter: PeriodFilterValue;
}

// ========================================
// CONFIGURACIÓN DE ACCIONES
// ========================================

export type ActionTabType = 'filters' | 'export' | 'view' | 'stats' | 'sync';

export interface ActionTab {
  key: ActionTabType;
  icon: LucideIcon;
  labelKey: string;
  titleKey: string;
  descriptionKey?: string;
  isActive?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

export interface FilterField {
  key: string;
  type: 'search' | 'select' | 'period' | 'dateRange' | 'multiSelect';
  labelKey: string;
  placeholder?: string;
  options?: Array<{ value: string; labelKey?: string; label?: string }>;
  required?: boolean;
}

export interface FilterConfig {
  fields: FilterField[];
  clearFilters: () => any; // Return type should match the specific filter type
  hasActiveFilters: (filters: any) => boolean;
  getActiveFilterBadges: (filters: any, options?: any) => Array<{ key: string; label: string }>;
}

// ========================================
// CONFIGURACIÓN DE CONTEXTO
// ========================================

export interface ContextConfig<T extends BaseFilters> {
  contextKey: string;
  namespace: string; // Translation namespace
  actions: ActionTab[];
  filterConfig: FilterConfig;
  customActions?: {
    sync?: {
      enabled: boolean;
      handler: () => Promise<void>;
    };
    export?: {
      enabled: boolean;
      formats: Array<'pdf' | 'excel' | 'csv'>;
      handler: (format: string) => Promise<void>;
    };
  };
  statsConfig?: {
    enabled: boolean;
    fields: Array<{
      key: string;
      icon: LucideIcon;
      labelKey: string;
      formatter?: (value: any) => string;
    }>;
  };
}

// ========================================
// PROPS PRINCIPALES
// ========================================

export interface UniversalFloatingActionsProps<T extends BaseFilters> {
  contextKey: string;
  filters: T;
  onFiltersChange: (filters: T) => void;
  additionalData?: {
    drivers?: Array<{ user_id: string; first_name: string; last_name: string }>;
    vehicles?: Array<{ id: string; plate_number: string }>;
    brokers?: Array<{ id: string; name: string }>;
    expenseTypes?: Array<{ id: string; name: string }>;
    stats?: Record<string, any>;
  };
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  customConfig?: Partial<ContextConfig<T>>;
}

// Export context key type
export type ContextKey = 'fuel' | 'loads' | 'deductions' | 'payments';