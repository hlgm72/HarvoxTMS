import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Truck, Phone, MapPin, Calendar, Shield, Clock, FileText, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useDriverEquipment } from "@/hooks/useDriverEquipment";
import { useDriverCards } from "@/hooks/useDriverCards";
import { useOwnerOperator } from "@/hooks/useOwnerOperator";
import { getExpiryInfo } from '@/lib/dateFormatting';
import { capitalizeWords } from '@/lib/textUtils';
import type { ConsolidatedDriver } from "@/hooks/useConsolidatedDrivers";

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: ConsolidatedDriver;
}

interface ProfileData {
  email?: string;
  created_at?: string;
}

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

const formatExperience = (licenseIssueDate: string | null, hireDate: string | null) => {
  const experienceDate = licenseIssueDate || hireDate;
  
  if (!experienceDate) return "No especificada";
  
  const startDate = new Date(experienceDate);
  const now = new Date();
  const years = now.getFullYear() - startDate.getFullYear();
  const months = now.getMonth() - startDate.getMonth();
  
  let totalMonths = years * 12 + months;
  if (totalMonths < 0) totalMonths = 0;
  
  if (totalMonths < 12) {
    return `${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}`;
  } else {
    const yearCount = Math.floor(totalMonths / 12);
    const monthCount = totalMonths % 12;
    if (monthCount === 0) {
      return `${yearCount} año${yearCount !== 1 ? 's' : ''}`;
    }
    return `${yearCount} año${yearCount !== 1 ? 's' : ''} y ${monthCount} mes${monthCount !== 1 ? 'es' : ''}`;
  }
};

export function DriverDetailsModal({ isOpen, onClose, driver }: DriverDetailsModalProps) {
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(false);
  
  const { data: assignedEquipment = [], isLoading: equipmentLoading } = useDriverEquipment(driver.user_id);
  const { data: driverCards = [], isLoading: cardsLoading } = useDriverCards(driver.user_id);
  const { ownerOperator, isLoading: ownerOperatorLoading } = useOwnerOperator(driver.user_id);

  useEffect(() => {
    if (isOpen && driver.user_id) {
      loadProfileData();
    }
  }, [isOpen, driver.user_id]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', driver.user_id)
        .single();

      if (error) throw error;
      
      setProfileData({
        created_at: data?.created_at,
        email: 'Información restringida' // El email no está disponible en el cliente
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fullName = `${driver.first_name} ${driver.last_name}`.trim();
  const initials = [driver.first_name, driver.last_name]
    .filter(Boolean)
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {driver.avatar_url && (
                <AvatarImage src={driver.avatar_url} alt={fullName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials || '??'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{fullName || 'Sin nombre'}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(driver.current_status) as any}>
                  {getStatusText(driver.current_status)}
                </Badge>
                {ownerOperator && (
                  <Badge variant="outline" className="text-xs">
                    Owner-Operator
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Teléfono</p>
                      <p className="text-sm text-muted-foreground">{driver.phone || 'No especificado'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{profileData.email || 'No especificado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Fecha de Contratación</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.hire_date 
                          ? format(new Date(driver.hire_date), 'dd/MM/yyyy', { locale: es })
                          : 'No especificada'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Experiencia</p>
                      <p className="text-sm text-muted-foreground">
                        {formatExperience(driver.license_issue_date, driver.hire_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {driver.emergency_contact_name && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Contacto de Emergencia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Nombre</p>
                        <p className="text-sm text-muted-foreground">{driver.emergency_contact_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Teléfono</p>
                        <p className="text-sm text-muted-foreground">{driver.emergency_contact_phone || 'No especificado'}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Número de Licencia</p>
                      <p className="text-sm text-muted-foreground">{driver.license_number || 'No especificado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Clase CDL</p>
                      <p className="text-sm text-muted-foreground">{driver.cdl_class || 'No especificada'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Estado de Emisión</p>
                      <p className="text-sm text-muted-foreground">{driver.license_state || 'No especificado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Fecha de Emisión</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.license_issue_date 
                          ? format(new Date(driver.license_issue_date), 'dd/MM/yyyy', { locale: es })
                          : 'No especificada'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Fecha de Vencimiento</p>
                      <div className="flex flex-col">
                        <p className="text-sm text-muted-foreground">
                          {driver.license_expiry_date 
                            ? format(new Date(driver.license_expiry_date), 'dd/MM/yyyy', { locale: es })
                            : 'No especificada'
                          }
                        </p>
                        {driver.license_expiry_date && (
                          <>
                            {getExpiryInfo(driver.license_expiry_date).isExpired && (
                              <span className="text-red-600 font-semibold text-xs">⚠️ VENCIDA</span>
                            )}
                            {getExpiryInfo(driver.license_expiry_date).isExpiring && !getExpiryInfo(driver.license_expiry_date).isExpired && (
                              <span className="text-orange-600 font-semibold text-xs">⚠️ PRÓXIMO A VENCER</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
                            Asignado: {format(new Date(equipment.assigned_date), 'dd/MM/yyyy', { locale: es })}
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
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : driverCards.length > 0 ? (
                  <div className="space-y-3">
                    {driverCards.map((card) => (
                      <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{card.card_provider}</p>
                          <p className="text-sm text-muted-foreground">
                            **** **** **** {card.card_number_last_five}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Asignada: {format(new Date(card.assigned_date), 'dd/MM/yyyy', { locale: es })}
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
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : ownerOperator ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Información de Negocio (Owner-Operator)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Nombre del Negocio</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_name || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tipo de Negocio</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_type || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tax ID / EIN</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.tax_id || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Teléfono del Negocio</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_phone || 'No especificado'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium">Dirección del Negocio</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_address || 'No especificada'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Configuración Financiera</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Comisión Dispatching</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.dispatching_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Comisión Factoring</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.factoring_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Comisión Leasing</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.leasing_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pago de Seguro</p>
                        <p className="text-sm text-muted-foreground">${ownerOperator.insurance_pay}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">
                    Este conductor no es Owner-Operator
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}