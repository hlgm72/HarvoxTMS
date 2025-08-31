import { 
  Filter, 
  Download, 
  BarChart3, 
  Settings, 
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  Clock,
  Truck,
  Building2,
  FuelIcon as Fuel
} from "lucide-react";
import { 
  ContextConfig, 
  FuelFilters, 
  LoadsFilters, 
  DeductionsFilters, 
  PaymentFilters 
} from "./UniversalFilterTypes";
import { formatCurrency } from "@/lib/dateFormatting";
import { FuelFiltersType } from "@/components/fuel/FuelFilters";

// ========================================
// CONFIGURACIÓN PARA FUEL MANAGEMENT
// ========================================

export const fuelConfig: ContextConfig<FuelFilters> = {
  contextKey: 'fuel',
  namespace: 'fuel',
  
  actions: [
    {
      key: 'filters',
      icon: Filter,
      labelKey: 'floating_actions.filters.label',
      titleKey: 'floating_actions.filters.title',
      descriptionKey: 'floating_actions.filters.description',
      variant: 'secondary'
    },
    {
      key: 'sync',
      icon: RefreshCw,
      labelKey: 'floating_actions.sync.label',
      titleKey: 'floating_actions.sync.title',
      descriptionKey: 'floating_actions.sync.description',
      variant: 'secondary'
    },
    {
      key: 'export',
      icon: Download,
      labelKey: 'floating_actions.export.label',
      titleKey: 'floating_actions.export.title',
      descriptionKey: 'floating_actions.export.description',
      variant: 'secondary'
    },
    {
      key: 'view',
      icon: Settings,
      labelKey: 'floating_actions.view.label',
      titleKey: 'floating_actions.view.title',
      descriptionKey: 'floating_actions.view.description',
      variant: 'secondary'
    },
    {
      key: 'stats',
      icon: BarChart3,
      labelKey: 'floating_actions.stats.label',
      titleKey: 'floating_actions.stats.title',
      descriptionKey: 'floating_actions.stats.description',
      variant: 'secondary'
    }
  ],

  filterConfig: {
    fields: [
      {
        key: 'search',
        type: 'search',
        labelKey: 'filters.search_placeholder', // ← Corregido
        placeholder: 'Buscar por transacción...'
      },
      {
        key: 'driverId',
        type: 'select',
        labelKey: 'filters.driver_label', // ← Correcto
        options: [{ value: 'all', labelKey: 'filters.all_drivers' }] // ← Correcto
      },
      {
        key: 'vehicleId', 
        type: 'select',
        labelKey: 'filters.vehicle_label', // ← Agregar esta clave
        options: [{ value: 'all', labelKey: 'filters.all_vehicles' }] // ← Agregar esta clave
      },
      {
        key: 'status',
        type: 'select',
        labelKey: 'filters.status_label', // ← Correcto
        options: [
          { value: 'all', labelKey: 'filters.status_options.all' }, // ← Correcto
          { value: 'assigned', labelKey: 'filters.status_options.assigned' }, // ← Agregar
          { value: 'unassigned', labelKey: 'filters.status_options.unassigned' } // ← Agregar
        ]
      },
      {
        key: 'periodFilter',
        type: 'period',
        labelKey: 'filters.period_label'
      }
    ],

    clearFilters: (): FuelFilters => ({
      search: '',
      driverId: 'all',
      status: 'all',
      vehicleId: 'all',
      periodFilter: { type: 'current' }
    }),

    hasActiveFilters: (filters: FuelFilters) => {
      return filters.search !== '' || 
             filters.driverId !== 'all' || 
             filters.status !== 'all' ||
             filters.vehicleId !== 'all' ||
             filters.periodFilter?.type !== 'current';
    },

    getActiveFilterBadges: (filters: FuelFilters, additionalData?: any) => {
      const badges = [];
      
      if (filters.search) {
        badges.push({ key: 'search', label: `Búsqueda: ${filters.search}` });
      }
      
      if (filters.driverId !== 'all') {
        const driver = additionalData?.drivers?.find((d: any) => d.user_id === filters.driverId);
        badges.push({ 
          key: 'driver', 
          label: `Conductor: ${driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId}` 
        });
      }
      
      if (filters.vehicleId !== 'all') {
        const vehicle = additionalData?.vehicles?.find((v: any) => v.id === filters.vehicleId);
        badges.push({ 
          key: 'vehicle', 
          label: `Vehículo: ${vehicle ? vehicle.plate_number : filters.vehicleId}` 
        });
      }
      
      if (filters.status !== 'all') {
        badges.push({ key: 'status', label: `Estado: ${filters.status}` });
      }
      
      if (filters.periodFilter?.type !== 'current') {
        badges.push({ 
          key: 'period', 
          label: `Período: ${filters.periodFilter?.label || filters.periodFilter?.type}` 
        });
      }
      
      return badges;
    }
  },

  customActions: {
    sync: {
      enabled: true,
      handler: async () => {
        // Implementation will be provided via props
      }
    },
    export: {
      enabled: true,
      formats: ['pdf', 'excel'],
      handler: async (format: string) => {
        // Implementation will be provided via props
      }
    }
  },

  statsConfig: {
    enabled: true,
    fields: [
      {
        key: 'totalTransactions',
        icon: Fuel,
        labelKey: 'stats.total_transactions',
        formatter: (value) => value?.toString() || '0'
      },
      {
        key: 'totalAmount',
        icon: DollarSign,
        labelKey: 'stats.total_amount',
        formatter: (value) => formatCurrency(value || 0)
      },
      {
        key: 'driversCount',
        icon: Users,
        labelKey: 'stats.drivers_count',
        formatter: (value) => value?.toString() || '0'
      }
    ]
  }
};

