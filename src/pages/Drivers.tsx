import { Truck, UserPlus, Settings, Edit, Trash2, Users, UserCheck, Clock, FileText, BarChart3 } from "lucide-react";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useDriverEquipment } from "@/hooks/useDriverEquipment";
import { getExpiryInfo } from '@/lib/dateFormatting';
import { useState, useCallback } from "react";
import { InviteDriverDialog } from "@/components/drivers/InviteDriverDialog";
import { EquipmentAssignmentDialog } from "@/components/equipment/EquipmentAssignmentDialog";
import { DriverDetailsModal } from "@/components/drivers/DriverDetailsModal";
import { EditDriverDialog } from "@/components/drivers/EditDriverDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { UserActionButton } from "@/components/users/UserActionButton";
import { PendingInvitationsSection } from "@/components/invitations/PendingInvitationsSection";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyCache } from "@/hooks/useCompanyCache";

const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "available": return "default";
    case "on_route": return "secondary";
    case "off_duty": return "destructive";
    case "pre_registered": return "outline";
    default: return "secondary";
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case "available": return "Available";
    case "on_route": return "On Route";
    case "off_duty": return "Off Duty";
    case "pre_registered": return "Pre-registered";
    default: return status;
  }
};

// Helper function to get activation status color
const getActivationStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'active': return "default";
    case 'pending_activation': return "secondary";
    case 'invited': return "outline";
    default: return "outline";
  }
};

// Helper function to get activation status text
const getActivationStatusText = (status: string): string => {
  switch (status) {
    case 'active': return "Active";
    case 'pending_activation': return "Pending Activation";
    case 'invited': return "Invited";
    default: return status;
  }
};

