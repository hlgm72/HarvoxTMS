import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Truck, MapPin, DollarSign, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLoads } from "@/hooks/useLoads";

// Mock data - later will be replaced with real data from Supabase
const mockLoads = [
  {
    id: "1",
    load_number: "LD-2024-001",
    broker_name: "ABC Logistics",
    dispatcher_name: "Juan Pérez",
    driver_name: "María García",
    status: "in_transit",
    total_amount: 2500.00,
    pickup_date: "2024-01-15",
    delivery_date: "2024-01-17",
    pickup_city: "Houston, TX",
    delivery_city: "Dallas, TX",
    commodity: "Electronics",
    weight_lbs: 25000,
    created_at: "2024-01-14T10:00:00Z"
  },
  {
    id: "2", 
    load_number: "LD-2024-002",
    broker_name: "XYZ Freight",
    dispatcher_name: "Ana López",
    driver_name: null,
    status: "created",
    total_amount: 1800.00,
    pickup_date: "2024-01-20",
    delivery_date: "2024-01-22",
    pickup_city: "San Antonio, TX",
    delivery_city: "Austin, TX",
    commodity: "Food Products",
    weight_lbs: 35000,
    created_at: "2024-01-15T14:30:00Z"
  }
];

const statusColors = {
  created: "bg-slate-100 text-slate-700 border-slate-300",
  route_planned: "bg-blue-100 text-blue-700 border-blue-300",
  assigned: "bg-yellow-100 text-yellow-700 border-yellow-300",
  in_transit: "bg-orange-100 text-orange-700 border-orange-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300"
};

const statusLabels = {
  created: "Creada",
  route_planned: "Ruta Planificada", 
  assigned: "Asignada",
  in_transit: "En Tránsito",
  delivered: "Entregada",
  completed: "Completada"
};

interface LoadsListProps {
  filters: {
    status: string;
    driver: string;
    broker: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
  };
}

export function LoadsList({ filters }: LoadsListProps) {
  const { t } = useTranslation();
  const { data: loads = [], isLoading, error } = useLoads();
  
  // Aplicar filtros a los datos reales
  const filteredLoads = loads.filter(load => {
    if (filters.status !== "all" && load.status !== filters.status) return false;
    if (filters.driver !== "all" && load.driver_name !== filters.driver) return false;
    if (filters.broker !== "all" && load.broker_name !== filters.broker) return false;
    
    // Filtro por rango de fechas
    if (filters.dateRange.from && filters.dateRange.to) {
      const loadDate = new Date(load.created_at);
      if (loadDate < filters.dateRange.from || loadDate > filters.dateRange.to) return false;
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando cargas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error cargando cargas: {error.message}</div>
      </div>
    );
  }

  if (filteredLoads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No hay cargas registradas</p>
            <p className="text-sm">Comienza creando tu primera carga</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredLoads.map((load) => (
        <Card key={load.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">
                  {load.load_number}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {load.pickup_city} → {load.delivery_city}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(load.total_amount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(load.pickup_date), "dd/MM/yyyy", { locale: es })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={statusColors[load.status as keyof typeof statusColors]}
                >
                  {statusLabels[load.status as keyof typeof statusLabels]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Broker / Cliente
                </label>
                <p className="text-sm font-medium">{load.broker_name}</p>
                <p className="text-xs text-muted-foreground">Dispatcher</p>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Conductor Asignado
                </label>
                <p className="text-sm font-medium">
                  {load.driver_name || (
                    <span className="text-muted-foreground italic">Sin asignar</span>
                  )}
                </p>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Commodity
                </label>
                <p className="text-sm font-medium">{load.commodity}</p>
                <p className="text-xs text-muted-foreground">{load.weight_lbs?.toLocaleString()} lbs</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Creada: {format(new Date(load.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-3 w-3 mr-1" />
                  Ver
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}