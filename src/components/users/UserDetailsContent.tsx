import { useState, useEffect } from "react";
import { User, Truck, Phone, Calendar, Shield, Clock, FileText, CreditCard, MapPin, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useDriverEquipment } from "@/hooks/useDriverEquipment";
import { useDriverCards, type DriverCard } from "@/hooks/useDriverCards";
import { useOwnerOperator, type OwnerOperatorData } from "@/hooks/useOwnerOperator";
import { getExpiryInfo, formatDateOnly } from '@/lib/dateFormatting';
import { capitalizeWords } from '@/lib/textUtils';
import { getRoleConfig } from "@/lib/roleUtils";

interface UserDetailsContentProps {
  user: {
    id: string;
    email: string;
    phone?: string;
    role: string;
    status: 'active' | 'pending' | 'inactive';
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    created_at: string;
  };
}

interface DriverProfile {
  user_id: string;
  driver_id?: string;
  license_number?: string;
  license_state?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  cdl_class?: string;
  cdl_endorsements?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hire_date?: string;
  current_status?: string;
  is_active: boolean;
}

const formatExperience = (licenseIssueDate: string | null, hireDate: string | null) => {
  const experienceDate = licenseIssueDate || hireDate;
  
  if (!experienceDate) return "Not specified";
  
  try {
    let year: number, month: number, day: number;
    
    if (experienceDate.includes('T') || experienceDate.includes('Z')) {
      const datePart = experienceDate.split('T')[0];
      [year, month, day] = datePart.split('-').map(Number);
    } else if (experienceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      [year, month, day] = experienceDate.split('-').map(Number);
    } else {
      return "Not specified";
    }
    
    const startDate = new Date(year, month - 1, day);
    const now = new Date();
    const years = now.getFullYear() - startDate.getFullYear();
    const months = now.getMonth() - startDate.getMonth();
    
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    if (totalMonths < 12) {
      return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    } else {
      const yearCount = Math.floor(totalMonths / 12);
      const monthCount = totalMonths % 12;
      if (monthCount === 0) {
        return `${yearCount} year${yearCount !== 1 ? 's' : ''}`;
      }
      return `${yearCount} year${yearCount !== 1 ? 's' : ''} and ${monthCount} month${monthCount !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error calculating experience:', error);
    return "Not specified";
  }
};

export function UserDetailsContent({ user }: UserDetailsContentProps) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(false);
  
  const isDriver = user.role.toLowerCase().includes('driver');
  
  // Only load driver data if user is a driver
  const { data: assignedEquipment = [], isLoading: equipmentLoading } = useDriverEquipment(isDriver ? user.id : '');
  const { data: driverCards = [], isLoading: cardsLoading } = useDriverCards(isDriver ? user.id : '');
  const { ownerOperator, isLoading: ownerOperatorLoading } = useOwnerOperator(isDriver ? user.id : '');

  useEffect(() => {
    if (isDriver) {
      loadDriverProfile();
    }
  }, [user.id, isDriver]);

  const loadDriverProfile = async () => {
    if (!isDriver) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      setDriverProfile(data);
    } catch (error) {
      console.error('Error loading driver profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadges = () => {
    return user.role.split(', ').map((roleLabel, index) => {
      const originalRole = Object.entries({
        'superadmin': '🔧 Super Admin',
        'company_owner': '👑 Company Owner',
        'operations_manager': '👨‍💼 Operations Manager',
        'dispatcher': '📋 Dispatcher',
        'driver': '🚛 Driver',
        'multi_company_dispatcher': '🏢 Multi-Company Dispatcher'
      }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
      
      const config = getRoleConfig(originalRole);
      
      return (
        <span key={index} className="inline-flex items-center mr-1">
          <Badge variant="default" className={config.className}>
            {config.emoji} {config.label}
          </Badge>
          {index < user.role.split(', ').length - 1 && <span className="mx-1">•</span>}
        </span>
      );
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isDriver) {
    // Regular user details
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">{user.phone || 'No especificado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Rol</p>
                  <div className="mt-1">{getRoleBadges()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Estado</p>
                  <div className="mt-1">{getStatusBadge(user.status)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha de Registro</p>
                  <p className="text-sm text-muted-foreground">
                    {user.created_at ? formatDateOnly(user.created_at) : 'No especificado'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Driver details with tabs
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="license">Licencia</TabsTrigger>
        <TabsTrigger value="equipment">Equipos</TabsTrigger>
        <TabsTrigger value="business">Negocio</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
              <div className="ml-auto flex gap-2">
                {getRoleBadges()}
                {ownerOperator && (
                  <Badge variant="outline" className="text-xs">
                    Owner-Operator
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">{user.phone || 'No especificado'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Driver ID</p>
                    <p className="text-sm text-muted-foreground">{driverProfile?.driver_id || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Contratación</p>
                    <p className="text-sm text-muted-foreground">
                      {driverProfile?.hire_date 
                        ? formatDateOnly(driverProfile.hire_date)
                        : 'No especificado'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Experiencia</p>
                    <p className="text-sm text-muted-foreground">
                      {formatExperience(driverProfile?.license_issue_date || null, driverProfile?.hire_date || null)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Nacimiento</p>
                    <p className="text-sm text-muted-foreground">
                      {driverProfile?.date_of_birth 
                        ? formatDateOnly(driverProfile.date_of_birth)
                        : 'No especificado'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {driverProfile?.emergency_contact_name && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Contacto de Emergencia</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nombre</p>
                    <p className="text-sm text-muted-foreground">{driverProfile.emergency_contact_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">{driverProfile.emergency_contact_phone || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="license" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Información de Licencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Número de Licencia</p>
                    <p className="text-sm text-muted-foreground">{driverProfile?.license_number || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Clase CDL</p>
                    <p className="text-sm text-muted-foreground">{driverProfile?.cdl_class || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Estado Emisor</p>
                    <p className="text-sm text-muted-foreground">{driverProfile?.license_state || 'No especificado'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Emisión</p>
                    <p className="text-sm text-muted-foreground">
                      {driverProfile?.license_issue_date 
                        ? formatDateOnly(driverProfile.license_issue_date)
                        : 'No especificado'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Fecha de Expiración</p>
                    <div className="flex flex-col">
                      <p className="text-sm text-muted-foreground">
                        {driverProfile?.license_expiry_date 
                          ? formatDateOnly(driverProfile.license_expiry_date)
                          : 'No especificado'
                        }
                      </p>
                      {driverProfile?.license_expiry_date && (
                        <>
                          {getExpiryInfo(driverProfile.license_expiry_date).isExpired && (
                            <span className="text-red-600 font-semibold text-xs">⚠️ EXPIRADA</span>
                          )}
                          {getExpiryInfo(driverProfile.license_expiry_date).isExpiring && 
                           !getExpiryInfo(driverProfile.license_expiry_date).isExpired && (
                            <span className="text-orange-600 font-semibold text-xs">⚠️ EXPIRA PRONTO</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {driverProfile?.cdl_endorsements && (
                  <div className="flex items-center gap-3 col-span-full">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Endosos CDL</p>
                      <p className="text-sm text-muted-foreground">{driverProfile.cdl_endorsements}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="equipment" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Equipos Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : assignedEquipment.length > 0 ? (
              <div className="space-y-3">
                {assignedEquipment.map((equipment) => (
                  <div key={equipment.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="text-2xl">
                      {equipment.equipment_type === 'truck' ? '🚛' : '🚚'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {capitalizeWords(equipment.equipment_type)} #{equipment.equipment_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {capitalizeWords(equipment.make)} {capitalizeWords(equipment.model)} {equipment.year}
                      </p>
                       <p className="text-xs text-muted-foreground">
                         Asignado: {formatDateOnly(equipment.assigned_date)}
                       </p>
                     </div>
                     <Badge variant={equipment.is_active ? "default" : "secondary"}>
                       {equipment.is_active ? "Activo" : "Inactivo"}
                     </Badge>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-8">
                 No hay equipos asignados a este conductor
               </p>
             )}
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <CreditCard className="h-5 w-5" />
               Tarjetas de Combustible
             </CardTitle>
           </CardHeader>
           <CardContent>
             {cardsLoading ? (
               <div className="space-y-2">
                 {[1, 2].map((i) => (
                   <Skeleton key={i} className="h-16 w-full" />
                 ))}
               </div>
             ) : driverCards.length > 0 ? (
               <div className="space-y-3">
                 {driverCards.map((card) => (
                   <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                     <CreditCard className="h-8 w-8 text-muted-foreground" />
                     <div className="flex-1">
                       <p className="font-medium">{card.card_provider} - ***{card.card_number_last_five}</p>
                       <p className="text-sm text-muted-foreground">
                         Identificador: {card.card_identifier || 'No especificado'}
                       </p>
                     </div>
                     <Badge variant={card.is_active ? "default" : "secondary"}>
                       {card.is_active ? "Activa" : "Inactiva"}
                     </Badge>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-muted-foreground text-center py-8">
                 No hay tarjetas de combustible asignadas
               </p>
             )}
           </CardContent>
         </Card>
       </TabsContent>

       <TabsContent value="business" className="space-y-4">
         {ownerOperatorLoading ? (
           <Card>
             <CardContent className="p-6">
               <div className="space-y-2">
                 {[1, 2, 3].map((i) => (
                   <Skeleton key={i} className="h-8 w-full" />
                 ))}
               </div>
             </CardContent>
           </Card>
         ) : ownerOperator ? (
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Building className="h-5 w-5" />
                 Información de Owner-Operator
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex items-center gap-3">
                   <FileText className="h-4 w-4 text-muted-foreground" />
                   <div>
                     <p className="text-sm font-medium">Tipo de Negocio</p>
                     <p className="text-sm text-muted-foreground">
                       {ownerOperator.business_type ? capitalizeWords(ownerOperator.business_type.replace('_', ' ')) : 'No especificado'}
                     </p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3">
                   <Calendar className="h-4 w-4 text-muted-foreground" />
                   <div>
                     <p className="text-sm font-medium">Fecha de Registro</p>
                     <p className="text-sm text-muted-foreground">
                       {formatDateOnly(ownerOperator.created_at)}
                     </p>
                   </div>
                 </div>

                 {ownerOperator.business_name && (
                   <div className="flex items-center gap-3">
                     <Building className="h-4 w-4 text-muted-foreground" />
                     <div>
                       <p className="text-sm font-medium">Nombre del Negocio</p>
                       <p className="text-sm text-muted-foreground">
                         {ownerOperator.business_name}
                       </p>
                     </div>
                   </div>
                 )}

                 <div className="flex items-center gap-3">
                   <Shield className="h-4 w-4 text-muted-foreground" />
                   <div>
                     <p className="text-sm font-medium">Estado</p>
                     <Badge variant={ownerOperator.is_active ? "default" : "secondary"}>
                       {ownerOperator.is_active ? "Activo" : "Inactivo"}
                     </Badge>
                   </div>
                 </div>
               </div>

               {ownerOperator.business_address && (
                 <div className="border-t pt-4">
                   <h4 className="font-medium mb-2">Dirección del Negocio</h4>
                   <p className="text-sm text-muted-foreground">{ownerOperator.business_address}</p>
                 </div>
               )}

               {(ownerOperator.factoring_percentage || ownerOperator.dispatching_percentage || ownerOperator.leasing_percentage) && (
                 <div className="border-t pt-4">
                   <h4 className="font-medium mb-2">Porcentajes de Comisión</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {ownerOperator.factoring_percentage && (
                       <div>
                         <p className="text-sm font-medium">Factoring</p>
                         <p className="text-sm text-muted-foreground">{ownerOperator.factoring_percentage}%</p>
                       </div>
                     )}
                     {ownerOperator.dispatching_percentage && (
                       <div>
                         <p className="text-sm font-medium">Dispatching</p>
                         <p className="text-sm text-muted-foreground">{ownerOperator.dispatching_percentage}%</p>
                       </div>
                     )}
                     {ownerOperator.leasing_percentage && (
                       <div>
                         <p className="text-sm font-medium">Leasing</p>
                         <p className="text-sm text-muted-foreground">{ownerOperator.leasing_percentage}%</p>
                       </div>
                     )}
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         ) : (
           <Card>
             <CardContent className="p-6">
               <p className="text-muted-foreground text-center py-8">
                 Este conductor no es un Owner-Operator
               </p>
             </CardContent>
           </Card>
         )}
       </TabsContent>
     </Tabs>
   );
}