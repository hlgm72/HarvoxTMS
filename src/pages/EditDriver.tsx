import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { 
  User,
  Truck,
  Building,
  DollarSign,
  ArrowLeft,
  CalendarIcon,
  Save,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StateCombobox } from "@/components/ui/StateCombobox";

interface DriverData {
  // Información General (profiles)
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  preferred_language: string;
  timezone: string;
  
  // Información del Conductor (driver_profiles)
  license_number: string;
  license_state: string;
  license_expiry_date: Date | null;
  cdl_class: string;
  date_of_birth: Date | null;
  hire_date: Date | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  driver_id: string;
  
  // Información de Empleado (company_drivers)
  is_active: boolean;
  termination_date: Date | null;
  termination_reason: string;
  
  // Información Owner-Operator (owner_operators)
  is_owner_operator: boolean;
  business_name: string;
  business_type: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_id: string;
  dispatching_percentage: number;
  factoring_percentage: number;
  leasing_percentage: number;
  insurance_pay: number;
}

const CDL_CLASSES = [
  { value: 'A', label: 'Clase A' },
  { value: 'B', label: 'Clase B' },
  { value: 'C', label: 'Clase C' },
];

const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Propietario Único' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporación' },
  { value: 'partnership', label: 'Sociedad' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
];

