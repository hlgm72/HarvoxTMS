import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCompanyDrivers, CompanyDriver } from "@/hooks/useCompanyDrivers";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
import { useCompanyBrokers, CompanyBroker } from "@/hooks/useCompanyBrokers";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useATMInput } from "@/hooks/useATMInput";
import { createTextHandlers } from "@/lib/textUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BrokerCombobox } from "@/components/brokers/BrokerCombobox";
import { BrokerContactCombobox } from "@/components/brokers/BrokerContactCombobox";
import { InternalDispatcherCombobox } from "@/components/dispatchers/InternalDispatcherCombobox";
import { CreateBrokerDialog } from "@/components/brokers/CreateBrokerDialog";
import { CreateDispatcherDialog } from "@/components/brokers/CreateDispatcherDialog";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { LoadAssignmentSection } from "./LoadAssignmentSection";

const createLoadSchema = z.object({
  // Phase 1: Essential Information
  broker_id: z.string().min(1, "Selecciona un broker"),
  broker_contact_id: z.string().optional(),
  dispatcher_id: z.string().optional(),
  load_number: z.string().min(1, "El número de carga es requerido"),
  total_amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  po_number: z.string().optional(),
  pu_number: z.string().optional(),
  commodity: z.string().min(1, "Especifica el commodity"),
  weight_lbs: z.number().optional(),
});

// Mock data - will be replaced with real data
const brokerOptions = [
  { id: "1", name: "ABC Logistics", dispatchers: [
    { id: "1", name: "Juan Pérez" },
    { id: "2", name: "María González" }
  ]},
  { id: "2", name: "XYZ Freight", dispatchers: [
    { id: "3", name: "Ana López" },
    { id: "4", name: "Carlos Ruiz" }
  ]},
];

interface CreateLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRAFT_KEY = 'load_wizard_draft';