const formatExperience = (licenseIssueDate: string | null, hireDate: string | null) => {
  // Priorizar fecha de emisión de licencia (experiencia total como conductor)
  const experienceDate = licenseIssueDate || hireDate;
  
  if (!experienceDate) return "Experience not specified";
  
  try {
    // Usar la función segura para parsear fechas evitando problemas de zona horaria
    let year: number, month: number, day: number;
    
    if (experienceDate.includes('T') || experienceDate.includes('Z')) {
      // Formato ISO: extraer solo la parte de fecha
      const datePart = experienceDate.split('T')[0];
      [year, month, day] = datePart.split('-').map(Number);
    } else if (experienceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato solo fecha: YYYY-MM-DD
      [year, month, day] = experienceDate.split('-').map(Number);
    } else {
      return "Experience not specified";
    }
    
    // Crear fecha local evitando problemas de zona horaria
    const startDate = new Date(year, month - 1, day);
    const now = new Date();
    const years = now.getFullYear() - startDate.getFullYear();
    const months = now.getMonth() - startDate.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    if (totalMonths < 12) {
      return `Experience: ${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    } else {
      const yearCount = Math.floor(totalMonths / 12);
      const monthCount = totalMonths % 12;
      if (monthCount === 0) {
        return `Experience: ${yearCount} year${yearCount !== 1 ? 's' : ''}`;
      }
      return `Experience: ${yearCount} year${yearCount !== 1 ? 's' : ''} and ${monthCount} month${monthCount !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error calculating experience:', error);
    return "Experience not specified";
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
  const { userRole } = useAuth();
  const { userCompany } = useCompanyCache();
  const { drivers, loading, refetch } = useCompanyDrivers();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [invitationsKey, setInvitationsKey] = useState(0); // Para forzar re-render

  // Callback para actualizar las invitaciones pendientes
  const handleInvitationsUpdate = useCallback(() => {
    setInvitationsKey(prev => prev + 1);
  }, []);

  // Force cache invalidation and refetch on mount to get latest data
  useState(() => {
    setTimeout(() => refetch(), 100);
  });

  if (loading) {
    return (
      <>
        <PageToolbar 
          icon={Truck}
          title="Driver Management"
          subtitle="Loading driver information..."
          actions={
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              New Driver
            </Button>
          }
        />
        <div className="p-2 md:p-4 md:pr-20 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
          title="Driver Management"
          subtitle="No drivers registered in the system"
          actions={
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              New Driver
            </Button>
          }
        />
        <div className="p-2 md:p-4 md:pr-20 space-y-6">
          {/* Sección de Invitaciones Pendientes para Conductores */}
          <PendingInvitationsSection 
            key={`empty-invitations-${invitationsKey}`}
            roleFilter="driver"
            title="Pending Drivers"
            description="Drivers who have been invited but have not yet accepted their invitation"
            onInvitationsUpdated={handleInvitationsUpdate}
          />
          
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🚛</div>
            <h3 className="text-xl font-semibold mb-2">No drivers registered</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding drivers to your fleet
            </p>
            <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4" />
              Invite First Driver
            </Button>
          </div>
        </div>

        <InviteDriverDialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onSuccess={() => {
            refetch();
            handleInvitationsUpdate(); // Actualizar también las invitaciones pendientes
          }}
        />
      </>
    );
  }

  // Separar conductores - todos incluye activos e invitados, pendientes incluye invitados y los que necesitan activación
  const allDrivers = drivers; // Todos los conductores (activos e invitados)
  const pendingDrivers = drivers.filter(d => d.activation_status === 'pending_activation' || d.activation_status === 'invited');

  return (
    <>
      <PageToolbar 
        icon={Truck}
        title={`Driver Management`}
        subtitle={`${drivers.length} drivers • ${drivers.filter(d => d.activation_status === 'active').length} active • ${pendingDrivers.length} pending`}
        actions={
          <Button className="gap-2" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4" />
            New Driver
          </Button>
        }
      />
      <div className="p-2 md:p-4 md:pr-20 space-y-4 md:space-y-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto gap-1">
            <TabsTrigger value="active" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">All Drivers</span>
              <span className="sm:hidden">All</span>
              <span className="ml-1">({allDrivers.length})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pending Activation</span>
              <span className="sm:hidden">Pending</span>
              <span className="ml-1">({pendingDrivers.length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {allDrivers.map((driver) => {
                const DriverCard = () => {
                  const { data: assignedEquipment = [], isLoading: equipmentLoading } = useDriverEquipment(driver.user_id);
                  
                  const fullName = `${driver.first_name} ${driver.last_name}`.trim();
                  const initials = [driver.first_name, driver.last_name]
                    .filter(Boolean)
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase();

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
                              <CardTitle className="text-lg">{fullName || 'No name'}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {driver.license_number ? `${driver.cdl_class || 'CDL'}-${driver.license_number}` : 'No license'}
                              </p>
                            </div>
                          </div>
                          {/* Estado del conductor y activación */}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusColor(driver.current_status)}>
                              {getStatusText(driver.current_status)}
                            </Badge>
                            
                            {/* Mostrar estado de activación para conductores pre-registrados */}
                            {driver.is_pre_registered && (
                              <Badge variant={getActivationStatusColor(driver.activation_status)}>
                                {getActivationStatusText(driver.activation_status)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Mostrar información adicional para conductores pre-registrados */}
                          {driver.is_pre_registered && driver.activation_status === 'pending_activation' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                                💡 This driver can be managed completely without needing to activate their account
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <span>📞</span>
                            <span className="text-sm">{driver.phone || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📍</span>
                            <span className="text-sm">
                              {driver.license_state ? `${driver.license_state}` : 'Location not specified'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🚛</span>
                            <span className="text-sm">
                              {driver.active_loads_count > 0 
                                ? `${driver.active_loads_count} active load${driver.active_loads_count !== 1 ? 's' : ''}`
                                : 'No assigned loads'
                              }
                            </span>
                          </div>
                          
                          {/* Mostrar equipos asignados */}
                          <div className="flex items-center gap-2">
                            <span>🔧</span>
                            <span className="text-sm">
                              {equipmentLoading 
                                ? 'Loading equipment...'
                                : assignedEquipment.length > 0 
                                  ? `${assignedEquipment.length} assigned equipment piece${assignedEquipment.length !== 1 ? 's' : ''}`
                                  : 'No assigned equipment'
                              }
                            </span>
                          </div>
                          
                          {/* Lista de equipos asignados */}
                          {!equipmentLoading && assignedEquipment.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {assignedEquipment.map((equipment) => (
                                <Badge
                                  key={equipment.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {equipment.equipment_type === 'truck' ? '🚛' : '🚚'} {equipment.equipment_type} #{equipment.equipment_number}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                           <div className="flex items-center gap-2">
                             <span>🕐</span>
                             <span className="text-sm">{formatExperience(driver.license_issue_date, driver.hire_date)}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span>📋</span>
                             <div className="text-sm flex flex-col">
                               {driver.license_expiry_date ? (
                                 <>
                                    <span>License Expiry: {getExpiryInfo(driver.license_expiry_date).text}</span>
                                    {getExpiryInfo(driver.license_expiry_date).isExpired && (
                                      <span className="text-red-600 font-semibold text-xs">⚠️ EXPIRED</span>
                                    )}
                                    {getExpiryInfo(driver.license_expiry_date).isExpiring && !getExpiryInfo(driver.license_expiry_date).isExpired && (
                                      <span className="text-orange-600 font-semibold text-xs">⚠️ EXPIRING SOON</span>
                                    )}
                                  </>
                                ) : (
                                  'Expiry date not specified'
                               )}
                             </div>
                           </div>
                        </div>
                         
                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedDriver(driver);
                                setShowDetailsModal(true);
                              }}
                             >
                               View Details
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="flex-1"
                               onClick={() => {
                                 setSelectedDriver(driver);
                                 setShowEditDialog(true);
                               }}
                             >
                               <Edit className="h-3 w-3" />
                               Edit
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
                               Assign
                             </Button>
                          </div>
                      </CardContent>
                    </Card>
                  );
                };
                
                return <DriverCard key={driver.id} />;
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-6 mt-6">
            {/* Sección de Invitaciones Pendientes */}
            <PendingInvitationsSection 
              key={`pending-invitations-${invitationsKey}`}
              roleFilter="driver"
              title="Pending Drivers"
              description="Drivers who have been invited but have not yet accepted their invitation"
              onInvitationsUpdated={handleInvitationsUpdate}
            />
            
          </TabsContent>
        </Tabs>
      </div>

      <InviteDriverDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onSuccess={() => {
          refetch();
          handleInvitationsUpdate(); // Actualizar también las invitaciones pendientes
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

      {selectedDriver && (
        <DriverDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDriver(null);
          }}
          driver={selectedDriver}
          onDriverUpdated={() => {
            refetch();
          }}
        />
      )}

      {selectedDriver && (
        <EditDriverDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedDriver(null);
          }}
          driver={selectedDriver}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Dialog de eliminación/desactivación de conductor */}
      {selectedDriver && userCompany && (
        <DeleteUserDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedDriver(null);
          }}
          user={selectedDriver}
          companyId={userCompany.company_id}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </>
  );
}