export default function EditDriver() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("employee");
  
  const [driverData, setDriverData] = useState<DriverData>({
    // Información General
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
    preferred_language: "es",
    timezone: "America/New_York",
    
    // Información del Conductor
    license_number: "",
    license_state: "",
    license_expiry_date: null,
    cdl_class: "",
    date_of_birth: null,
    hire_date: null,
    emergency_contact_name: "",
    emergency_contact_phone: "",
    driver_id: "",
    
    // Información de Empleado
    is_active: true,
    termination_date: null,
    termination_reason: "",
    
    // Información Owner-Operator
    is_owner_operator: false,
    business_name: "",
    business_type: "",
    business_address: "",
    business_phone: "",
    business_email: "",
    tax_id: "",
    dispatching_percentage: 5,
    factoring_percentage: 3,
    leasing_percentage: 5,
    insurance_pay: 0,
  });

  useEffect(() => {
    if (userId) {
      fetchDriverData();
    }
  }, [userId]);

  const fetchDriverData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Obtener información general del perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Obtener información del conductor
      const { data: driverProfile, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Obtener información de empleado
      const { data: companyDriver, error: companyDriverError } = await supabase
        .from('company_drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Obtener información de owner-operator
      const { data: ownerOperator, error: ownerOperatorError } = await supabase
        .from('owner_operators')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Combinar todos los datos
      setDriverData({
        // Información General
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        phone: profile?.phone || "",
        avatar_url: profile?.avatar_url || "",
        preferred_language: profile?.preferred_language || "es",
        timezone: profile?.timezone || "America/New_York",
        
        // Información del Conductor
        license_number: driverProfile?.license_number || "",
        license_state: driverProfile?.license_state || "",
        license_expiry_date: driverProfile?.license_expiry_date ? new Date(driverProfile.license_expiry_date) : null,
        cdl_class: driverProfile?.cdl_class || "",
        date_of_birth: driverProfile?.date_of_birth ? new Date(driverProfile.date_of_birth) : null,
        hire_date: driverProfile?.hire_date ? new Date(driverProfile.hire_date) : null,
        emergency_contact_name: driverProfile?.emergency_contact_name || "",
        emergency_contact_phone: driverProfile?.emergency_contact_phone || "",
        driver_id: driverProfile?.driver_id || "",
        
        // Información de Empleado
        is_active: companyDriver?.is_active ?? true,
        termination_date: companyDriver?.termination_date ? new Date(companyDriver.termination_date) : null,
        termination_reason: companyDriver?.termination_reason || "",
        
        // Información Owner-Operator
        is_owner_operator: !!ownerOperator,
        business_name: ownerOperator?.business_name || "",
        business_type: ownerOperator?.business_type || "",
        business_address: ownerOperator?.business_address || "",
        business_phone: ownerOperator?.business_phone || "",
        business_email: ownerOperator?.business_email || "",
        tax_id: ownerOperator?.tax_id || "",
        dispatching_percentage: ownerOperator?.dispatching_percentage || 5,
        factoring_percentage: ownerOperator?.factoring_percentage || 3,
        leasing_percentage: ownerOperator?.leasing_percentage || 5,
        insurance_pay: ownerOperator?.insurance_pay || 0,
      });
      
    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast.error('Error al cargar los datos del conductor');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setSaving(true);
    try {
      // Actualizar campos administrativos del conductor (driver_id y hire_date)
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .upsert({
          user_id: userId,
          driver_id: driverData.driver_id,
          hire_date: driverData.hire_date?.toISOString().split('T')[0] || null,
        }, {
          onConflict: 'user_id'
        });

      if (driverError) throw driverError;

      // Actualizar información de empleado (administrativa)
      const { error: companyDriverError } = await supabase
        .from('company_drivers')
        .upsert({
          user_id: userId,
          is_active: driverData.is_active,
          termination_date: driverData.termination_date?.toISOString().split('T')[0] || null,
          termination_reason: driverData.termination_reason,
        }, {
          onConflict: 'user_id'
        });

      if (companyDriverError) throw companyDriverError;

      // Manejar información de owner-operator (comercial)
      if (driverData.is_owner_operator) {
        const { error: ownerOperatorError } = await supabase
          .from('owner_operators')
          .upsert({
            user_id: userId,
            business_name: driverData.business_name,
            business_type: driverData.business_type,
            business_address: driverData.business_address,
            business_phone: driverData.business_phone,
            business_email: driverData.business_email,
            tax_id: driverData.tax_id,
            dispatching_percentage: driverData.dispatching_percentage,
            factoring_percentage: driverData.factoring_percentage,
            leasing_percentage: driverData.leasing_percentage,
            insurance_pay: driverData.insurance_pay,
          }, {
            onConflict: 'user_id'
          });

        if (ownerOperatorError) throw ownerOperatorError;
      } else {
        // Si no es owner-operator, eliminar el registro
        const { error: deleteError } = await supabase
          .from('owner_operators')
          .delete()
          .eq('user_id', userId);

        if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
      }

      toast.success('Información administrativa del conductor actualizada correctamente');
      navigate('/users');
      
    } catch (error) {
      console.error('Error saving driver data:', error);
      toast.error('Error al guardar la información del conductor');
    } finally {
      setSaving(false);
    }
  };

  const updateDriverData = async (field: keyof DriverData, value: any) => {
    console.log('updateDriverData called:', { field, value, currentIsOwnerOperator: driverData.is_owner_operator });
    
    // Si se está marcando como Owner Operator, heredar valores de la compañía
    if (field === 'is_owner_operator' && value === true && !driverData.is_owner_operator) {
      console.log('Attempting to inherit company percentages...');
      try {
        // Obtener la compañía del driver
        const { data: userRole, error: roleError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();
        
        console.log('User role query result:', { userRole, roleError });
        if (roleError) throw roleError;
        
        // Obtener los valores por defecto de la compañía
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('default_factoring_percentage, default_dispatching_percentage, default_leasing_percentage')
          .eq('id', userRole.company_id)
          .single();
        
        console.log('Company query result:', { company, companyError });
        if (companyError) throw companyError;
        
        // Actualizar con los valores heredados de la compañía
        const newData = { 
          ...driverData, 
          [field]: value,
          dispatching_percentage: company.default_dispatching_percentage || 5,
          factoring_percentage: company.default_factoring_percentage || 3,
          leasing_percentage: company.default_leasing_percentage || 5,
        };
        
        console.log('Setting new driver data:', newData);
        setDriverData(newData);
        
        toast.success('Porcentajes heredados de la compañía');
        return;
      } catch (error) {
        console.error('Error inheriting company percentages:', error);
        toast.error('Error al heredar valores de la compañía, usando valores por defecto');
        // Continuar con valores por defecto
      }
    }
    
    console.log('Setting normal field update:', { field, value });
    setDriverData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando información del conductor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/users')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Usuarios
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Conductor</h1>
            <p className="text-muted-foreground">
              {driverData.first_name && driverData.last_name 
                ? `${driverData.first_name} ${driverData.last_name}`
                : 'Sin nombre'
              }
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Tabs para los 4 grupos de datos */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Solo mostrar pestañas administrativas para Owners */}
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Información de Empleado
              </TabsTrigger>
              <TabsTrigger value="owner-operator" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Owner-Operator
              </TabsTrigger>
            </TabsList>

            {/* Información de Empleado */}
            <TabsContent value="employee" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="driver_id">ID del Conductor</Label>
                  <Input
                    id="driver_id"
                    value={driverData.driver_id}
                    onChange={(e) => updateDriverData('driver_id', e.target.value)}
                    placeholder="ID único asignado por la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Contratación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !driverData.hire_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {driverData.hire_date ? (
                          format(driverData.hire_date, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={driverData.hire_date || undefined}
                        onSelect={(date) => updateDriverData('hire_date', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="is_active">Estado del Empleado</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={driverData.is_active}
                      onCheckedChange={(checked) => updateDriverData('is_active', checked)}
                    />
                    <Label htmlFor="is_active">
                      {driverData.is_active ? 'Activo' : 'Inactivo'}
                    </Label>
                  </div>
                </div>
                
                {!driverData.is_active && (
                  <>
                    <div className="space-y-2">
                      <Label>Fecha de Terminación</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !driverData.termination_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {driverData.termination_date ? (
                              format(driverData.termination_date, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={driverData.termination_date || undefined}
                            onSelect={(date) => updateDriverData('termination_date', date)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termination_reason">Razón de Terminación</Label>
                      <Input
                        id="termination_reason"
                        value={driverData.termination_reason}
                        onChange={(e) => updateDriverData('termination_reason', e.target.value)}
                        placeholder="Motivo de la terminación"
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Owner-Operator */}
            <TabsContent value="owner-operator" className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_owner_operator"
                    checked={driverData.is_owner_operator}
                    onCheckedChange={(checked) => {
                      console.log('Switch clicked:', checked);
                      updateDriverData('is_owner_operator', checked);
                    }}
                  />
                  <Label htmlFor="is_owner_operator">
                    Este conductor es un Owner-Operator
                  </Label>
                </div>

                {driverData.is_owner_operator && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">Nombre del Negocio</Label>
                      <Input
                        id="business_name"
                        value={driverData.business_name}
                        onChange={(e) => updateDriverData('business_name', e.target.value)}
                        placeholder="Nombre de la empresa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_type">Tipo de Negocio</Label>
                      <Select
                        value={driverData.business_type}
                        onValueChange={(value) => updateDriverData('business_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="business_address">Dirección del Negocio</Label>
                      <Input
                        id="business_address"
                        value={driverData.business_address}
                        onChange={(e) => updateDriverData('business_address', e.target.value)}
                        placeholder="Dirección completa del negocio"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_phone">Teléfono del Negocio</Label>
                      <Input
                        id="business_phone"
                        value={driverData.business_phone}
                        onChange={(e) => updateDriverData('business_phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_email">Email del Negocio</Label>
                      <Input
                        id="business_email"
                        type="email"
                        value={driverData.business_email}
                        onChange={(e) => updateDriverData('business_email', e.target.value)}
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">Tax ID</Label>
                      <Input
                        id="tax_id"
                        value={driverData.tax_id}
                        onChange={(e) => updateDriverData('tax_id', e.target.value)}
                        placeholder="12-3456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurance_pay">Pago de Seguro</Label>
                      <Input
                        id="insurance_pay"
                        type="number"
                        step="0.01"
                        value={driverData.insurance_pay}
                        onChange={(e) => updateDriverData('insurance_pay', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    {/* Porcentajes */}
                    <div className="md:col-span-2">
                      <h4 className="text-lg font-medium mb-4">Porcentajes de Comisión</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dispatching_percentage">% Dispatching</Label>
                          <Input
                            id="dispatching_percentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={driverData.dispatching_percentage}
                            onChange={(e) => updateDriverData('dispatching_percentage', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="factoring_percentage">% Factoring</Label>
                          <Input
                            id="factoring_percentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={driverData.factoring_percentage}
                            onChange={(e) => updateDriverData('factoring_percentage', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leasing_percentage">% Leasing</Label>
                          <Input
                            id="leasing_percentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={driverData.leasing_percentage}
                            onChange={(e) => updateDriverData('leasing_percentage', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}