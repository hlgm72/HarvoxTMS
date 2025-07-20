
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyDrivers, CompanyDriver } from "@/hooks/useCompanyDrivers";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
import { useCompanyBrokers, CompanyBroker } from "@/hooks/useCompanyBrokers";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useLoadNumberValidation } from "@/hooks/useLoadNumberValidation";
import { useLoadData } from "@/hooks/useLoadData";
import { useLoadForm } from "@/hooks/useLoadForm";
import { useATMInput } from "@/hooks/useATMInput";
import { createTextHandlers } from "@/lib/textUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowRight, Loader2, AlertTriangle, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { ContactCombobox } from "@/components/clients/ContactCombobox";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { CreateDispatcherDialog } from "@/components/clients/CreateDispatcherDialog";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { LoadAssignmentSection } from "./LoadAssignmentSection";

interface CreateLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  loadData?: any;
}

export function CreateLoadDialog({ isOpen, onClose, mode = 'create', loadData: externalLoadData }: CreateLoadDialogProps) {
  const { t } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<CompanyBroker | null>(null);
  const [showCreateBroker, setShowCreateBroker] = useState(false);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [loadStops, setLoadStops] = useState<any[]>([]);
  const [showStopsValidation, setShowStopsValidation] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<CompanyDriver | null>(null);
  const [loadDocuments, setLoadDocuments] = useState<any[]>([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState<any>(null);

  // Hooks
  const { drivers } = useCompanyDrivers();
  const { data: dispatchers = [] } = useCompanyDispatchers();
  const { brokers, loading: brokersLoading, refetch: refetchBrokers } = useCompanyBrokers();
  const createLoadMutation = useCreateLoad();

  // Load data hook for edit mode
  const { loadData: fetchedLoadData, isLoading: loadDataLoading, error: loadDataError } = useLoadData(
    mode === 'edit' ? externalLoadData?.id : undefined
  );

  // Use fetched data if available, otherwise use external data
  const activeLoadData = fetchedLoadData || externalLoadData;

  // Form hook
  const { form, isFormReady } = useLoadForm(mode === 'edit' ? activeLoadData : null);

  // Load number validation (skip in edit mode initially)
  const currentLoadNumber = form.watch("load_number");
  const loadNumberValidation = useLoadNumberValidation(
    currentLoadNumber,
    mode === 'edit' && !form.formState.dirtyFields.load_number, // Skip validation if in edit mode and field not dirty
    mode === 'edit' ? activeLoadData?.id : undefined
  );

  // ATM Input
  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value, { shouldValidate: true });
    }
  });

  // Initialize form and states when load data is available
  useEffect(() => {
    if (mode === 'edit' && activeLoadData && isFormReady) {
      console.log('🔄 CreateLoadDialog - Initializing edit mode with data:', activeLoadData);
      console.log('🔄 CreateLoadDialog - Available brokers:', brokers.length);
      console.log('🔄 CreateLoadDialog - Available drivers:', drivers.length);

      // Update ATM input
      atmInput.setValue(activeLoadData.total_amount || 0);

      // Find and set broker/client
      if (activeLoadData.client_id && brokers.length > 0) {
        console.log('🔍 CreateLoadDialog - Looking for client:', activeLoadData.client_id);
        const broker = brokers.find(b => b.id === activeLoadData.client_id);
        if (broker) {
          console.log('✅ CreateLoadDialog - Client found:', broker.name);
          setSelectedBroker(broker);
          form.setValue("broker_id", broker.id);
          
          // Find and set broker dispatcher if available
          if (activeLoadData.client_contact_id && broker.dispatchers) {
            console.log('🔍 CreateLoadDialog - Looking for contact:', activeLoadData.client_contact_id);
            const brokerDispatcher = broker.dispatchers.find(d => d.id === activeLoadData.client_contact_id);
            if (brokerDispatcher) {
              console.log('✅ CreateLoadDialog - Contact found:', brokerDispatcher.name);
              form.setValue("dispatcher_id", brokerDispatcher.id);
            }
          }
        } else {
          console.warn('⚠️ CreateLoadDialog - Client not found in brokers list');
        }
      }

      // Find and set driver
      if (activeLoadData.driver_user_id && drivers.length > 0) {
        console.log('🔍 CreateLoadDialog - Looking for driver:', activeLoadData.driver_user_id);
        const driver = drivers.find(d => d.user_id === activeLoadData.driver_user_id);
        if (driver) {
          console.log('✅ CreateLoadDialog - Driver found:', driver.first_name, driver.last_name);
          setSelectedDriver(driver);
        } else {
          console.warn('⚠️ CreateLoadDialog - Driver not found in drivers list');
        }
      }

      // Find and set dispatcher
      if (activeLoadData.internal_dispatcher_id && dispatchers.length > 0) {
        const dispatcher = dispatchers.find(d => d.user_id === activeLoadData.internal_dispatcher_id);
        if (dispatcher) {
          setSelectedDispatcher(dispatcher);
        }
      }

      // Set stops
      if (activeLoadData.stops && activeLoadData.stops.length > 0) {
        console.log('📍 CreateLoadDialog - Setting stops from load data:', activeLoadData.stops);
        setLoadStops(activeLoadData.stops);
      }
    }
  }, [mode, activeLoadData, isFormReady, brokers, drivers, dispatchers]);

  // Show loading state
  if (mode === 'edit' && loadDataLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando datos de la carga...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state
  if (mode === 'edit' && loadDataError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center p-8">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
            <p className="text-sm text-muted-foreground mb-4">{loadDataError}</p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const phases = [
    { id: 1, title: "Información Esencial", description: "Datos básicos de la carga", completed: false },
    { id: 2, title: "Detalles de Ruta", description: "Paradas y direcciones", completed: false },
    { id: 3, title: "Asignación", description: "Conductor y activación", completed: false },
    { id: 4, title: "Documentos", description: "Rate confirmation y Load Order", completed: false }
  ];

  const handleClose = () => {
    // Simple close for now, can add unsaved changes check later
    onClose();
  };

  const onSubmit = (values: any) => {
    console.log('🚨 onSubmit called with values:', values);
    
    // En modo edición, permitir guardar en cualquier fase
    // En modo creación, solo permitir en la fase final
    if (mode === 'create' && currentPhase !== 4) {
      console.log('🚨 onSubmit blocked - not in final phase for create mode');
      return;
    }

    // Solo validar número duplicado en modo creación
    if (mode === 'create' && loadNumberValidation.isDuplicate) {
      console.log('🚨 onSubmit blocked - duplicate load number');
      toast({
        title: "Error",
        description: "No se puede crear la carga con un número duplicado.",
        variant: "destructive",
      });
      return;
    }

    // Solo validar conductor en modo creación o si estamos en la fase de asignación
    if (mode === 'create' && !selectedDriver) {
      console.log('🚨 onSubmit blocked - no driver selected');
      toast({
        title: "Error",
        description: "Debes seleccionar un conductor antes de crear la carga.",
        variant: "destructive",
      });
      return;
    }

    const loadDataToSubmit = {
      mode,
      id: activeLoadData?.id,
      load_number: values.load_number,
      client_id: values.broker_id,
      client_contact_id: values.dispatcher_id || null,
      driver_user_id: selectedDriver?.user_id || activeLoadData?.driver_user_id,
      internal_dispatcher_id: selectedDispatcher?.user_id || null,
      total_amount: parseFloat(values.total_amount) || 0,
      commodity: values.commodity || null,
      weight_lbs: values.weight_lbs,
      notes: values.notes || '',
      stops: loadStops,
      factoring_percentage: values.factoring_percentage,
      dispatching_percentage: values.dispatching_percentage,
      leasing_percentage: values.leasing_percentage,
    };

    console.log('📋 CreateLoadDialog - Submitting load data:', loadDataToSubmit);
    createLoadMutation.mutate(loadDataToSubmit, {
      onSuccess: () => {
        console.log('✅ CreateLoadDialog - Load mutation successful, closing dialog');
        onClose(); // Cerrar el diálogo después del éxito
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva Carga' : 'Editar Carga'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crea una nueva carga siguiendo el proceso paso a paso'
              : 'Modifica los datos de la carga existente'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  currentPhase === phase.id 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : phase.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted bg-background text-muted-foreground"
                }`}>
                  {phase.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{phase.id}</span>
                  )}
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs font-medium">{phase.title}</p>
                  <p className="text-xs text-muted-foreground">{phase.description}</p>
                </div>
              </div>
              {index < phases.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Phase 1: Essential Information */}
            {currentPhase === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Circle className="h-5 w-5 text-primary" />
                    Información Esencial
                  </CardTitle>
                  <CardDescription>
                    Datos básicos necesarios para registrar la carga en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Broker Selection */}
                    <FormField
                      control={form.control}
                      name="broker_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Broker / Cliente *</FormLabel>
                          <FormControl>
                             <ClientCombobox
                               clients={brokers}
                               value={field.value}
                               onValueChange={(value) => {
                                 field.onChange(value);
                                 const broker = brokers.find(b => b.id === value);
                                 setSelectedBroker(broker || null);
                                 form.setValue("dispatcher_id", "");
                               }}
                               onClientSelect={setSelectedBroker}
                               placeholder="Buscar cliente por nombre, DOT, MC..."
                               className="w-full"
                             />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dispatcher Selection */}
                    <FormField
                      control={form.control}
                      name="dispatcher_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contacto del Cliente</FormLabel>
                          <FormControl>
                             <ContactCombobox
                               contacts={selectedBroker?.dispatchers || []}
                               value={field.value}
                               onValueChange={field.onChange}
                               placeholder="Buscar contacto..."
                               disabled={!selectedBroker}
                               className="w-full"
                             />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Load Number */}
                    <FormField
                      control={form.control}
                      name="load_number"
                      render={({ field }) => {
                        const textHandlers = createTextHandlers(
                          (value) => field.onChange(value),
                          'text'
                        );
                        
                        return (
                          <FormItem>
                            <FormLabel>Número de Carga *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="Ej: LD-001, 2024-001, etc." 
                                  value={field.value || ''}
                                  onChange={textHandlers.onChange}
                                  onBlur={textHandlers.onBlur}
                                  className={
                                    loadNumberValidation.isDuplicate 
                                      ? "border-destructive focus:border-destructive" 
                                      : loadNumberValidation.isValid 
                                      ? "border-green-500 focus:border-green-500" 
                                      : ""
                                  }
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                  {loadNumberValidation.isValidating && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  )}
                                  {!loadNumberValidation.isValidating && loadNumberValidation.isDuplicate && (
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  )}
                                  {!loadNumberValidation.isValidating && loadNumberValidation.isValid && currentLoadNumber && (
                                    <Check className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                            {loadNumberValidation.isDuplicate && (
                              <p className="text-sm text-destructive mt-1">
                                Este número de carga ya existe. Por favor use un número diferente.
                              </p>
                            )}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Total Amount */}
                    <FormField
                      control={form.control}
                      name="total_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Total ($) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="text"
                              value={atmInput.displayValue}
                              onKeyDown={atmInput.handleKeyDown}
                              onPaste={atmInput.handlePaste}
                              placeholder="$0.00"
                              className="text-right font-mono"
                              autoComplete="off"
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Commodity */}
                    <FormField
                      control={form.control}
                      name="commodity"
                      render={({ field }) => {
                        const textHandlers = createTextHandlers(
                          (value) => field.onChange(value),
                          'text'
                        );
                        
                        return (
                          <FormItem>
                            <FormLabel>Commodity *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Electronics, Food Products, etc." 
                                value={field.value || ''}
                                onChange={textHandlers.onChange}
                                onBlur={textHandlers.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    {/* Weight */}
                    <FormField
                      control={form.control}
                      name="weight_lbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (lbs)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="25000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: Route Details */}
            {currentPhase === 2 && (
              <LoadStopsManager 
                onStopsChange={setLoadStops} 
                showValidation={showStopsValidation}
                initialStops={loadStops}
              />
            )}

            {/* Phase 3: Driver Assignment */}
            {currentPhase === 3 && (
              <LoadAssignmentSection
                drivers={drivers}
                selectedDriver={selectedDriver}
                onDriverSelect={setSelectedDriver}
                dispatchers={dispatchers}
                selectedDispatcher={selectedDispatcher}
                onDispatcherSelect={setSelectedDispatcher}
              />
            )}

            {/* Phase 4: Documents */}
            {currentPhase === 4 && (
              <LoadDocumentsSection
                loadId={mode === 'edit' ? activeLoadData?.id : null}
                loadData={{
                  load_number: form.getValues("load_number") || '',
                  total_amount: form.getValues("total_amount") || 0,
                  commodity: form.getValues("commodity") || '',
                  weight_lbs: form.getValues("weight_lbs"),
                  broker_name: selectedBroker?.name,
                  driver_name: selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : undefined,
                  loadStops: loadStops
                }}
                onDocumentsChange={setLoadDocuments}
                temporaryDocuments={loadDocuments}
                onTemporaryDocumentsChange={setLoadDocuments}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newPhase = Math.max(1, currentPhase - 1);
                  if (currentPhase === 2) {
                    setShowStopsValidation(false);
                  }
                  setCurrentPhase(newPhase);
                }}
                disabled={currentPhase === 1}
              >
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                
                {currentPhase < phases.length ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentPhase === 2) {
                        setShowStopsValidation(true);
                      }
                      setCurrentPhase(currentPhase + 1);
                    }}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={createLoadMutation.isPending}
                  >
                    {createLoadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {mode === 'create' ? 'Crear Carga' : 'Guardar Cambios'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>

        {/* Create Broker Dialog */}
        <CreateClientDialog
          isOpen={showCreateBroker}
          onClose={() => setShowCreateBroker(false)}
          onSuccess={(brokerId) => {
            form.setValue("broker_id", brokerId);
            const newBroker = brokers.find(b => b.id === brokerId);
            setSelectedBroker(newBroker || null);
          }}
        />

        {/* Create Contact Dialog */}
        <CreateDispatcherDialog
          clientId={selectedBroker?.id || ""}
          open={showCreateDispatcher}
          onOpenChange={setShowCreateDispatcher}
        />
      </DialogContent>
    </Dialog>
  );
}
