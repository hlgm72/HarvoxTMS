import { Truck, UserPlus, Settings } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useEquipmentAssignments } from "@/hooks/useEquipmentAssignments";
import { formatExpiryDate } from '@/lib/dateFormatting';
import { useState } from "react";
import { InviteDriverDialog } from "@/components/drivers/InviteDriverDialog";
import { EquipmentAssignmentDialog } from "@/components/equipment/EquipmentAssignmentDialog";

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "default";
    case "on_route":
      return "default";
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

const formatExperience = (hireDate: string | null) => {
  if (!hireDate) return "Experiencia no especificada";
  
  const hire = new Date(hireDate);
  const now = new Date();
  const years = now.getFullYear() - hire.getFullYear();
  const months = now.getMonth() - hire.getMonth();
  
  let totalMonths = years * 12 + months;
  if (totalMonths < 0) totalMonths = 0;
  
  if (totalMonths < 12) {
    return `${totalMonths} meses de experiencia`;
  } else {
    const yearCount = Math.floor(totalMonths / 12);
    const monthCount = totalMonths % 12;
    if (monthCount === 0) {
      return `${yearCount} año${yearCount !== 1 ? 's' : ''} de experiencia`;
    }
    return `${yearCount} año${yearCount !== 1 ? 's' : ''} y ${monthCount} mes${monthCount !== 1 ? 'es' : ''} de experiencia`;
  }
};

const DriverSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </CardContent>
  </Card>
);

export default function Drivers() {
  const { drivers, loading, refetch } = useCompanyDrivers();
  const { getAssignmentsByDriver } = useEquipmentAssignments();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  if (loading) {
    return (
      <>
        <PageToolbar 
          icon={Truck}
          title="Gestión de Conductores"
          subtitle="Cargando información de conductores..."
          actions={
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Conductor
            </Button>
          }
        />
        <div className="p-2 md:p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <DriverSkeleton key={i} />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (drivers.length === 0) {
    return (
      <>
        <PageToolbar 
          icon={Truck}
          title="Gestión de Conductores"
          subtitle="No hay conductores registrados en el sistema"
          actions={
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Conductor
            </Button>
          }
        />
        <div className="p-2 md:p-4 space-y-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🚛</div>
            <h3 className="text-xl font-semibold mb-2">No hay conductores registrados</h3>
            <p className="text-muted-foreground mb-4">
              Comienza agregando conductores a tu flota
            </p>
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Invitar Primer Conductor
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
      <>
        <PageToolbar 
          icon={Truck}
          title={`Gestión de Conductores`}
          subtitle={`${drivers.length} conductores • ${drivers.filter(d => d.current_status === 'available').length} disponibles • ${drivers.filter(d => d.current_status === 'on_route').length} en ruta`}
          actions={
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Nuevo Conductor
            </Button>
          }
        />
        <div className="p-2 md:p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => {
            const fullName = `${driver.first_name} ${driver.last_name}`.trim();
            const initials = [driver.first_name, driver.last_name]
              .filter(Boolean)
              .map(name => name.charAt(0))
              .join('')
              .toUpperCase();

            // Obtener equipos asignados al conductor
            const assignedEquipment = getAssignmentsByDriver(driver.user_id);

            return (
              <Card key={driver.id} className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {driver.avatar_url && (
                          <AvatarImage src={driver.avatar_url} alt={fullName} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{fullName || 'Sin nombre'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {driver.license_number ? `${driver.cdl_class || 'CDL'}-${driver.license_number}` : 'Sin licencia'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(driver.current_status) as any}>
                      {getStatusText(driver.current_status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span>📞</span>
                      <span className="text-sm">{driver.phone || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="text-sm">
                        {driver.license_state ? `${driver.license_state}` : 'Ubicación no especificada'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🚛</span>
                      <span className="text-sm">
                        {driver.active_loads_count > 0 
                          ? `${driver.active_loads_count} carga${driver.active_loads_count !== 1 ? 's' : ''} activa${driver.active_loads_count !== 1 ? 's' : ''}`
                          : 'Sin cargas asignadas'
                        }
                      </span>
                    </div>
                    
                    {/* Mostrar equipos asignados */}
                    <div className="flex items-center gap-2">
                      <span>🔧</span>
                      <span className="text-sm">
                        {assignedEquipment.length > 0 
                          ? `${assignedEquipment.length} equipo${assignedEquipment.length !== 1 ? 's' : ''} asignado${assignedEquipment.length !== 1 ? 's' : ''}`
                          : 'Sin equipos asignados'
                        }
                      </span>
                    </div>
                    
                    {/* Lista de equipos asignados */}
                    {assignedEquipment.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedEquipment.map((assignment) => (
                          <Badge
                            key={assignment.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {assignment.company_equipment?.equipment_type === 'truck' ? '🚛' : '🚚'} {assignment.company_equipment?.equipment_type} #{assignment.company_equipment?.equipment_number}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span>🕐</span>
                      <span className="text-sm">{formatExperience(driver.hire_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span className="text-sm">
                        {driver.license_expiry_date 
                          ? `Vence: ${formatExpiryDate(driver.license_expiry_date)}`
                          : 'Fecha de vencimiento no especificada'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Detalles
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedDriverId(driver.user_id);
                        setShowAssignmentDialog(true);
                      }}
                    >
                      <Settings className="h-3 w-3" />
                      Equipos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <InviteDriverDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      <EquipmentAssignmentDialog
        isOpen={showAssignmentDialog}
        onClose={() => {
          setShowAssignmentDialog(false);
          setSelectedDriverId('');
        }}
        driverUserId={selectedDriverId}
      />
    </>
  );
}