// ========================================
// CONFIGURACIÓN PARA LOADS
// ========================================

export const loadsConfig: ContextConfig<LoadsFilters> = {
  contextKey: 'loads',
  namespace: 'loads',
  
  actions: [
    {
      key: 'filters',
      icon: Filter,
      labelKey: 'floating_actions.filters.label',
      titleKey: 'floating_actions.filters.title',
      variant: 'secondary'
    },
    {
      key: 'export',
      icon: Download,
      labelKey: 'floating_actions.export.label',
      titleKey: 'floating_actions.export.title',
      variant: 'secondary'
    },
    {
      key: 'view',
      icon: Settings,
      labelKey: 'floating_actions.view.label',
      titleKey: 'floating_actions.view.title',
      variant: 'secondary'
    },
    {
      key: 'stats',
      icon: BarChart3,
      labelKey: 'floating_actions.stats.label',
      titleKey: 'floating_actions.stats.title',
      variant: 'secondary'
    }
  ],

  filterConfig: {
    fields: [
      {
        key: 'search',
        type: 'search',
        labelKey: 'filters.search_placeholder' // ← De payments.json
      },
      {
        key: 'status',
        type: 'select',
        labelKey: 'filters.status_label', // ← De payments.json
        options: [
          { value: 'all', labelKey: 'filters.status_options.all' },
          { value: 'available', labelKey: 'filters.status_options.available' }, // ← Agregar
          { value: 'assigned', labelKey: 'filters.status_options.assigned' }, // ← Agregar
          { value: 'in_transit', labelKey: 'filters.status_options.in_transit' }, // ← Agregar
          { value: 'delivered', labelKey: 'filters.status_options.delivered' } // ← Agregar
        ]
      },
      {
        key: 'driverId',
        type: 'select',
        labelKey: 'filters.driver_label', // ← De payments.json
        options: [{ value: 'all', labelKey: 'filters.all_drivers' }] // ← De payments.json
      },
      {
        key: 'brokerId',
        type: 'select',
        labelKey: 'filters.broker_label', // ← Agregar esta clave
        options: [{ value: 'all', labelKey: 'filters.all_brokers' }] // ← Agregar esta clave
      },
      {
        key: 'periodFilter',
        type: 'period',
        labelKey: 'filters.period_label' // ← De payments.json
      }
    ],

    clearFilters: (): LoadsFilters => ({
      search: '',
      status: 'all',
      driverId: 'all',
      brokerId: 'all',
      sortBy: 'date_desc',
      periodFilter: { type: 'current' }
    }),

    hasActiveFilters: (filters: LoadsFilters) => {
      return filters.search !== '' || 
             filters.status !== 'all' || 
             filters.driverId !== 'all' ||
             filters.brokerId !== 'all' ||
             filters.periodFilter?.type !== 'current';
    },

    getActiveFilterBadges: (filters: LoadsFilters, additionalData?: any) => {
      const badges = [];
      
      if (filters.search) {
        badges.push({ key: 'search', label: `Búsqueda: ${filters.search}` });
      }
      
      if (filters.status !== 'all') {
        badges.push({ key: 'status', label: `Estado: ${filters.status}` });
      }
      
      if (filters.driverId !== 'all') {
        const driver = additionalData?.drivers?.find((d: any) => d.user_id === filters.driverId);
        badges.push({ 
          key: 'driver', 
          label: `Conductor: ${driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId}` 
        });
      }
      
      if (filters.brokerId !== 'all') {
        const broker = additionalData?.brokers?.find((b: any) => b.id === filters.brokerId);
        badges.push({ 
          key: 'broker', 
          label: `Broker: ${broker ? broker.name : filters.brokerId}` 
        });
      }
      
      if (filters.periodFilter?.type !== 'current') {
        badges.push({ 
          key: 'period', 
          label: `Período: ${filters.periodFilter?.label || filters.periodFilter?.type}` 
        });
      }
      
      return badges;
    }
  },

  customActions: {
    export: {
      enabled: true,
      formats: ['pdf', 'excel', 'csv'],
      handler: async (format: string) => {
        // Implementation will be provided via props
      }
    }
  },

  statsConfig: {
    enabled: true,
    fields: [
      {
        key: 'totalLoads',
        icon: Truck,
        labelKey: 'stats.total_loads'
      },
      {
        key: 'totalRevenue',
        icon: DollarSign,
        labelKey: 'stats.total_revenue',
        formatter: formatCurrency
      },
      {
        key: 'activeDrivers',
        icon: Users,
        labelKey: 'stats.active_drivers'
      }
    ]
  }
};

