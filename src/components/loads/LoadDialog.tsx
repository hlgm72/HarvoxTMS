import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useUpdateLoad } from "@/hooks/useUpdateLoad";
import { useUpdateLoadStops } from "@/hooks/useUpdateLoadStops";
import { useCompanyBrokers } from "@/hooks/useCompanyBrokers";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
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
import { CheckCircle, Circle, ArrowRight, Edit, Plus, User, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BrokerCombobox } from "@/components/brokers/BrokerCombobox";
import { BrokerContactCombobox } from "@/components/brokers/BrokerContactCombobox";
import { InternalDispatcherCombobox } from "@/components/dispatchers/InternalDispatcherCombobox";
import { CreateBrokerDialog } from "@/components/brokers/CreateBrokerDialog";
import { CreateDispatcherDialog } from "@/components/brokers/CreateDispatcherDialog";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { LoadAssignmentSection } from "./LoadAssignmentSection";
import { Load } from "@/hooks/useLoads";

const loadSchema = z.object({
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
  notes: z.string().optional(),
});

type LoadFormData = z.infer<typeof loadSchema>;

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  load?: Load;
}

export function LoadDialog({ isOpen, onClose, mode, load }: LoadDialogProps) {
  const [currentPhase, setCurrentPhase] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loadStops, setLoadStops] = useState<any[]>([]);
  const [loadDocuments, setLoadDocuments] = useState<any[]>([]);
  const [showCreateBroker, setShowCreateBroker] = useState(false);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  const createLoadMutation = useCreateLoad();
  const updateLoadMutation = useUpdateLoad();
  const updateStopsMutation = useUpdateLoadStops();
  const { brokers, loading: brokersLoading } = useCompanyBrokers();
  const { data: dispatchers = [], isLoading: dispatchersLoading } = useCompanyDispatchers();

  const DRAFT_KEY = mode === 'create' ? 'load-creation-draft' : `load-edit-draft-${load?.id}`;

  const form = useForm<LoadFormData>({
    resolver: zodResolver(loadSchema),
    defaultValues: {
      broker_id: "",
      broker_contact_id: "",
      dispatcher_id: "",
      load_number: "",
      total_amount: 0,
      po_number: "",
      pu_number: "",
      commodity: "",
      weight_lbs: undefined,
      notes: "",
    },
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value, { shouldValidate: true });
    }
  });

  // Initialize form with load data when editing
  useEffect(() => {
    if (mode === 'edit' && load) {
      form.setValue("load_number", load.load_number || "");
      form.setValue("broker_id", load.broker_id || "");
      form.setValue("broker_contact_id", (load as any).broker_contact_id || "");
      form.setValue("dispatcher_id", (load as any).internal_dispatcher_id || "");
      form.setValue("total_amount", Number(load.total_amount) || 0);
      form.setValue("commodity", load.commodity || "");
      form.setValue("weight_lbs", load.weight_lbs || undefined);
      form.setValue("notes", load.notes || "");
      
      atmInput.setValue(Number(load.total_amount) || 0);
      
      // Set selected broker
      if (load.broker_id) {
        const broker = brokers.find(b => b.id === load.broker_id);
        if (broker) {
          setSelectedBroker(broker);
        }
      }
    }
  }, [mode, load, brokers, form, atmInput]);

  // Funciones para persistencia de datos (solo para modo create)
  const saveDraft = () => {
    if (mode === 'edit') return; // No guardar borradores en modo edición
    
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
    if (mode === 'edit') return; // No cargar borradores en modo edición
    
    try {
      const draftStr = localStorage.getItem(DRAFT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        const isRecentDraft = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000; // 24 horas

        if (isRecentDraft && draft.formData) {
          Object.entries(draft.formData).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
              form.setValue(key as keyof LoadFormData, value as any);
            }
          });

          if (draft.currentPhase) setCurrentPhase(draft.currentPhase);
          if (draft.loadStops) setLoadStops(draft.loadStops);
          if (draft.selectedBroker) {
            const broker = brokers.find(b => b.id === draft.selectedBroker.id);
            if (broker) setSelectedBroker(broker);
          }
          if (draft.formData.total_amount) {
            atmInput.setValue(draft.formData.total_amount);
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    if (mode === 'edit') return;
    localStorage.removeItem(DRAFT_KEY);
  };

  // Cargar borrador cuando se abre el diálogo (solo en modo create)
  useEffect(() => {
    if (isOpen && mode === 'create') {
      loadDraft();
    }
  }, [isOpen, mode, brokers]);

  // Guardar borrador cuando cambien los datos (solo en modo create)
  useEffect(() => {
    if (isOpen && mode === 'create') {
      const timeoutId = setTimeout(saveDraft, 1000); // Debounce de 1 segundo
      return () => clearTimeout(timeoutId);
    }
  }, [form.watch(), currentPhase, loadStops, selectedBroker, isOpen, mode]);

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

  const currentPhaseData = phases.find(p => p.id === currentPhase);

  const validateCurrentPhase = () => {
    const values = form.getValues();
    
    switch (currentPhase) {
      case 1:
        return values.broker_id && values.load_number && values.total_amount > 0 && values.commodity;
      case 2:
        return loadStops.length >= 2; // Al menos una parada de pickup y una de delivery
      case 3:
        return selectedDriver;
      case 4:
        return true; // Los documentos son opcionales
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentPhase()) {
      if (currentPhase < 4) {
        setCurrentPhase(currentPhase + 1);
      }
    } else {
      toast({
        title: "Información incompleta",
        description: "Por favor completa todos los campos requeridos antes de continuar.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    if (currentPhase > 1) {
      setCurrentPhase(currentPhase - 1);
    }
  };

  const handleClose = () => {
    const hasUnsavedChanges = mode === 'create' && (
      form.formState.isDirty || 
      loadStops.length > 0 || 
      selectedDriver || 
      loadDocuments.length > 0
    );

    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    form.reset();
    setCurrentPhase(1);
    setSelectedBroker(null);
    setSelectedDriver(null);
    setLoadStops([]);
    setLoadDocuments([]);
    atmInput.setValue(0);
    if (mode === 'create') {
      clearDraft();
    }
  };

  const onSubmit = async (data: LoadFormData) => {
    try {
      if (mode === 'create') {
        await createLoadMutation.mutateAsync({
          ...data,
          internal_dispatcher_id: data.dispatcher_id,
          // Note: stops and documents will be handled separately
        } as any);
        clearDraft();
        toast({
          title: "Carga creada",
          description: "La carga ha sido creada exitosamente.",
        });
      } else if (mode === 'edit' && load) {
        await updateLoadMutation.mutateAsync({
          ...data,
          internal_dispatcher_id: data.dispatcher_id,
        } as any);
        
        if (loadStops.length > 0) {
          await updateStopsMutation.mutateAsync({
            loadId: load.id,
            stops: loadStops,
          });
        }
        
        toast({
          title: "Carga actualizada",
          description: "La carga ha sido actualizada exitosamente.",
        });
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error submitting load:', error);
      toast({
        title: "Error",
        description: mode === 'create' ? "Error al crear la carga" : "Error al actualizar la carga",
        variant: "destructive",
      });
    }
  };

  const loadNumberHandlers = createTextHandlers(
    (value) => form.setValue("load_number", value),
    'text'
  );

  const commodityHandlers = createTextHandlers(
    (value) => form.setValue("commodity", value),
    'text'
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? (
                <>
                  <Plus className="inline-block w-5 h-5 mr-2" />
                  Nueva Carga
                </>
              ) : (
                <>
                  <Edit className="inline-block w-5 h-5 mr-2" />
                  Editar Carga {load?.load_number}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? "Crea una nueva carga siguiendo el proceso paso a paso"
                : "Modifica los datos de la carga siguiendo el proceso paso a paso"
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
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{phase.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center max-w-[120px]">
                    <div className="text-xs font-medium">{phase.title}</div>
                    <div className="text-xs text-muted-foreground">{phase.description}</div>
                  </div>
                </div>
                {index < phases.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-4" />
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
                      <Circle className="w-5 h-5 text-primary" />
                      {currentPhaseData?.title}
                    </CardTitle>
                    <CardDescription>{currentPhaseData?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Load Number */}
                    <FormField
                      control={form.control}
                      name="load_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Carga</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              {...loadNumberHandlers}
                              placeholder="Ej: LOAD-2024-001"
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Broker Selection */}
                    <FormField
                      control={form.control}
                      name="broker_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente/Broker</FormLabel>
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

                    {/* Total Amount */}
                    <FormField
                      control={form.control}
                      name="total_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Total</FormLabel>
                          <FormControl>
                            <Input
                              value={atmInput.displayValue}
                              onKeyDown={atmInput.handleKeyDown}
                              onPaste={atmInput.handlePaste}
                              className="w-full"
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commodity</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              {...commodityHandlers}
                              placeholder="Ej: General Freight"
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Weight */}
                    <FormField
                      control={form.control}
                      name="weight_lbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Peso (lbs) - Opcional</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ej: 40000"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* PO and PU Numbers */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="po_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PO Number - Opcional</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: PO-123456"
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pu_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PU Number - Opcional</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: PU-789012"
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Notes */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas - Opcional</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Notas adicionales sobre la carga..."
                              className="w-full"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Phase 2: Route Details */}
              {currentPhase === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Circle className="w-5 h-5 text-primary" />
                      {currentPhaseData?.title}
                    </CardTitle>
                    <CardDescription>{currentPhaseData?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoadStopsManager
                      onStopsChange={setLoadStops}
                      showValidation={true}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Phase 3: Assignment */}
              {currentPhase === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Circle className="w-5 h-5 text-primary" />
                      {currentPhaseData?.title}
                    </CardTitle>
                    <CardDescription>{currentPhaseData?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Asignación de Conductor</h3>
                      <p className="text-muted-foreground mb-4">
                        Esta funcionalidad estará disponible próximamente
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Phase 4: Documents */}
              {currentPhase === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Circle className="w-5 h-5 text-primary" />
                      {currentPhaseData?.title}
                    </CardTitle>
                    <CardDescription>{currentPhaseData?.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Documentos de la Carga</h3>
                      <p className="text-muted-foreground mb-4">
                        Aquí podrás subir documentos como Rate Confirmation, Load Order, etc.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentPhase === 1}
                >
                  Anterior
                </Button>

                <div className="flex gap-3">
                  {currentPhase < 4 ? (
                    <Button type="button" onClick={handleNext}>
                      Siguiente
                    </Button>
                  ) : (
                    <Button 
                      type="submit"
                      disabled={createLoadMutation.isPending || updateLoadMutation.isPending}
                    >
                      {createLoadMutation.isPending || updateLoadMutation.isPending
                        ? mode === 'create' ? "Creando..." : "Actualizando..."
                        : mode === 'create' ? "Crear Carga" : "Actualizar Carga"
                      }
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Broker Dialog */}
      <CreateBrokerDialog
        isOpen={showCreateBroker}
        onClose={() => setShowCreateBroker(false)}
      />

      {/* Create Dispatcher Dialog */}
      <CreateDispatcherDialog
        isOpen={showCreateDispatcher}
        onClose={() => setShowCreateDispatcher(false)}
        brokerId={selectedBroker?.id}
      />

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Si cierras ahora, se perderán todos los datos ingresados.
              ¿Estás seguro de que quieres cerrar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowCloseConfirmation(false);
              resetForm();
              onClose();
            }}>
              Cerrar sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}