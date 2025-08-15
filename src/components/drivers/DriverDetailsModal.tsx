import { useState, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { User, Truck, Phone, MapPin, Calendar, Shield, Clock, FileText, CreditCard, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useDriverEquipment } from "@/hooks/useDriverEquipment";
import { useDriverCards } from "@/hooks/useDriverCards";
import { useOwnerOperator } from "@/hooks/useOwnerOperator";
import { getExpiryInfo, formatDateOnly } from '@/lib/dateFormatting';
import { capitalizeWords } from '@/lib/textUtils';
import type { ConsolidatedDriver } from "@/hooks/useConsolidatedDrivers";
import { EditDriverDialog } from "./EditDriverDialog";

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: ConsolidatedDriver;
  onDriverUpdated?: () => void;
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
      return "Available";
    case "on_route":
      return "On Route";
    case "off_duty":
      return "Off Duty";
    default:
      return status;
  }
};

const formatExperience = (licenseIssueDate: string | null, hireDate: string | null) => {
  const experienceDate = licenseIssueDate || hireDate;
  
  if (!experienceDate) return "Not specified";
  
  try {
    // Use safe function to parse dates
    let year: number, month: number, day: number;
    
    if (experienceDate.includes('T') || experienceDate.includes('Z')) {
      // ISO format: extract only date part
      const datePart = experienceDate.split('T')[0];
      [year, month, day] = datePart.split('-').map(Number);
    } else if (experienceDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date only format: YYYY-MM-DD
      [year, month, day] = experienceDate.split('-').map(Number);
    } else {
      return "Not specified";
    }
    
    // Create local date avoiding timezone issues
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

export function DriverDetailsModal({ isOpen, onClose, driver, onDriverUpdated }: DriverDetailsModalProps) {
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const { data: assignedEquipment = [], isLoading: equipmentLoading, refetch: refetchEquipment } = useDriverEquipment(driver.user_id);
  const { data: driverCards = [], isLoading: cardsLoading, refetch: refetchCards } = useDriverCards(driver.user_id);
  const { ownerOperator, isLoading: ownerOperatorLoading, refetch: refetchOwnerOperator } = useOwnerOperator(driver.user_id);

  useEffect(() => {
    if (isOpen && driver.user_id) {
      loadProfileData();
    }
  }, [isOpen, driver.user_id]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Get basic profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', driver.user_id)
        .single();

      if (error) throw error;
      
      // Try to get email from authenticated user
      let email = 'Not available';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === driver.user_id) {
          // If authenticated user is same driver, show their email
          email = user.email || 'Not specified';
        } else {
          // If it's an admin, try to get email another way
          const { data: userData, error: userError } = await supabase
            .rpc('get_user_email_by_id', { user_id_param: driver.user_id });
          
          if (!userError && userData) {
            email = userData;
          }
        }
      } catch (emailError) {
        console.log('Could not get email:', emailError);
      }
      
      setProfileData({
        created_at: data?.created_at,
        email: email
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverUpdated = () => {
    // Reload all driver detail modal data
    loadProfileData();
    refetchEquipment();
    refetchCards();
    refetchOwnerOperator();
    // Notify parent page to also update
    onDriverUpdated?.();
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
          <div className="flex items-center justify-between">
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
                <h2 className="text-xl font-semibold">{fullName || 'No name'}</h2>
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
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="license">License</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{driver.phone || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{profileData.email || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Hire Date</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.hire_date 
                          ? formatDateOnly(driver.hire_date)
                          : 'Not specified'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Experience</p>
                      <p className="text-sm text-muted-foreground">
                        {formatExperience(driver.license_issue_date, driver.hire_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {driver.emergency_contact_name && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Name</p>
                        <p className="text-sm text-muted-foreground">{driver.emergency_contact_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{driver.emergency_contact_phone || 'Not specified'}</p>
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
                  License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">License Number</p>
                      <p className="text-sm text-muted-foreground">{driver.license_number || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">CDL Class</p>
                      <p className="text-sm text-muted-foreground">{driver.cdl_class || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Issuing State</p>
                      <p className="text-sm text-muted-foreground">{driver.license_state || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Issue Date</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.license_issue_date 
                          ? formatDateOnly(driver.license_issue_date)
                          : 'Not specified'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Expiry Date</p>
                       <div className="flex flex-col">
                         <p className="text-sm text-muted-foreground">
                           {driver.license_expiry_date 
                             ? formatDateOnly(driver.license_expiry_date)
                             : 'Not specified'
                           }
                         </p>
                         {driver.license_expiry_date && (
                          <>
                            {getExpiryInfo(driver.license_expiry_date).isExpired && (
                              <span className="text-red-600 font-semibold text-xs">⚠️ EXPIRED</span>
                            )}
                            {getExpiryInfo(driver.license_expiry_date).isExpiring && !getExpiryInfo(driver.license_expiry_date).isExpired && (
                              <span className="text-orange-600 font-semibold text-xs">⚠️ EXPIRING SOON</span>
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
                  Assigned Equipment
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
                             Assigned: {formatDateOnly(equipment.assigned_date)}
                           </p>
                         </div>
                         <Badge variant={equipment.is_active ? "default" : "secondary"}>
                           {equipment.is_active ? "Active" : "Inactive"}
                         </Badge>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-muted-foreground text-center py-8">
                     No equipment assigned to this driver
                   </p>
                 )}
               </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Fuel Cards
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
                            Assigned: {formatDateOnly(card.assigned_date)}
                          </p>
                        </div>
                        <Badge variant={card.is_active ? "default" : "secondary"}>
                          {card.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No fuel cards assigned
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
                    Business Information (Owner-Operator)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Business Name</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_name || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Business Type</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tax ID / EIN</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.tax_id || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Business Phone</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_phone || 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium">Business Address</p>
                      <p className="text-sm text-muted-foreground">{ownerOperator.business_address || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Financial Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Dispatching Commission</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.dispatching_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Factoring Commission</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.factoring_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Leasing Commission</p>
                        <p className="text-sm text-muted-foreground">{ownerOperator.leasing_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Insurance Payment</p>
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
                    This driver is not an Owner-Operator
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit dialog */}
        <EditDriverDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          driver={driver}
          onSuccess={() => {
            setShowEditDialog(false);
            handleDriverUpdated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}