// ========================================
// CONFIGURACIÓN PARA DEDUCTIONS
// ========================================

export const deductionsConfig: ContextConfig<DeductionsFilters> = {
  contextKey: 'deductions',
  namespace: 'payments',
  
  actions: [
    {
      key: 'filters',
      icon: Filter,
      labelKey: 'floating_actions.filters.label',
      titleKey: 'floating_actions.filters.title',
      variant: 'secondary'
    },
    {
      key: 'export',
      icon: Download,
      labelKey: 'floating_actions.export.label',
      titleKey: 'floating_actions.export.title',
      variant: 'secondary'
    },
    {
      key: 'stats',
      icon: BarChart3,
      labelKey: 'floating_actions.stats.label',
      titleKey: 'floating_actions.stats.title',
      variant: 'secondary'
    }
  ],

  filterConfig: {
    fields: [
      {
        key: 'search',
        type: 'search',
        labelKey: 'filters.search_placeholder' // ← De payments.json
      },
      {
        key: 'status',
        type: 'select',
        labelKey: 'filters.status_label', // ← De payments.json
        options: [
          { value: 'all', labelKey: 'filters.status_options.all' },
          { value: 'pending', labelKey: 'filters.status_options.pending' },
          { value: 'approved', labelKey: 'filters.status_options.approved' },
          { value: 'rejected', labelKey: 'filters.status_options.rejected' } // ← Agregar
        ]
      },
      {
        key: 'driverId',
        type: 'select',
        labelKey: 'filters.driver_label', // ← De payments.json
        options: [{ value: 'all', labelKey: 'filters.all_drivers' }] // ← De payments.json
      },
      {
        key: 'expenseTypeId',
        type: 'select',
        labelKey: 'filters.expense_type_label', // ← Agregar esta clave
        options: [{ value: 'all', labelKey: 'filters.all_expense_types' }] // ← Agregar esta clave
      },
      {
        key: 'periodFilter',
        type: 'period',
        labelKey: 'filters.period_label' // ← De payments.json
      }
    ],

    clearFilters: (): DeductionsFilters => ({
      search: '',
      status: 'all',
      driverId: 'all',
      expenseTypeId: 'all',
      periodFilter: { type: 'current' }
    }),

    hasActiveFilters: (filters: DeductionsFilters) => {
      return filters.search !== '' || 
             filters.status !== 'all' || 
             filters.driverId !== 'all' ||
             filters.expenseTypeId !== 'all' ||
             filters.periodFilter?.type !== 'current';
    },

    getActiveFilterBadges: (filters: DeductionsFilters, additionalData?: any) => {
      const badges = [];
      
      if (filters.search) {
        badges.push({ key: 'search', label: `Búsqueda: ${filters.search}` });
      }
      
      if (filters.status !== 'all') {
        badges.push({ key: 'status', label: `Estado: ${filters.status}` });
      }
      
      if (filters.driverId !== 'all') {
        const driver = additionalData?.drivers?.find((d: any) => d.user_id === filters.driverId);
        badges.push({ 
          key: 'driver', 
          label: `Conductor: ${driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId}` 
        });
      }
      
      if (filters.expenseTypeId !== 'all') {
        const expenseType = additionalData?.expenseTypes?.find((et: any) => et.id === filters.expenseTypeId);
        badges.push({ 
          key: 'expenseType', 
          label: `Tipo: ${expenseType ? expenseType.name : filters.expenseTypeId}` 
        });
      }
      
      if (filters.periodFilter?.type !== 'current') {
        badges.push({ 
          key: 'period', 
          label: `Período: ${filters.periodFilter?.label || filters.periodFilter?.type}` 
        });
      }
      
      return badges;
    }
  },

  customActions: {
    export: {
      enabled: true,
      formats: ['pdf', 'excel'],
      handler: async (format: string) => {
        // Implementation will be provided via props
      }
    }
  },

  statsConfig: {
    enabled: true,
    fields: [
      {
        key: 'totalDeductions',
        icon: FileText,
        labelKey: 'stats.total_deductions'
      },
      {
        key: 'totalAmount',
        icon: DollarSign,
        labelKey: 'stats.total_amount',
        formatter: formatCurrency
      },
      {
        key: 'pendingCount',
        icon: Clock,
        labelKey: 'stats.pending_count'
      }
    ]
  }
};