export function CreateLoadDialog({ isOpen, onClose }: CreateLoadDialogProps) {
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
  const { drivers } = useCompanyDrivers();
  const { data: dispatchers = [] } = useCompanyDispatchers();
  const [selectedDispatcher, setSelectedDispatcher] = useState<any>(null);
  const { brokers, loading: brokersLoading, refetch: refetchBrokers } = useCompanyBrokers();
  const createLoadMutation = useCreateLoad();

  const form = useForm<z.infer<typeof createLoadSchema>>({
    resolver: zodResolver(createLoadSchema),
    defaultValues: {
      broker_id: "",
      broker_contact_id: "",
      dispatcher_id: "",
      load_number: "",
      total_amount: 0,
      po_number: "",
      pu_number: "",
      commodity: "",
      weight_lbs: 0,
    },
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value, { shouldValidate: true });
    }
  });

  // Funciones para persistencia de datos
  const saveDraft = () => {
    try {
      const formData = form.getValues();
      const draftData = {
        formData,
        currentPhase,
        loadStops,
        selectedBroker: selectedBroker ? { id: selectedBroker.id, name: selectedBroker.name } : null,
        timestamp: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        
        // Cargar datos del formulario
        Object.entries(draftData.formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            form.setValue(key as any, value);
          }
        });

        // Restaurar fase actual
        setCurrentPhase(draftData.currentPhase || 1);
        
        // Restaurar paradas
        if (draftData.loadStops) {
          setLoadStops(draftData.loadStops);
        }

        // Restaurar broker seleccionado (se buscará en la lista actual)
        if (draftData.selectedBroker?.id) {
          const broker = brokers.find(b => b.id === draftData.selectedBroker.id);
          if (broker) {
            setSelectedBroker(broker);
          }
        }

        // Actualizar el ATM input con el valor guardado
        if (draftData.formData.total_amount) {
          atmInput.setValue(draftData.formData.total_amount);
        }

        toast({
          title: "Borrador recuperado",
          description: "Se ha restaurado tu trabajo anterior.",
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  // Verificar si hay datos que podrían perderse
  const hasUnsavedData = () => {
    const formData = form.getValues();
    return (
      formData.load_number || 
      formData.total_amount > 0 || 
      formData.commodity || 
      formData.broker_id || 
      loadStops.length > 0 ||
      selectedDriver ||
      selectedDispatcher
    );
  };

  // Manejar cierre con confirmación
  const handleClose = () => {
    if (hasUnsavedData()) {
      setShowExitConfirmation(true);
    } else {
      onClose();
    }
  };

  // Confirmar cierre y borrar borrador
  const confirmExit = () => {
    clearDraft();
    form.reset();
    setCurrentPhase(1);
    setSelectedBroker(null);
    setSelectedDriver(null);
    setLoadStops([]);
    setLoadDocuments([]);
    setSelectedDispatcher(null);
    atmInput.setValue(0);
    setShowExitConfirmation(false);
    onClose();
  };

  // Cargar borrador al abrir el diálogo
  useEffect(() => {
    if (isOpen && brokers.length > 0) {
      loadDraft();
    }
  }, [isOpen, brokers]);

  // Guardar borrador cuando cambien los datos
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(saveDraft, 1000); // Debounce de 1 segundo
      return () => clearTimeout(timeoutId);
    }
  }, [form.watch(), currentPhase, loadStops, selectedBroker, isOpen]);

  const phases = [
    {
      id: 1,
      title: "Información Esencial",
      description: "Datos básicos de la carga",
      completed: false
    },
    {
      id: 2,
      title: "Detalles de Ruta",
      description: "Paradas y direcciones",
      completed: false
    },
    {
      id: 3,
      title: "Asignación",
      description: "Conductor y activación",
      completed: false
    },
    {
      id: 4,
      title: "Documentos",
      description: "Rate confirmation y Load Order",
      completed: false
    }
  ];

  const onSubmit = (values: z.infer<typeof createLoadSchema>) => {
    // Validar que se haya seleccionado un conductor
    if (!selectedDriver) {
      toast({
        title: "Error",
        description: "Debes seleccionar un conductor antes de crear la carga.",
        variant: "destructive",
      });
      return;
    }

    // Extraer datos de pickup y delivery de las paradas
    const pickupStop = loadStops.find(stop => stop.stop_type === 'pickup');
    const deliveryStop = loadStops.find(stop => stop.stop_type === 'delivery');

    createLoadMutation.mutate({
      load_number: values.load_number,
      driver_user_id: selectedDriver.user_id,
      internal_dispatcher_id: selectedDispatcher?.user_id || null,
      broker_id: values.broker_id,
      total_amount: values.total_amount,
      commodity: values.commodity,
      weight_lbs: values.weight_lbs,
      notes: '',
      // Incluir datos de paradas para crear las paradas automáticamente
      pickup_address: pickupStop?.address,
      pickup_city: pickupStop?.city,
      pickup_state: pickupStop?.state,
      pickup_zip: pickupStop?.zip_code,
      pickup_company: pickupStop?.company_name,
      delivery_address: deliveryStop?.address,
      delivery_city: deliveryStop?.city,
      delivery_state: deliveryStop?.state,
      delivery_zip: deliveryStop?.zip_code,
      delivery_company: deliveryStop?.company_name,
      // Enviar todas las paradas para crearlas
      stops: loadStops
    }, {
      onSuccess: () => {
        // Limpiar el borrador al crear exitosamente
        clearDraft();
        form.reset();
        setCurrentPhase(1);
        setSelectedBroker(null);
        setSelectedDriver(null);
        setLoadStops([]);
        setLoadDocuments([]);
        atmInput.setValue(0);
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Carga</DialogTitle>
          <DialogDescription>
            Crea una nueva carga siguiendo el proceso paso a paso
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
                            <BrokerCombobox
                              brokers={brokers}
                              loading={brokersLoading}
                              value={field.value}
                               onValueChange={(value) => {
                                 field.onChange(value);
                                 const broker = brokers.find(b => b.id === value);
                                 setSelectedBroker(broker || null);
                               }}
                              onCreateNew={() => setShowCreateBroker(true)}
                              onBrokerSelect={setSelectedBroker}
                              placeholder="Buscar broker por nombre, DOT, MC..."
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                     />

                    {/* Broker Contact Selection */}
                    <FormField
                      control={form.control}
                      name="broker_contact_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contacto del Cliente</FormLabel>
                          <FormControl>
                            <BrokerContactCombobox
                              dispatchers={selectedBroker?.dispatchers || []}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Seleccionar contacto del cliente..."
                              className="w-full"
                              disabled={!selectedBroker}
                              onCreateNew={() => setShowCreateDispatcher(true)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Internal Dispatcher Selection */}
                    <FormField
                      control={form.control}
                      name="dispatcher_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dispatcher Interno</FormLabel>
                          <FormControl>
                            <InternalDispatcherCombobox
                              dispatchers={dispatchers}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Seleccionar dispatcher interno..."
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
                              <Input 
                                placeholder="Ej: LD-001, 2024-001, etc." 
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

                    {/* PO Number */}
                    <FormField
                      control={form.control}
                      name="po_number"
                      render={({ field }) => {
                        const textHandlers = createTextHandlers(
                          (value) => field.onChange(value.replace(/\s/g, '')), // Remove all spaces
                          'text'
                        );
                        
                        return (
                          <FormItem>
                            <FormLabel>PO #</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Purchase Order Number" 
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

                    {/* PU Number */}
                    <FormField
                      control={form.control}
                      name="pu_number"
                      render={({ field }) => {
                        const textHandlers = createTextHandlers(
                          (value) => field.onChange(value.replace(/\s/g, '')), // Remove all spaces
                          'text'
                        );
                        
                        return (
                          <FormItem>
                            <FormLabel>PU #</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Pickup Number" 
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

                    {/* Las fechas se calculan automáticamente desde las paradas */}
                    <div className="col-span-2">
                      <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                        <p className="text-sm font-medium text-foreground">📍 Fechas automáticas</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Las fechas de pickup y delivery se calcularán automáticamente basándose en las paradas que definas en la siguiente fase.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 2: Route Details */}
            {currentPhase === 2 && (
              <LoadStopsManager 
                onStopsChange={setLoadStops} 
                showValidation={showStopsValidation}
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
                loadId={null}
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
                  // Si salimos del paso 2, reseteamos las validaciones
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
                      // Si estamos en phase 2, activar validaciones antes de avanzar
                      if (currentPhase === 2) {
                        setShowStopsValidation(true);
                        // Aquí puedes agregar validación de paradas si es necesario
                        // Por ahora permitimos avanzar siempre
                        setCurrentPhase(currentPhase + 1);
                      } else {
                        setCurrentPhase(currentPhase + 1);
                      }
                    }}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button type="submit">
                    Crear Carga
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>

        {/* Create Broker Dialog */}
        <CreateBrokerDialog
          isOpen={showCreateBroker}
          onClose={() => setShowCreateBroker(false)}
          onSuccess={(brokerId) => {
            // Auto-seleccionar el broker recién creado
            form.setValue("broker_id", brokerId);
            const newBroker = brokers.find(b => b.id === brokerId);
            setSelectedBroker(newBroker || null);
          }}
        />

        {/* Create Dispatcher Dialog */}
        <CreateDispatcherDialog
          brokerId={selectedBroker?.id || ""}
          isOpen={showCreateDispatcher}
          onClose={() => setShowCreateDispatcher(false)}
          onSuccess={async (dispatcherId) => {
            try {
              // Refrescar datos de brokers para obtener el nuevo dispatcher
              const result = await refetchBrokers();
              
              // Buscar el broker actualizado con los nuevos dispatchers
              if (result.data) {
                const updatedBroker = result.data.find(b => b.id === selectedBroker?.id);
                
                if (updatedBroker) {
                  setSelectedBroker(updatedBroker);
                }
              }
              
              // Auto-seleccionar el dispatcher recién creado
              form.setValue("dispatcher_id", dispatcherId);
              
              // Confirmación adicional
              toast({
                title: "Dispatcher agregado al formulario",
                description: `El dispatcher ha sido seleccionado automáticamente.`,
              });
              
            } catch (error) {
              console.error('Error refrescando brokers:', error);
              // Aún así intentar preseleccionar el dispatcher
              form.setValue("dispatcher_id", dispatcherId);
            }
          }}
        />
      </DialogContent>

      {/* Confirmación de salida */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desea cancelar la carga?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si sales ahora, se perderá toda la información introducida. 
              ¿Estás seguro de que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmExit}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sí, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}