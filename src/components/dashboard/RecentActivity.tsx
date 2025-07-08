import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const activities = [
  {
    id: 1,
    type: "load_delivered",
    driver: "Carlos Rodriguez",
    description: "Entregó carga #LD-2024-001",
    time: "Hace 15 min",
    status: "delivered",
  },
  {
    id: 2,
    type: "driver_assigned",
    driver: "Maria Garcia",
    description: "Asignada a carga #LD-2024-007",
    time: "Hace 1 hora",
    status: "assigned",
  },
  {
    id: 3,
    type: "maintenance_due",
    driver: "Truck #TR-001",
    description: "Mantenimiento programado vencido",
    time: "Hace 2 horas",
    status: "warning",
  },
  {
    id: 4,
    type: "invoice_sent",
    driver: "System",
    description: "Factura enviada a Walmart Corp",
    time: "Hace 3 horas",
    status: "sent",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "success";
    case "assigned":
      return "primary";
    case "warning":
      return "warning";
    case "sent":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "delivered":
      return "Entregado";
    case "assigned":
      return "Asignado";
    case "warning":
      return "Atención";
    case "sent":
      return "Enviado";
    default:
      return status;
  }
};

export function RecentActivity() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {activity.driver.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {activity.driver}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={getStatusColor(activity.status) as any}>
                  {getStatusText(activity.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}