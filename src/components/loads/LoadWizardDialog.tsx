import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Check, ChevronLeft, ChevronRight, Building2, Users, MapPin, FileText, AlertTriangle, Loader2, Plus } from "lucide-react";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useLoadNumberValidation } from "@/hooks/useLoadNumberValidation";
import { useCompanyBrokers } from "@/hooks/useCompanyBrokers";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { useLoadStops } from "@/hooks/useLoadStops";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const loadWizardSchema = z.object({
  load_number: z.string().min(1, "El número de carga es requerido"),
  customer_name: z.string().optional(),
  total_amount: z.coerce.number().min(0, "El monto debe ser mayor a 0"),
  currency: z.string().default("USD"),
  commodity: z.string().optional(),
  weight_lbs: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type CompanyBroker = {
  id: string;
  name: string;
  dispatchers?: { id: string; name: string }[];
};

type CompanyDriver = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  license_number: string | null;
  license_expiry_date: string | null;
  license_state: string | null;
  cdl_class: string | null;
  hire_date: string | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  current_status: 'available' | 'on_route' | 'off_duty';
  active_loads_count: number;
};

interface LoadWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  loadData?: any; // Para modo de edición
}

const DRAFT_KEY = 'load_wizard_draft';

export function LoadWizardDialog({ isOpen, onClose, mode, loadData }: LoadWizardDialogProps) {
  console.log('🔍 LoadWizardDialog - mode:', mode, 'isOpen:', isOpen);
  const { t } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<CompanyBroker | null>(null);
  const [showCreateBroker, setShowCreateBroker] = useState(false);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [showStopsValidation, setShowStopsValidation] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<CompanyDriver | null>(null);
  const [loadDocuments, setLoadDocuments] = useState<any[]>([]);
  const { toast } = useToast();

  // Hooks para cargar datos
  const { brokers, loading: brokersLoading } = useCompanyBrokers();
  const { drivers, loading: driversLoading } = useCompanyDrivers();
  const createLoadMutation = useCreateLoad();

  // Hook para manejar las paradas
  const {
    stops: loadStops,
    addStop,
    removeStop,
    updateStop,
    reorderStops,
    validateStops,
    getCalculatedDates,
    setStops: setLoadStops
  } = useLoadStops();

  const form = useForm<z.infer<typeof loadWizardSchema>>({
    resolver: zodResolver(loadWizardSchema),
    defaultValues: {
      load_number: "",
      customer_name: "",
      total_amount: 0,
      currency: "USD",
      commodity: "",
      weight_lbs: 0,
      notes: "",
    },
  });
  
  // Validación de número de carga duplicado (solo para modo crear)
  const currentLoadNumber = form.watch("load_number");
  const loadNumberValidation = mode === 'create' ? useLoadNumberValidation(currentLoadNumber) : { isDuplicate: false, isValidating: false };
  
  // Cargar datos en modo edición
  useEffect(() => {
    if (mode === 'edit' && loadData && isOpen) {
      console.log('🔄 Loading edit data:', loadData);
      
      // Cargar datos del formulario
      form.reset({
        load_number: loadData.load_number || "",
        customer_name: loadData.customer_name || "",
        total_amount: loadData.total_amount || 0,
        currency: loadData.currency || "USD",
        commodity: loadData.commodity || "",
        weight_lbs: loadData.weight_lbs || 0,
        notes: loadData.notes || "",
      });

      // Cargar broker seleccionado
      if (loadData.broker_id) {
        const broker = brokers.find(b => b.id === loadData.broker_id);
        if (broker) setSelectedBroker(broker);
      }

      // Cargar conductor seleccionado
      if (loadData.driver_user_id) {
        const driver = drivers.find(d => d.user_id === loadData.driver_user_id);
        if (driver) setSelectedDriver(driver);
      }

      // Cargar paradas si existen
      if (loadData.stops) {
        setLoadStops(loadData.stops);
      }
    }
  }, [mode, loadData, isOpen, brokers, drivers, form, setLoadStops]);

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setCurrentPhase(1);
      setSelectedBroker(null);
      setSelectedDriver(null);
      setShowStopsValidation(false);
      setLoadStops([]);
      setLoadDocuments([]);
      if (mode === 'create') {
        form.reset();
      }
    }
  }, [isOpen, mode, form, setLoadStops]);

  const phases = [
    { id: 1, name: "Información Básica", icon: Building2 },
    { id: 2, name: "Asignación", icon: Users },
    { id: 3, name: "Paradas", icon: MapPin },
    { id: 4, name: "Documentos", icon: FileText },
  ];

  const isPhaseValid = (phase: number): boolean => {
    switch (phase) {
      case 1:
        const values = form.getValues();
        return !!(values.load_number && values.total_amount > 0 && 
                  (!loadNumberValidation.isDuplicate || mode === 'edit'));
      case 2:
        return !!(selectedBroker && selectedDriver);
      case 3:
        const validation = validateStops();
        return validation.isValid;
      case 4:
        return true; // Los documentos son opcionales
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentPhase < 4) {
      if (currentPhase === 3) {
        setShowStopsValidation(true);
      }
      if (isPhaseValid(currentPhase)) {
        setCurrentPhase(currentPhase + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentPhase > 1) {
      setCurrentPhase(currentPhase - 1);
    }
  };

  const onSubmit = (values: z.infer<typeof loadWizardSchema>) => {
    console.log('🚨 onSubmit called - mode:', mode, 'phase:', currentPhase);
    
    // Solo permitir submit en la fase final
    if (currentPhase !== 4) {
      console.log('🚨 onSubmit blocked - not in final phase');
      return;
    }
    
    if (mode === 'create') {
      // Validaciones para crear
      if (loadNumberValidation.isDuplicate) {
        console.log('🚨 onSubmit blocked - duplicate load number');
        toast({
          title: "Error",
          description: "No se puede crear la carga con un número duplicado.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedDriver) {
        console.log('🚨 onSubmit blocked - no driver selected');
        toast({
          title: "Error",
          description: "Debes seleccionar un conductor antes de crear la carga.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ All validations passed, creating load...');

      const pickupStop = loadStops.find(stop => stop.stop_type === 'pickup');
      const deliveryStop = loadStops.find(stop => stop.stop_type === 'delivery');
      
      console.log('📦 Creating load with:', {
        loadStops,
        pickupStop,
        deliveryStop,
        stopsCount: loadStops.length
      });

      createLoadMutation.mutate({
        load_number: values.load_number,
        driver_user_id: selectedDriver.user_id,
        broker_id: selectedBroker?.id,
        customer_name: values.customer_name,
        total_amount: values.total_amount,
        // currency: values.currency, // Removed - not in CreateLoadData interface
        commodity: values.commodity,
        weight_lbs: values.weight_lbs,
        notes: values.notes,
        pickup_city: pickupStop ? `${pickupStop.city}, ${pickupStop.state}` : undefined,
        delivery_city: deliveryStop ? `${deliveryStop.city}, ${deliveryStop.state}` : undefined,
        stops: loadStops,
      }, {
        onSuccess: () => {
          toast({
            title: "Éxito",
            description: "La carga ha sido creada exitosamente.",
          });
          onClose();
        },
        onError: (error: any) => {
          console.error('❌ Error creating load:', error);
          toast({
            title: "Error",
            description: "Hubo un error al crear la carga. Por favor intenta de nuevo.",
            variant: "destructive",
          });
        }
      });
    } else {
      // TODO: Implementar lógica de edición
      console.log('📝 Would update load with:', values);
      toast({
        title: "Funcionalidad en desarrollo",
        description: "La edición de cargas estará disponible próximamente.",
      });
    }
  };

  const currentPhaseData = phases.find(phase => phase.id === currentPhase);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              {mode === 'create' ? 'Crear Nueva Carga' : 'Editar Carga'}
              {loadData?.load_number && mode === 'edit' && ` - ${loadData.load_number}`}
            </DialogTitle>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-between pt-4">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 
                    ${currentPhase === phase.id 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : currentPhase > phase.id || isPhaseValid(phase.id)
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground bg-background text-muted-foreground'
                    }
                  `}>
                    {currentPhase > phase.id || isPhaseValid(phase.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <phase.icon className="h-4 w-4" />
                    )}
                  </div>
                  {index < phases.length - 1 && (
                    <div className={`
                      w-12 h-0.5 mx-2
                      ${currentPhase > phase.id ? 'bg-green-500' : 'bg-muted'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center pt-2">
              <h3 className="font-medium">{currentPhaseData?.name}</h3>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Phase 1: Información Básica */}
                {currentPhase === 1 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Información de la Carga
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="load_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número de Carga *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      {...field} 
                                      placeholder="LD-2024-001"
                                      disabled={mode === 'edit'} // No editable en modo edición
                                    />
                                    {mode === 'create' && loadNumberValidation.isValidating && (
                                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                                    )}
                                    {mode === 'create' && loadNumberValidation.isDuplicate && (
                                      <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                                    )}
                                  </div>
                                </FormControl>
                                {mode === 'create' && loadNumberValidation.isDuplicate && (
                                  <p className="text-sm text-destructive">
                                    Este número de carga ya existe
                                  </p>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="customer_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Nombre del cliente" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="total_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monto Total *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    step="0.01"
                                    placeholder="0.00" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Moneda</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar moneda" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="CAD">CAD</SelectItem>
                                    <SelectItem value="MXN">MXN</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="weight_lbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Peso (lbs)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    placeholder="0" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="commodity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Commodity</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Descripción del commodity" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Notas adicionales sobre la carga..."
                                  className="min-h-[80px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Phase 2: Asignación */}
                {currentPhase === 2 && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Asignación de Recursos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Selección de Broker */}
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Broker *</Label>
                          <div className="flex gap-2">
                            <Select
                              value={selectedBroker?.id || ""}
                              onValueChange={(value) => {
                                const broker = brokers.find(b => b.id === value);
                                setSelectedBroker(broker || null);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Seleccionar broker" />
                              </SelectTrigger>
                              <SelectContent>
                                {brokers.map((broker) => (
                                  <SelectItem key={broker.id} value={broker.id}>
                                    {broker.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowCreateBroker(true)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {selectedBroker && (
                            <div className="mt-2 p-3 bg-muted rounded-lg">
                              <p className="font-medium">{selectedBroker.name}</p>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Selección de Conductor */}
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Conductor *</Label>
                          <Select
                            value={selectedDriver?.user_id || ""}
                            onValueChange={(value) => {
                              const driver = drivers.find(d => d.user_id === value);
                              setSelectedDriver(driver || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar conductor" />
                            </SelectTrigger>
                            <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.user_id} value={driver.user_id}>
                                {driver.first_name} {driver.last_name}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          {selectedDriver && (
                            <div className="mt-2 p-3 bg-muted rounded-lg">
                              <p className="font-medium">{selectedDriver.first_name} {selectedDriver.last_name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Phase 3: Paradas */}
                {currentPhase === 3 && (
                  <LoadStopsManager 
                    showValidation={showStopsValidation}
                  />
                )}

                {/* Phase 4: Documentos */}
                {currentPhase === 4 && (
                  <LoadDocumentsSection
                    temporaryDocuments={loadDocuments}
                    onTemporaryDocumentsChange={setLoadDocuments}
                  />
                )}
              </form>
            </Form>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentPhase === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentPhase} de {phases.length}
              </span>
            </div>

            <div>
              {currentPhase < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!isPhaseValid(currentPhase)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={() => {
                    console.log('🔄 Manual form submission triggered');
                    form.handleSubmit(onSubmit)();
                  }}
                  disabled={!isPhaseValid(currentPhase) || createLoadMutation.isPending}
                >
                  {createLoadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === 'create' ? 'Crear Carga' : 'Guardar Cambios'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TODO: Dialogs adicionales para crear broker y dispatcher */}
    </>
  );
}