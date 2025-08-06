
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCompanyDrivers, CompanyDriver } from "@/hooks/useCompanyDrivers";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
import { useClients, Client, useClientContacts } from "@/hooks/useClients";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useLoadNumberValidation } from "@/hooks/useLoadNumberValidation";
import { usePONumberValidation } from "@/hooks/usePONumberValidation";
import { useLoadData } from "@/hooks/useLoadData";
import { useLoadForm } from "@/hooks/useLoadForm";
import { useATMInput } from "@/hooks/useATMInput";
import { LoadStop } from "@/hooks/useLoadStops";
import { createTextHandlers } from "@/lib/textUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowRight, Loader2, AlertTriangle, Check } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { ContactCombobox } from "@/components/clients/ContactCombobox";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { CreateDispatcherDialog } from "@/components/clients/CreateDispatcherDialog";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { LoadDocumentsProvider } from "@/contexts/LoadDocumentsContext";
import { LoadAssignmentSection } from "./LoadAssignmentSection";
import { supabase } from "@/integrations/supabase/client";

interface CreateLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'duplicate';
  loadData?: any;
}

export function CreateLoadDialog({ isOpen, onClose, mode = 'create', loadData: externalLoadData }: CreateLoadDialogProps) {
  const { t } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [loadStops, setLoadStops] = useState<any[]>(() => {
    // Initialize with default stops for create mode
    if (mode === 'create') {
      return [
        {
          id: 'stop-1',
          stop_number: 1,
          stop_type: 'pickup',
          company_name: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
        },
        {
          id: 'stop-2', 
          stop_number: 2,
          stop_type: 'delivery',
          company_name: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
        }
      ];
    }
    return [];
  });
  const [showStopsValidation, setShowStopsValidation] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<CompanyDriver | null>(null);
  const [loadDocuments, setLoadDocuments] = useState<any[]>([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState<any>(null);

  // Hooks
  const { drivers } = useCompanyDrivers();
  const { data: dispatchers = [] } = useCompanyDispatchers();
  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useClients();
  const { refetch: refetchContacts } = useClientContacts(selectedClient?.id || "");
  const { selectedCompany } = useUserCompanies();
  const createLoadMutation = useCreateLoad();
  const { showSuccess, showError } = useFleetNotifications();
  const [companyData, setCompanyData] = useState<any>(null);

  // For edit mode, fetch full load data. For duplicate mode, also fetch stops separately
  const { loadData: fetchedLoadData, isLoading: loadDataLoading, error: loadDataError } = useLoadData(
    mode === 'edit' ? externalLoadData?.id : undefined
  );
  
  // For duplicate mode, fetch stops separately since they're not included in useLoads
  const { loadData: duplicateLoadData, isLoading: duplicateLoading } = useLoadData(
    mode === 'duplicate' ? externalLoadData?.id : undefined
  );
  
  // Determine the active load data based on mode
  const activeLoadData = useMemo(() => {
    if (mode === 'edit') {
      return fetchedLoadData;
    } else if (mode === 'duplicate' && duplicateLoadData) {
      // For duplicate mode, use fetched data but clear sensitive fields
      console.log('🔄 CreateLoadDialog - Duplicate mode, fetched data with stops:', duplicateLoadData);
      return {
        ...duplicateLoadData,
        load_number: '', // Clear load number
        po_number: '',   // Clear PO number
        id: undefined,   // Clear ID to create new load
      };
    }
    return null;
  }, [mode, fetchedLoadData, duplicateLoadData]);

  // Form hook
  const { form, isFormReady } = useLoadForm(activeLoadData, mode);

  // Load number validation (skip in edit mode initially)
  const currentLoadNumber = form.watch("load_number");
  const loadNumberValidation = useLoadNumberValidation(
    currentLoadNumber,
    mode === 'edit' && !form.formState.dirtyFields.load_number, // Skip validation if in edit mode and field not dirty
    mode === 'edit' ? activeLoadData?.id : undefined
  );

  // PO number validation
  const currentPONumber = form.watch("po_number");
  const poNumberValidation = usePONumberValidation(
    currentPONumber,
    !currentPONumber || currentPONumber.trim() === '', // Skip validation if PO is empty (it's optional)
    mode === 'edit' ? activeLoadData?.id : undefined
  );

  // ATM Input
  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value, { shouldValidate: true });
      // Limpiar error cuando el usuario cambie el monto
      if (form.formState.errors.total_amount) {
        form.clearErrors("total_amount");
      }
    }
  });

  // Fetch company data when selectedCompany changes
  useEffect(() => {
    if (selectedCompany?.id) {
      const fetchCompanyData = async () => {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('name, phone, email')
            .eq('id', selectedCompany.id)
            .single();
          
          if (error) throw error;
          setCompanyData(data);
        } catch (error) {
          console.error('Error fetching company data:', error);
        }
      };
      
      fetchCompanyData();
    }
  }, [selectedCompany?.id]);

  // Initialize form and states when load data is available
  useEffect(() => {
    if ((mode === 'edit' || mode === 'duplicate') && activeLoadData && isFormReady) {
      // console.log(`🔄 CreateLoadDialog - Initializing ${mode} mode with data:`, activeLoadData);
      // console.log('🔄 CreateLoadDialog - Available clients:', clients.length);
      // console.log('🔄 CreateLoadDialog - Available drivers:', drivers.length);

      // Update ATM input
      atmInput.setValue(activeLoadData.total_amount || 0);

      // Find and set client
      if (activeLoadData.client_id && clients.length > 0) {
        // console.log('🔍 CreateLoadDialog - Looking for client:', activeLoadData.client_id);
        const client = clients.find(c => c.id === activeLoadData.client_id);
        if (client) {
          // console.log('✅ CreateLoadDialog - Client found:', client.name);
          setSelectedClient(client);
          form.setValue("client_id", client.id);
          
          // Find and set client contact if available
          if (activeLoadData.client_contact_id) {
            // console.log('🔍 CreateLoadDialog - Looking for contact:', activeLoadData.client_contact_id);
            form.setValue("contact_id", activeLoadData.client_contact_id);
          }
        } else {
          console.warn('⚠️ CreateLoadDialog - Client not found in clients list');
        }
      }

      // Find and set driver (only in edit mode, duplicate should start fresh)
      if (mode === 'edit' && activeLoadData.driver_user_id && drivers.length > 0) {
        console.log('🔍 CreateLoadDialog - Looking for driver:', activeLoadData.driver_user_id);
        const driver = drivers.find(d => d.user_id === activeLoadData.driver_user_id);
        if (driver) {
          console.log('✅ CreateLoadDialog - Driver found:', driver.first_name, driver.last_name);
          setSelectedDriver(driver);
        } else {
          console.warn('⚠️ CreateLoadDialog - Driver not found in drivers list');
        }
      }

      // Find and set dispatcher (only in edit mode, duplicate should start fresh)
      if (mode === 'edit' && activeLoadData.internal_dispatcher_id && dispatchers.length > 0) {
        const dispatcher = dispatchers.find(d => d.user_id === activeLoadData.internal_dispatcher_id);
        if (dispatcher) {
          setSelectedDispatcher(dispatcher);
        }
      }

      // Set stops (for both edit and duplicate modes)
      if (activeLoadData.stops && activeLoadData.stops.length > 0) {
        console.log('📍 CreateLoadDialog - Setting stops from load data:', activeLoadData.stops);
        setLoadStops(activeLoadData.stops);
      } else {
        console.warn('⚠️ CreateLoadDialog - No stops found in load data:', activeLoadData);
      }
    }
  }, [mode, activeLoadData, isFormReady, clients.length, drivers.length, dispatchers.length]);

  // Show loading state for edit or duplicate modes
  if ((mode === 'edit' && loadDataLoading) || (mode === 'duplicate' && duplicateLoading)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">{mode === 'edit' ? 'Cargando datos de la carga...' : 'Cargando datos para duplicar...'}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state (only for edit mode)
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

  // Función auxiliar para validar paradas
  const validateStops = (stops: LoadStop[]) => {
    const errors: string[] = [];

    // Minimum 2 stops
    if (stops.length < 2) {
      errors.push('Debe haber al menos 2 paradas');
      return { isValid: false, errors };
    }

    // First stop must be pickup
    if (stops[0].stop_type !== 'pickup') {
      errors.push('La primera parada debe ser una recogida (pickup)');
    }

    // Last stop must be delivery
    if (stops[stops.length - 1].stop_type !== 'delivery') {
      errors.push('La última parada debe ser una entrega (delivery)');
    }

    // Validate each stop has required fields
    stops.forEach((stop, index) => {
      const stopNumber = index + 1;
      const fieldsErrors: string[] = [];
      
      if (!stop.company_name?.trim()) {
        fieldsErrors.push('Empresa');
      }
      if (!stop.address?.trim()) {
        fieldsErrors.push('Dirección');
      }
      if (!stop.city?.trim()) {
        fieldsErrors.push('Ciudad');
      }
      if (!stop.state?.trim()) {
        fieldsErrors.push('Estado');
      }

      // Validación obligatoria de fecha para todas las paradas
      if (!stop.scheduled_date) {
        fieldsErrors.push('Fecha programada');
      }

      if (fieldsErrors.length > 0) {
        const stopType = stop.stop_type === 'pickup' ? 'P' : 'D';
        errors.push(`${stopType}${stopNumber}: Faltan ${fieldsErrors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Validación del orden cronológico de las fechas
  const validateChronologicalOrder = (stopsToValidate: LoadStop[]) => {
    const errors: string[] = [];
    
    // Filtrar paradas que tienen fechas válidas
    const stopsWithDates = stopsToValidate.filter(stop => 
      stop.scheduled_date && 
      (stop.scheduled_date instanceof Date ? true : !isNaN(Date.parse(stop.scheduled_date)))
    );

    if (stopsWithDates.length < 2) {
      return { isValid: true, errors }; // No hay suficientes fechas para validar orden
    }

    // Verificar orden cronológico
    for (let i = 1; i < stopsWithDates.length; i++) {
      const prevStop = stopsWithDates[i - 1];
      const currentStop = stopsWithDates[i];
      
      const prevDate = prevStop.scheduled_date instanceof Date ? 
        prevStop.scheduled_date : new Date(prevStop.scheduled_date);
      const currentDate = currentStop.scheduled_date instanceof Date ? 
        currentStop.scheduled_date : new Date(currentStop.scheduled_date);
      
      if (currentDate < prevDate) {
        const prevStopNumber = stopsToValidate.findIndex(s => s === prevStop) + 1;
        const currentStopNumber = stopsToValidate.findIndex(s => s === currentStop) + 1;
        errors.push(`Las fechas deben estar en orden cronológico. La parada ${currentStopNumber} tiene una fecha anterior a la parada ${prevStopNumber}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const onSubmit = (values: any) => {
    console.log('🚨 onSubmit called with values:', values);
    console.log('🚨 Current mode:', mode);
    console.log('🚨 Current phase:', currentPhase);
    
    // Limpiar errores previos antes de validar
    form.clearErrors();
    
    // En modo edición, permitir guardar en cualquier fase
    // En modo creación y duplicación, solo permitir en la fase final (duplicate se comporta como create)
    if ((mode === 'create' || mode === 'duplicate') && currentPhase !== 4) {
      console.log('🚨 onSubmit blocked - not in final phase for create mode');
      return;
    }

    // Validar campos requeridos del formulario primero
    console.log('🔍 onSubmit - Validating form values:', values);
    
    // Validar número de carga requerido (Paso 1)
    if (!values.load_number || values.load_number.trim() === '') {
      console.log('🚨 onSubmit blocked - missing load number');
      form.setError("load_number", {
        type: "manual",
        message: "El número de carga es requerido."
      });
      showError("Error de validación", "El número de carga es requerido.");
      setCurrentPhase(1);
      return;
    }

    // Validar que el número no sea duplicado
    if (loadNumberValidation.isDuplicate) {
      console.log('🚨 onSubmit blocked - duplicate load number');
      form.setError("load_number", {
        type: "manual",
        message: "Este número de carga ya existe. Por favor use un número diferente."
      });
      showError("Error de validación", "Este número de carga ya existe. Por favor use un número diferente.");
      setCurrentPhase(1);
      return;
    }

    // Validar PO number si no está vacío (es opcional)
    if (currentPONumber && currentPONumber.trim() !== '' && !poNumberValidation.isValid) {
      console.log('🚨 onSubmit blocked - invalid PO number');
      form.setError("po_number", {
        type: "manual",
        message: poNumberValidation.error || "El número PO no es válido."
      });
      showError("Error de validación", poNumberValidation.error || "El número PO no es válido.");
      setCurrentPhase(1);
      return;
    }

    // Validar cliente requerido (Paso 1)
    if (!values.client_id || values.client_id === '') {
      console.log('🚨 onSubmit blocked - missing client');
      form.setError("client_id", {
        type: "manual",
        message: "Debes seleccionar un cliente."
      });
      showError("Error de validación", "Debes seleccionar un cliente.");
      setCurrentPhase(1);
      return;
    }

    // Validar commodity requerido (Paso 1)
    if (!values.commodity || values.commodity.trim() === '') {
      console.log('🚨 onSubmit blocked - missing commodity');
      form.setError("commodity", {
        type: "manual",
        message: "El commodity es requerido."
      });
      showError("Error de validación", "El commodity es requerido.");
      setCurrentPhase(1);
      return;
    }

    // Validar monto mayor a 0 (Paso 1)
    if (!values.total_amount || values.total_amount <= 0) {
      console.log('🚨 onSubmit blocked - invalid amount');
      form.setError("total_amount", {
        type: "manual",
        message: "El monto total debe ser mayor a 0."
      });
      showError("Error de validación", "El monto total debe ser mayor a 0.");
      setCurrentPhase(1);
      return;
    }

    // Solo validar número duplicado en modo creación y duplicación (duplicate se comporta como create)
    if ((mode === 'create' || mode === 'duplicate') && loadNumberValidation.isDuplicate) {
      console.log('🚨 onSubmit blocked - duplicate load number');
      showError("Error de validación", "No se puede crear la carga con un número duplicado.");
      setCurrentPhase(1); // Ir al paso 1 donde está el campo load_number
      return;
    }

    // Validar paradas (Paso 2)
    if (!loadStops || loadStops.length < 2) {
      console.log('🚨 onSubmit blocked - insufficient stops');
      showError("Error de validación", "Debe haber al menos 2 paradas (pickup y delivery).");
      setCurrentPhase(2);
      return;
    }

    // Validar campos requeridos de paradas (Paso 2)
    const stopsValidation = validateStops(loadStops);
    if (!stopsValidation.isValid) {
      console.log('🚨 onSubmit blocked - invalid stops:', stopsValidation.errors);
      showError("Error en las paradas", stopsValidation.errors[0]);
      setCurrentPhase(2);
      return;
    }

    // Validar orden cronológico de las fechas (Paso 2)
    const chronologicalValidation = validateChronologicalOrder(loadStops);
    if (!chronologicalValidation.isValid) {
      console.log('🚨 onSubmit blocked - chronological order error:', chronologicalValidation.errors);
      showError("Error de fechas", chronologicalValidation.errors[0]);
      setCurrentPhase(2);
      return;
    }

    // Validar conductor (Paso 3) - Ahora es opcional
    // if ((mode === 'create' || mode === 'duplicate') && !selectedDriver) {
    //   console.log('🚨 onSubmit blocked - no driver selected');
    //   toast({
    //     title: "Error",
    //     description: "Debes seleccionar un conductor antes de crear la carga.",
    //     variant: "destructive",
    //   });
    //   setCurrentPhase(3);
    //   return;
    // }

    const loadDataToSubmit = {
      mode,
      id: activeLoadData?.id,
      load_number: values.load_number,
      po_number: values.po_number || null,
      client_id: values.client_id,
      client_contact_id: values.contact_id || null,
      driver_user_id: selectedDriver?.user_id || (mode === 'edit' ? activeLoadData?.driver_user_id : null),
      internal_dispatcher_id: selectedDispatcher?.user_id || null,
      total_amount: parseFloat(values.total_amount) || 0,
      commodity: values.commodity || null,
      weight_lbs: values.weight_lbs,
      notes: values.notes || '',
      stops: loadStops,
      factoring_percentage: values.factoring_percentage,
      dispatching_percentage: values.dispatching_percentage,
      leasing_percentage: values.leasing_percentage,
      temporaryDocuments: (mode === 'create' || mode === 'duplicate') ? loadDocuments : undefined, // Pass temporary documents only for new loads
    };

    console.log('📍 CreateLoadDialog - Current loadStops state:', loadStops);

    console.log('📋 CreateLoadDialog - Submitting load data:', loadDataToSubmit);
    console.log('📋 CreateLoadDialog - Current mutation state:', {
      isIdle: createLoadMutation.isIdle,
      isPending: createLoadMutation.isPending,
      isError: createLoadMutation.isError,
      isSuccess: createLoadMutation.isSuccess,
      error: createLoadMutation.error
    });
    
    createLoadMutation.mutate(loadDataToSubmit, {
      onSuccess: () => {
        console.log('✅ CreateLoadDialog - Load mutation successful');
        console.log(`✅ CreateLoadDialog - Mode: ${mode}, currentPhase: ${currentPhase}`);
        
        // Show success toast based on mode
        const isEdit = mode === 'edit';
        const isDuplicate = mode === 'duplicate';
        
        const loadNumber = form.getValues("load_number");
        const clientName = selectedClient?.name || "Cliente";
        
        showSuccess(
          isEdit 
            ? `Carga ${loadNumber} actualizada` 
            : isDuplicate 
            ? `Carga ${loadNumber} duplicada exitosamente`
            : `🚛 Carga ${loadNumber} creada`,
          isEdit 
            ? `Los cambios en la carga ${loadNumber} han sido guardados correctamente.` 
            : isDuplicate 
            ? `Se ha creado una nueva carga ${loadNumber} basada en la carga original.`
            : `La carga ${loadNumber} para ${clientName} ha sido creada exitosamente y está lista para ser procesada.`
        );
        
        // Close dialog after showing toast
        // In edit mode, don't close dialog when in documents phase (phase 4)
        // User might be generating documents and wants to stay open
        if (mode === 'edit' && currentPhase === 4) {
          console.log('✅ CreateLoadDialog - Staying open in documents phase after successful edit');
        } else {
          console.log('✅ CreateLoadDialog - Closing dialog after successful creation/edit');
          onClose();
        }
      },
      onError: (error) => {
        console.error('❌ CreateLoadDialog - Load mutation failed:', error);
        const loadNumber = form.getValues("load_number");
        const errorTitle = mode === 'edit' 
          ? `Error al actualizar carga ${loadNumber}` 
          : mode === 'duplicate'
          ? `Error al duplicar carga ${loadNumber}`
          : `Error al crear carga ${loadNumber}`;
        
        showError(errorTitle, error.message || "Ha ocurrido un error inesperado. Por favor intenta nuevamente.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {(() => {
              const loadNumber = currentLoadNumber?.trim();
              
              if (mode === 'edit') {
                return loadNumber ? `Editar Carga ${loadNumber}` : 'Editar Carga';
              } else if (mode === 'duplicate') {
                return loadNumber ? `Duplicar Carga ${loadNumber}` : 'Duplicar Carga';
              } else {
                return loadNumber ? `Crear Carga ${loadNumber}` : 'Nueva Carga';
              }
            })()}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crea una nueva carga siguiendo el proceso paso a paso'
              : mode === 'edit'
              ? 'Modifica los datos de la carga existente'
              : 'Crea una nueva carga basada en una carga existente'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        {/* Mobile compact step indicator */}
        <div className="sm:hidden mb-4 px-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="whitespace-nowrap">Paso {currentPhase} de {phases.length}</span>
              <span className="text-xs text-muted-foreground truncate">
                ({phases.find((p) => p.id === currentPhase)?.title} – {phases.find((p) => p.id === currentPhase)?.description})
              </span>
            </div>
            <div className="flex items-center gap-1">
              {phases.map((p) => (
                <span
                  key={p.id}
                  className={`h-2 w-2 rounded-full ${currentPhase === p.id ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop steps */}
        <div className="hidden sm:flex items-center justify-between mb-6 px-4 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentPhase(phase.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 hover:scale-105 ${
                      currentPhase === phase.id 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : phase.completed
                        ? 'border-green-500 bg-green-500 text-white hover:border-green-600 hover:bg-green-600'
                        : 'border-muted bg-background text-muted-foreground hover:border-primary hover:text-primary'
                    }`}
                    title={`Ir al ${phase.title}`}
                  >
                    {phase.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{phase.id}</span>
                    )}
                  </button>
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Load Number */}
                    <FormField
                      control={form.control}
                      name="load_number"
                      render={({ field }) => {
                        const textHandlers = createTextHandlers(
                          (value) => {
                            field.onChange(value);
                            // Limpiar error cuando el usuario comience a escribir
                            if (form.formState.errors.load_number) {
                              form.clearErrors("load_number");
                            }
                          },
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

                     {/* PO Number */}
                     <FormField
                       control={form.control}
                       name="po_number"
                       render={({ field }) => {
                         const textHandlers = createTextHandlers(
                           (value) => field.onChange(value),
                           'text'
                         );
                         
                         return (
                           <FormItem>
                             <FormLabel>PO# (Purchase Order)</FormLabel>
                             <FormControl>
                               <div className="relative">
                                 <Input 
                                   placeholder="Ej: PO-12345, PO-2024-001" 
                                   value={field.value || ''}
                                   onChange={textHandlers.onChange}
                                   onBlur={textHandlers.onBlur}
                                   className={
                                     !poNumberValidation.isValid 
                                       ? "border-destructive focus:border-destructive" 
                                       : poNumberValidation.isValid && currentPONumber && currentPONumber.trim() !== ''
                                       ? "border-green-500 focus:border-green-500" 
                                       : ""
                                   }
                                 />
                                 <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                   {poNumberValidation.isLoading && (
                                     <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                   )}
                                   {!poNumberValidation.isLoading && !poNumberValidation.isValid && poNumberValidation.error && (
                                     <AlertTriangle className="h-4 w-4 text-destructive" />
                                   )}
                                   {!poNumberValidation.isLoading && poNumberValidation.isValid && currentPONumber && currentPONumber.trim() !== '' && (
                                     <Check className="h-4 w-4 text-green-500" />
                                   )}
                                 </div>
                               </div>
                             </FormControl>
                             <FormMessage />
                             {!poNumberValidation.isValid && poNumberValidation.error && (
                               <p className="text-sm text-destructive mt-1">
                                 {poNumberValidation.error}
                               </p>
                             )}
                           </FormItem>
                         );
                       }}
                     />

                      {/* Client Selection */}
                      <FormField
                        control={form.control}
                        name="client_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente *</FormLabel>
                            <FormControl>
                                <ClientCombobox
                                  clients={clients}
                                  value={field.value}
                                   onValueChange={(value) => {
                                     field.onChange(value);
                                     const client = clients.find(c => c.id === value);
                                     setSelectedClient(client || null);
                                     form.setValue("contact_id", "");
                                     // Limpiar error cuando el usuario seleccione un cliente
                                     if (form.formState.errors.client_id) {
                                       form.clearErrors("client_id");
                                     }
                                   }}
                                  onClientSelect={(client) => setSelectedClient(client as Client)}
                                  placeholder="Buscar cliente por nombre, DOT, MC..."
                                  className="w-full"
                                  onCreateNew={() => setShowCreateClient(true)}
                                />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Contact Selection */}
                      <FormField
                        control={form.control}
                        name="contact_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contacto del Cliente</FormLabel>
                            <FormControl>
                                <ContactCombobox
                                  clientId={selectedClient?.id}
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  placeholder="Buscar contacto..."
                                  disabled={!selectedClient}
                                  className="w-full"
                                  onCreateNew={selectedClient ? () => setShowCreateDispatcher(true) : undefined}
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
                            (value) => {
                              field.onChange(value);
                              // Limpiar error cuando el usuario comience a escribir
                              if (form.formState.errors.commodity) {
                                form.clearErrors("commodity");
                              }
                            },
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
                                placeholder="Ej: 25000"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     {/* Total Amount - moved after weight */}
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
                                className="text-right"
                                autoComplete="off"
                               readOnly
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
                onStopsChange={(newStops) => {
                  // console.log('📍 CreateLoadDialog - Stops changed:', newStops);
                  setLoadStops(newStops);
                }} 
                showValidation={true}
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
                leasingPercentage={form.watch("leasing_percentage")}
                factoringPercentage={form.watch("factoring_percentage")}
                dispatchingPercentage={form.watch("dispatching_percentage")}
                onLeasingPercentageChange={(value) => form.setValue("leasing_percentage", value)}
                onFactoringPercentageChange={(value) => form.setValue("factoring_percentage", value)}
                onDispatchingPercentageChange={(value) => form.setValue("dispatching_percentage", value)}
              />
            )}

            {/* Phase 4: Documents */}
            {currentPhase === 4 && (
              <LoadDocumentsProvider>
                <LoadDocumentsSection
                  loadId={mode === 'edit' ? activeLoadData?.id : null}
                  loadData={{
                    load_number: form.getValues("load_number") || '',
                    total_amount: form.getValues("total_amount") || 0,
                    commodity: form.getValues("commodity") || '',
                    weight_lbs: form.getValues("weight_lbs"),
                    client_name: selectedClient?.name,
                    driver_name: selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : undefined,
                    loadStops: loadStops,
                    company_name: companyData?.name,
                    company_phone: companyData?.phone,
                    company_email: companyData?.email
                  }}
                  onDocumentsChange={setLoadDocuments}
                  temporaryDocuments={loadDocuments}
                  onTemporaryDocumentsChange={setLoadDocuments}
                />
              </LoadDocumentsProvider>
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
                 ) : (mode === 'create' || mode === 'duplicate') ? (
                   <Button 
                     type="button"
                     onClick={() => {
                       console.log('🚨 Crear Carga button clicked');
                       const values = form.getValues();
                       console.log('🚨 Form values:', values);
                       
                       // Ejecutar nuestras validaciones personalizadas directamente
                       onSubmit(values);
                     }}
                     disabled={createLoadMutation.isPending}
                   >
                     {createLoadMutation.isPending ? (
                       <Loader2 className="h-4 w-4 animate-spin mr-2" />
                     ) : null}
                     Crear Carga
                   </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => {
                      const values = form.getValues();
                      onSubmit(values);
                    }}
                    disabled={createLoadMutation.isPending}
                  >
                    {createLoadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Guardar Cambios
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>

         {/* Create Client Dialog */}
         <CreateClientDialog
           isOpen={showCreateClient}
           onClose={() => setShowCreateClient(false)}
            onSuccess={(clientId) => {
              // Refresh clients list and select the new client
              refetchClients().then(() => {
                form.setValue("client_id", clientId);
                const newClient = clients.find(c => c.id === clientId);
                setSelectedClient(newClient || null);
                // Also refresh contacts for the new client
                refetchContacts();
              });
            }}
         />

         {/* Create Contact Dialog */}
         <CreateDispatcherDialog
           clientId={selectedClient?.id || ""}
           open={showCreateDispatcher}
           onOpenChange={setShowCreateDispatcher}
         />
      </DialogContent>
    </Dialog>
  );
}
