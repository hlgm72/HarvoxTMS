import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mockDrivers = [
  {
    id: 1,
    name: "Carlos Rodriguez",
    license: "CDL-A-123456",
    phone: "(555) 123-4567",
    status: "available",
    currentLocation: "Dallas, TX",
    truck: "TR-001",
    experience: "5 años",
    licenseExpiry: "2025-03-15"
  },
  {
    id: 2,
    name: "Maria Garcia",
    license: "CDL-A-789012",
    phone: "(555) 987-6543",
    status: "on_route",
    currentLocation: "En ruta a Houston",
    truck: "TR-002",
    experience: "8 años",
    licenseExpiry: "2024-12-30"
  },
  {
    id: 3,
    name: "John Smith",
    license: "CDL-A-345678",
    phone: "(555) 456-7890",
    status: "off_duty",
    currentLocation: "Phoenix, AZ",
    truck: "TR-003",
    experience: "12 años",
    licenseExpiry: "2025-06-20"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "success";
    case "on_route":
      return "primary";
    case "off_duty":
      return "secondary";
    default:
      return "secondary";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "available":
      return "Disponible";
    case "on_route":
      return "En Ruta";
    case "off_duty":
      return "Fuera de Servicio";
    default:
      return status;
  }
};

export default function Drivers() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Gestión de Conductores
            </h1>
            <p className="text-muted-foreground">
              Administra tu equipo de conductores y su información
            </p>
          </div>
          <Button className="bg-gradient-primary hover:opacity-90">
            ➕ Nuevo Conductor
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDrivers.map((driver) => (
            <Card key={driver.id} className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {driver.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{driver.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{driver.license}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(driver.status) as any}>
                    {getStatusText(driver.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span className="text-sm">{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="text-sm">{driver.currentLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🚛</span>
                    <span className="text-sm">{driver.truck}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🕐</span>
                    <span className="text-sm">{driver.experience} de experiencia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span className="text-sm">Vence: {driver.licenseExpiry}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Asignar Carga
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}