// ========================================
// CONFIGURACIÓN PARA PAYMENT REPORTS
// ========================================

export const paymentReportsConfig: ContextConfig<PaymentFilters> = {
  contextKey: 'payments',
  namespace: 'payments',
  
  actions: [
    {
      key: 'filters',
      icon: Filter,
      labelKey: 'floating_actions.filters.label',
      titleKey: 'floating_actions.filters.title',
      descriptionKey: 'floating_actions.filters.description',
      variant: 'secondary'
    },
    {
      key: 'export',
      icon: Download,
      labelKey: 'floating_actions.export.label',
      titleKey: 'floating_actions.export.title',
      descriptionKey: 'floating_actions.export.description',
      variant: 'secondary'
    },
    {
      key: 'stats',
      icon: BarChart3,
      labelKey: 'floating_actions.stats.label',
      titleKey: 'floating_actions.stats.title',
      descriptionKey: 'floating_actions.stats.description',
      variant: 'secondary'
    }
  ],

  filterConfig: {
    fields: [
      {
        key: 'search',
        type: 'search',
        labelKey: 'filters.search_placeholder'
      },
      {
        key: 'driverId',
        type: 'select',
        labelKey: 'filters.driver_label',
        options: [{ value: 'all', labelKey: 'filters.all_drivers' }]
      },
      {
        key: 'status',
        type: 'select',
        labelKey: 'filters.status_label',
        options: [
          { value: 'all', labelKey: 'filters.status_options.all' },
          { value: 'pending', labelKey: 'filters.status_options.pending' },
          { value: 'calculated', labelKey: 'filters.status_options.calculated' },
          { value: 'approved', labelKey: 'filters.status_options.approved' },
          { value: 'paid', labelKey: 'filters.status_options.paid' },
          { value: 'failed', labelKey: 'filters.status_options.failed' },
          { value: 'negative', labelKey: 'filters.status_options.negative' }
        ]
      },
      {
        key: 'periodFilter',
        type: 'period',
        labelKey: 'filters.period_label'
      }
    ],

    clearFilters: (): PaymentFilters => ({
      search: '',
      driverId: 'all',
      status: 'all',
      periodFilter: { type: 'current' }
    }),

    hasActiveFilters: (filters: PaymentFilters) => {
      return filters.search !== '' || 
             filters.driverId !== 'all' || 
             filters.status !== 'all' ||
             filters.periodFilter?.type !== 'current';
    },

    getActiveFilterBadges: (filters: PaymentFilters, additionalData?: any) => {
      const badges = [];
      
      if (filters.search) {
        badges.push({ key: 'search', label: `Búsqueda: ${filters.search}` });
      }
      
      if (filters.driverId !== 'all') {
        const driver = additionalData?.drivers?.find((d: any) => d.user_id === filters.driverId);
        badges.push({ 
          key: 'driver', 
          label: `Conductor: ${driver ? `${driver.first_name} ${driver.last_name}` : filters.driverId}` 
        });
      }
      
      if (filters.status !== 'all') {
        badges.push({ key: 'status', label: `Estado: ${filters.status}` });
      }
      
      if (filters.periodFilter?.type !== 'current') {
        badges.push({ 
          key: 'period', 
          label: `Período: ${filters.periodFilter?.label || filters.periodFilter?.type}` 
        });
      }
      
      return badges;
    }
  },

  customActions: {
    export: {
      enabled: true,
      formats: ['pdf', 'excel', 'csv'],
      handler: async (format: string) => {
        // Implementation will be provided via props
      }
    }
  },

  statsConfig: {
    enabled: true,
    fields: [
      {
        key: 'totalReports',
        icon: FileText,
        labelKey: 'stats.total_deductions'
      },
      {
        key: 'totalDrivers',
        icon: Users,
        labelKey: 'stats.active_drivers'
      },
      {
        key: 'totalEarnings',
        icon: DollarSign,
        labelKey: 'stats.total_amount',
        formatter: formatCurrency
      },
      {
        key: 'pendingReports',
        icon: Clock,
        labelKey: 'stats.pending_count'
      }
    ]
  }
};

// ========================================
// MAPA DE CONFIGURACIONES
// ========================================

export const CONTEXT_CONFIGS = {
  fuel: fuelConfig,
  loads: loadsConfig,
  deductions: deductionsConfig,
  payments: paymentReportsConfig
} as const;

export type ContextKey = keyof typeof CONTEXT_CONFIGS;