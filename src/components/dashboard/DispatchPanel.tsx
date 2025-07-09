import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const pendingLoads = [
  {
    id: "LD-2024-089",
    pickup: "Houston, TX",
    delivery: "Miami, FL",
    distance: "1,247 mi",
    weight: "34,500 lbs",
    priority: "high",
    deadline: "2 días",
    value: "$3,400"
  },
  {
    id: "LD-2024-090",
    pickup: "Los Angeles, CA",
    delivery: "Phoenix, AZ",
    distance: "387 mi",
    weight: "28,750 lbs",
    priority: "normal",
    deadline: "4 días",
    value: "$1,850"
  },
  {
    id: "LD-2024-091",
    pickup: "Chicago, IL",
    delivery: "Detroit, MI",
    distance: "279 mi",
    weight: "41,200 lbs",
    priority: "urgent",
    deadline: "1 día",
    value: "$2,200"
  }
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "warning";
    case "normal": return "secondary";
    default: return "secondary";
  }
};

const getPriorityText = (priority: string) => {
  switch (priority) {
    case "urgent": return "URGENTE";
    case "high": return "ALTA";
    case "normal": return "NORMAL";
    default: return priority;
  }
};

export function DispatchPanel() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🚚 Panel de Despacho
          </CardTitle>
          <Button size="sm" className="bg-gradient-primary text-white shadow-glow">
            + Asignar Carga
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cargas Pendientes</span>
            <Badge variant="outline" className="text-xs">
              {pendingLoads.length} pendientes
            </Badge>
          </div>
          
          {pendingLoads.map((load) => (
            <div key={load.id} className="border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{load.id}</span>
                  <Badge variant={getPriorityColor(load.priority) as any} className="text-xs">
                    {getPriorityText(load.priority)}
                  </Badge>
                </div>
                <span className="text-sm font-medium text-success">{load.value}</span>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  📍 <span>{load.pickup}</span> → <span>{load.delivery}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🏋️ {load.weight}</span>
                  <span>📏 {load.distance}</span>
                  <span>⏰ {load.deadline}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="text-xs flex-1">
                  Ver Detalles
                </Button>
                <Button size="sm" className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  Asignar
                </Button>
              </div>
            </div>
          ))}
          
          <Button variant="outline" className="w-full text-sm" size="sm">
            Ver Todas las Cargas ({pendingLoads.length + 12})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}