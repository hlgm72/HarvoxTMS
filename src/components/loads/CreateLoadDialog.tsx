
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
import { useLoadForm, LoadFormData } from "@/hooks/useLoadForm";
import { useATMInput } from "@/hooks/useATMInput";
import { useCommodityAutocomplete } from "@/hooks/useCommodityAutocomplete";
import { useFinancialDataValidation } from "@/hooks/useFinancialDataValidation"; // ⭐ NUEVO
import { LoadStop } from "@/hooks/useLoadStops";
import { createTextHandlers } from "@/lib/textUtils";
import { shouldDisableFinancialOperation, getFinancialOperationTooltip } from "@/lib/financialIntegrityUtils"; // ⭐ NUEVO
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowRight, Loader2, AlertTriangle, Check, ClipboardList, MapPin, UserCheck, Upload } from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { ContactCombobox } from "@/components/clients/ContactCombobox";
import { CreateClientDialog } from "@/components/clients/CreateClientDialog";
import { CreateDispatcherDialog } from "@/components/clients/CreateDispatcherDialog";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";
import { LoadStopsManager } from "./LoadStopsManager";
import { LoadDocumentsSection } from "./LoadDocumentsSection";
import { LoadDocumentsProvider } from "@/contexts/LoadDocumentsContext";
import { LoadAssignmentSection } from "./LoadAssignmentSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreateLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'duplicate';
  loadData?: any;
}

  
export function CreateLoadDialog({ isOpen, onClose, mode = 'create', loadData: externalLoadData }: CreateLoadDialogProps) {
  const { t, i18n } = useTranslation();
  const { userRole } = useAuth();
  
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
  const [percentagesInitialized, setPercentagesInitialized] = useState<string | null>(null);

  // Hooks
  const { drivers } = useCompanyDrivers();
  const { data: dispatchers = [] } = useCompanyDispatchers();
  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useClients();
  const { data: clientContacts = [], refetch: refetchContacts } = useClientContacts(selectedClient?.id || "");
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
        payment_period_id: undefined, // Clear payment period to avoid inheriting paid period restrictions
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

  // ⭐ VALIDACIÓN DE PROTECCIÓN FINANCIERA POR CONDUCTOR
  const currentDriverId = useMemo(() => 
    activeLoadData?.driver_user_id || selectedDriver?.user_id, 
    [activeLoadData?.driver_user_id, selectedDriver?.user_id]
  );
  const currentPeriodId = useMemo(() => 
    activeLoadData?.payment_period_id, 
    [activeLoadData?.payment_period_id]
  );
  
  const { 
    data: financialValidation, 
    isLoading: isValidationLoading 
  } = useFinancialDataValidation(
    currentPeriodId, 
    currentDriverId
  );

  // Verificar si el conductor está pagado y la operación debe estar bloqueada
  const isDriverPaid = useMemo(() => 
    financialValidation?.driver_is_paid === true, 
    [financialValidation?.driver_is_paid]
  );
  const canModify = useMemo(() => 
    !shouldDisableFinancialOperation(financialValidation, isValidationLoading), 
    [financialValidation, isValidationLoading]
  );
  const protectionTooltip = useMemo(() => 
    getFinancialOperationTooltip(financialValidation, 'editar esta carga'), 
    [financialValidation]
  );

  // Fetch company data when selectedCompany changes
  useEffect(() => {
    if (selectedCompany?.id) {
      const fetchCompanyData = async () => {
        try {
          const { data, error } = await supabase
            .rpc('get_companies_basic_info', {
              target_company_id: selectedCompany.id
            })
            .then(result => ({
              data: result.data?.[0] || null,
              error: result.error
            }));
          
          if (error) throw error;
          setCompanyData(data);
        } catch (error) {
          console.error('Error fetching company data:', error);
        }
      };
      
      fetchCompanyData();
    }
  }, [selectedCompany?.id]);

  // Auto-select contact if client has only one contact
  useEffect(() => {
    if (selectedClient && clientContacts && clientContacts.length === 1) {
      const singleContact = clientContacts[0];
      const currentContactId = form.getValues("contact_id");
      
      // Only auto-select if no contact is currently selected
      if (!currentContactId) {
        console.log('🔄 Auto-selecting single contact:', singleContact.name);
        form.setValue("contact_id", singleContact.id);
      }
    }
  }, [selectedClient, clientContacts, form, showSuccess]);

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
        // console.log('🔍 CreateLoadDialog - Looking for driver:', activeLoadData.driver_user_id);
        const driver = drivers.find(d => d.user_id === activeLoadData.driver_user_id);
        if (driver) {
          // console.log('✅ CreateLoadDialog - Driver found:', driver.first_name, driver.last_name);
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

      // Reset percentages initialization when loading new data, except in edit mode
      // In edit mode, we want to preserve the existing percentages from the load
      if (mode !== 'edit') {
        setPercentagesInitialized(null);
      } else {
        // In edit mode, mark percentages as initialized to prevent override
        setPercentagesInitialized(activeLoadData.driver_user_id || 'edit-mode');
      }

      // Set stops (for both edit and duplicate modes)
      if (activeLoadData.stops && activeLoadData.stops.length > 0) {
        setLoadStops(activeLoadData.stops);
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
            <span className="ml-2">{mode === 'edit' ? t("loads:create_wizard.loading.load_data") : t("loads:create_wizard.loading.duplicate_data")}</span>
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
            <h3 className="text-lg font-semibold mb-2">{t("loads:create_wizard.error.loading_data")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{loadDataError}</p>
            <Button onClick={onClose}>{t("loads:create_wizard.error.close")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const phases = [
    { id: 1, title: t("loads:create_wizard.phases.essential_info.title"), description: t("loads:create_wizard.phases.essential_info.description"), completed: false, icon: ClipboardList },
    { id: 2, title: t("loads:create_wizard.phases.route_details.title"), description: t("loads:create_wizard.phases.route_details.description"), completed: false, icon: MapPin },
    { id: 3, title: t("loads:create_wizard.phases.assignment.title"), description: t("loads:create_wizard.phases.assignment.description"), completed: false, icon: UserCheck },
    { id: 4, title: t("loads:create_wizard.phases.documents.title"), description: t("loads:create_wizard.phases.documents.description"), completed: false, icon: Upload }
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
      errors.push(t("loads:create_wizard.validation.stops_minimum"));
      return { isValid: false, errors };
    }

    // First stop must be pickup
    if (stops[0].stop_type !== 'pickup') {
      errors.push(t("loads:create_wizard.validation.stops_first_pickup"));
    }

    // Last stop must be delivery
    if (stops[stops.length - 1].stop_type !== 'delivery') {
      errors.push(t("loads:create_wizard.validation.stops_last_delivery"));
    }

    // Solo validar fechas como campos requeridos - los campos de dirección son opcionales
    stops.forEach((stop, index) => {
      const stopNumber = index + 1;
      
      // Validación obligatoria de fecha para todas las paradas
      if (!stop.scheduled_date) {
        errors.push(t("loads:create_wizard.validation.stop_missing_date", { 
          number: stopNumber
        }));
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
        errors.push(t("loads:create_wizard.validation.chronological_error", {
          current: currentStopNumber,
          previous: prevStopNumber
        }));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const onSubmit = async (values: LoadFormData) => {
    console.log('🚨🚨🚨 onSubmit STARTED!!! Mode:', mode);
    console.log('🚨🚨🚨 CLIENT_ID VALUE:', values.client_id);
    console.log('🚨🚨🚨 CONTACT_ID VALUE:', values.contact_id);
    console.log('🚨🚨🚨 SELECTED CLIENT:', selectedClient?.name);
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
        message: t("loads:create_wizard.validation.load_number_required")
      });
      showError(t("loads:create_wizard.validation.validation_error"), t("loads:create_wizard.validation.load_number_required"));
      setCurrentPhase(1);
      return;
    }

    // Validar que el número no sea duplicado
    if (loadNumberValidation.isDuplicate) {
      console.log('🚨 onSubmit blocked - duplicate load number');
      form.setError("load_number", {
        type: "manual",
        message: t("loads:create_wizard.form.load_number_duplicate")
      });
      showError(t("loads:create_wizard.validation.validation_error"), t("loads:create_wizard.form.load_number_duplicate"));
      setCurrentPhase(1);
      return;
    }

    // Validar PO number si no está vacío (es opcional)
    if (currentPONumber && currentPONumber.trim() !== '' && !poNumberValidation.isValid) {
      console.log('🚨 onSubmit blocked - invalid PO number');
      form.setError("po_number", {
        type: "manual",
        message: poNumberValidation.error || t("loads:create_wizard.validation.validation_error")
      });
      showError(t("loads:create_wizard.validation.validation_error"), poNumberValidation.error || t("loads:create_wizard.validation.validation_error"));
      setCurrentPhase(1);
      return;
    }

    // Cliente es opcional - no requiere validación

    // Commodity es opcional - no requiere validación

    // Validar monto mayor a 0 (Paso 1)
    if (!values.total_amount || values.total_amount <= 0) {
      console.log('🚨 onSubmit blocked - invalid amount');
      form.setError("total_amount", {
        type: "manual",
        message: t("loads:create_wizard.validation.amount_required")
      });
      showError(t("loads:create_wizard.validation.validation_error"), t("loads:create_wizard.validation.amount_required"));
      setCurrentPhase(1);
      return;
    }

    // Solo validar número duplicado en modo creación y duplicación (duplicate se comporta como create)
    if ((mode === 'create' || mode === 'duplicate') && loadNumberValidation.isDuplicate) {
      console.log('🚨 onSubmit blocked - duplicate load number');
      showError(t("loads:create_wizard.validation.validation_error"), t("loads:create_wizard.validation.load_number_duplicate_error"));
      setCurrentPhase(1); // Ir al paso 1 donde está el campo load_number
      return;
    }

    // Validar paradas (Paso 2)
    if (!loadStops || loadStops.length < 2) {
      console.log('🚨 onSubmit blocked - insufficient stops');
      showError(t("loads:create_wizard.validation.validation_error"), t("loads:create_wizard.validation.stops_minimum"));
      setCurrentPhase(2);
      return;
    }

    // Validar campos requeridos de paradas (Paso 2)
    const stopsValidation = validateStops(loadStops);
    if (!stopsValidation.isValid) {
      console.log('🚨 onSubmit blocked - invalid stops:', stopsValidation.errors);
      showError(t("loads:create_wizard.validation.stops_error"), stopsValidation.errors[0]);
      setCurrentPhase(2);
      return;
    }

    // Validar orden cronológico de las fechas (Paso 2)
    const chronologicalValidation = validateChronologicalOrder(loadStops);
    if (!chronologicalValidation.isValid) {
      console.log('🚨 onSubmit blocked - chronological order error:', chronologicalValidation.errors);
      showError(t("loads:create_wizard.validation.dates_error"), chronologicalValidation.errors[0]);
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

    console.log('🔍 Form values before submission:', values);
    console.log('🔍 Weight value specifically:', values.weight_lbs);
    console.log('🔍 Contact ID from form:', values.contact_id);
    console.log('🔍 Selected contact from form:', values.contact_id ? 'YES' : 'NO');
    console.log('🔍 CLIENT ID from form:', values.client_id);
    console.log('🔍 Selected client from form:', values.client_id ? 'YES' : 'NO');
    console.log('🔍 Selected client state:', selectedClient?.name);
    console.log('🔍 Form values RAW:', JSON.stringify(values, null, 2));
    
    const loadDataToSubmit = {
      mode,
      id: activeLoadData?.id,
      load_number: values.load_number,
      po_number: values.po_number || null,
      client_id: values.client_id && values.client_id.trim() !== '' ? values.client_id : null,
      client_contact_id: values.contact_id && values.contact_id.trim() !== '' ? values.contact_id : null,
      driver_user_id: selectedDriver?.user_id || (mode === 'edit' ? activeLoadData?.driver_user_id : null),
      internal_dispatcher_id: selectedDispatcher?.user_id || null,
      total_amount: values.total_amount || 0,
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
    console.log('🚨 CreateLoadDialog - Dispatcher ID being sent:', loadDataToSubmit.internal_dispatcher_id);
    console.log('🔍 CreateLoadDialog - Selected dispatcher user_id:', selectedDispatcher?.user_id);
    console.log('🔍 CreateLoadDialog - Full selected dispatcher:', selectedDispatcher);
    console.log('🔍 CreateLoadDialog - Full load data to submit:', JSON.stringify(loadDataToSubmit, null, 2));
    console.log('🔍 CreateLoadDialog - Selected dispatcher object:', selectedDispatcher);
    console.log('🔍 CreateLoadDialog - Selected dispatcher user_id:', selectedDispatcher?.user_id);
    console.log('🔍 CreateLoadDialog - Raw form values:', values);
    console.log('📋 CreateLoadDialog - Current mutation state:', {
      isIdle: createLoadMutation.isIdle,
      isPending: createLoadMutation.isPending,
      isError: createLoadMutation.isError,
      isSuccess: createLoadMutation.isSuccess,
      error: createLoadMutation.error
    });
    
    createLoadMutation.mutate(loadDataToSubmit, {
      onSuccess: () => {
        // console.log('✅ CreateLoadDialog - Load mutation successful');
        // console.log(`✅ CreateLoadDialog - Mode: ${mode}, currentPhase: ${currentPhase}`);
        
        // Show success toast based on mode
        const isEdit = mode === 'edit';
        const isDuplicate = mode === 'duplicate';
        
        const loadNumber = form.getValues("load_number");
        const clientName = selectedClient?.name || "Cliente";
        
        showSuccess(
          isEdit 
            ? t("loads:messages.success.updated_title", { number: loadNumber })
            : isDuplicate 
            ? t("loads:messages.success.created_title", { number: loadNumber })
            : t("loads:messages.success.created_title", { number: loadNumber }),
          isEdit 
            ? t("loads:messages.success.updated_message", { number: loadNumber })
            : isDuplicate 
            ? t("loads:messages.success.duplicated_message", { number: loadNumber })
            : t("loads:messages.success.created_message", { number: loadNumber, client: clientName })
        );
        
        // Close dialog after showing toast
        // SIEMPRE cerrar el modal después de guardar exitosamente
        console.log('✅ CreateLoadDialog - Closing dialog after successful save');
        onClose();
      },
      onError: (error) => {
        console.error('❌ CreateLoadDialog - Load mutation failed:', error);
        console.error('❌ CreateLoadDialog - Error details:', JSON.stringify(error, null, 2));
        console.error('❌ CreateLoadDialog - Error message:', error?.message);
        console.error('❌ CreateLoadDialog - Error stack:', error?.stack);
        console.error('❌ CreateLoadDialog - Full error object:', error);
        
        const loadNumber = form.getValues("load_number");
        const errorTitle = mode === 'edit' 
          ? t("loads:messages.error.update_title", { number: loadNumber })
          : mode === 'duplicate'
          ? t("loads:messages.error.duplicate_title", { number: loadNumber })
          : t("loads:messages.error.create_title", { number: loadNumber });
        
        console.log('🔍 CreateLoadDialog - About to show error toast:', errorTitle, error.message);
        showError(errorTitle, error.message || t("loads:messages.error.general_message"));
      }
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-full sm:max-w-6xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const loadNumber = currentLoadNumber?.trim();
                
                if (mode === 'edit') {
                  return loadNumber ? t("loads:create_wizard.title.edit_with_number", { number: loadNumber }) : t("loads:create");
                } else if (mode === 'duplicate') {
                  return loadNumber ? t("loads:create_wizard.title.duplicate_with_number", { number: loadNumber }) : t("loads:create.duplicate");
                } else {
                  return loadNumber ? t("loads:create_wizard.title.create_with_number", { number: loadNumber }) : t("loads:create_wizard.title.new_load");
                }
              })()}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? t("loads:create_wizard.description.create")
                : mode === 'edit'
                ? t("loads:create_wizard.description.edit")
                : t("loads:create_wizard.description.duplicate")
              }
            </DialogDescription>
            
            {/* ⭐ ADVERTENCIA DE CONDUCTOR PAGADO */}
            {isDriverPaid && mode === 'edit' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <h4 className="font-semibold">Conductor Ya Pagado</h4>
                    <p className="text-sm mt-1">
                      Este conductor ya ha sido marcado como pagado para el período de pago correspondiente. 
                      No se pueden realizar modificaciones a esta carga para preservar la integridad financiera.
                    </p>
                    {financialValidation?.warning_message && (
                      <p className="text-sm mt-2 font-medium">
                        {financialValidation.warning_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="flex h-[calc(90vh-12rem)]">
          {/* Vertical Steps Sidebar */}
          <div className="hidden md:flex flex-col w-64 border-r bg-muted/20 p-6">
            <div className="space-y-2 flex-1">
              {phases.map((phase, index) => {
                const PhaseIcon = phase.icon;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setCurrentPhase(phase.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                      currentPhase === phase.id 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentPhase === phase.id 
                        ? 'border-primary-foreground bg-primary-foreground text-primary' 
                        : phase.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-muted-foreground bg-background'
                    }`}>
                      {phase.completed ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <PhaseIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${currentPhase === phase.id ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {phase.title}
                      </p>
                      <p className={`text-xs mt-1 ${currentPhase === phase.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {phase.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Step Counter */}
            <div className="mt-6 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("loads:create_wizard.progress.step_x_of_y", { x: currentPhase, y: phases.length })}
                </p>
                <div className="flex justify-center gap-1.5 mt-2">
                  {phases.map((p) => (
                    <div
                      key={p.id}
                      className={`h-1.5 rounded-full transition-all ${
                        p.id === currentPhase 
                          ? 'w-8 bg-primary' 
                          : p.id < currentPhase 
                          ? 'w-4 bg-green-500'
                          : 'w-4 bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile compact step indicator */}
          <div className="md:hidden w-full px-6 py-4 border-b bg-muted/20">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("loads:create_wizard.progress.step_x_of_y", { x: currentPhase, y: phases.length })}</span>
              <div className="flex items-center gap-2">
                {phases.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentPhase(p.id)}
                    className={`h-2 w-8 rounded-full transition-all ${
                      currentPhase === p.id ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{phases[currentPhase - 1].title}</p>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Phase 1: Essential Information */}
            {currentPhase === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    {t("loads:create_wizard.phases.essential_info.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("loads:create_wizard.phases.essential_info.card_description")}
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
                              <FormLabel>{t("loads:create_wizard.form.load_number")} {t("loads:create_wizard.form.load_number_required")}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    placeholder={t("loads:create_wizard.form.load_number_placeholder")}
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
                                 {t("loads:create_wizard.form.load_number_duplicate")}
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
                              <FormLabel>{t("loads:create_wizard.form.po_number")}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    placeholder={t("loads:create_wizard.form.po_number_placeholder")}
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

                      {/* Commodity */}
                      <FormField
                        control={form.control}
                        name="commodity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("loads:create_wizard.form.commodity")}</FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                value={field.value || ''}
                                onChange={(value) => {
                                  field.onChange(value);
                                  if (form.formState.errors.commodity) {
                                    form.clearErrors("commodity");
                                  }
                                }}
                                onBlur={field.onBlur}
                                placeholder={t("loads:create_wizard.form.commodity_placeholder")}
                                searchHook={useCommodityAutocomplete}
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
                       render={({ field }) => {
                          const formatWeight = (value) => {
                            if (!value) return '';
                            return new Intl.NumberFormat(i18n.language === 'es' ? 'es-US' : 'en-US').format(value);
                          };

                         const parseWeight = (value) => {
                           if (!value) return undefined;
                           // Remove commas and parse
                           const parsed = parseInt(value.replace(/,/g, ''));
                           return isNaN(parsed) ? undefined : parsed;
                         };

                         return (
                            <FormItem>
                              <FormLabel>{t("loads:create_wizard.form.weight")}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="text"
                                  placeholder={t("loads:create_wizard.form.weight_placeholder")}
                                  value={formatWeight(field.value)}
                                  onChange={(e) => {
                                    console.log('🔍 Weight input onChange:', e.target.value);
                                    const parsed = parseWeight(e.target.value);
                                    console.log('🔍 Weight parsed value:', parsed);
                                    field.onChange(parsed);
                                    console.log('🔍 Weight field value after onChange:', field.value);
                                  }}
                                  onBlur={(e) => {
                                    console.log('🔍 Weight input onBlur:', e.target.value);
                                    // Re-format on blur to ensure consistent formatting
                                    const parsed = parseWeight(e.target.value);
                                    console.log('🔍 Weight parsed on blur:', parsed);
                                    if (parsed) {
                                      e.target.value = formatWeight(parsed);
                                      console.log('🔍 Weight formatted on blur:', e.target.value);
                                    }
                                    field.onBlur();
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                         );
                       }}
                     />

                      {/* Total Amount - moved after weight */}
                      <FormField
                        control={form.control}
                        name="total_amount"
                        render={({ field }) => (
                           <FormItem>
                             <FormLabel>{t("loads:create_wizard.form.total_amount")} {t("loads:create_wizard.form.total_amount_required")}</FormLabel>
                             <FormControl>
                                <Input 
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*"
                                  value={atmInput.displayValue}
                                  onChange={(e) => {
                                    // Handle onChange to prevent React warning
                                    // The actual value handling is done by ATM input handlers
                                    field.onChange(e.target.value);
                                  }}
                                  onKeyDown={atmInput.handleKeyDown}
                                  onPaste={atmInput.handlePaste}
                                  onFocus={atmInput.handleFocus}
                                  onClick={atmInput.handleClick}
                                  placeholder={t("loads:create_wizard.form.total_amount_placeholder")}
                                  className="text-right"
                                  autoComplete="off"
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
                percentagesInitialized={percentagesInitialized}
                onPercentagesInitialized={setPercentagesInitialized}
                mode={mode}
                // New props for client fields
                form={form}
                clients={clients}
                selectedClient={selectedClient}
                onClientSelect={setSelectedClient}
                onShowCreateClient={() => setShowCreateClient(true)}
                onShowCreateDispatcher={() => setShowCreateDispatcher(true)}
              />
            )}

            {/* Phase 4: Documents */}
            {currentPhase === 4 && (
              <LoadDocumentsProvider>
                <LoadDocumentsSection
                  loadId={mode === 'edit' ? activeLoadData?.id : null}
                  loadData={{
                    load_number: form.getValues("load_number") || '',
                    total_amount: mode === 'edit' && activeLoadData ? activeLoadData.total_amount : (form.getValues("total_amount") || 0),
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
                  userRole={
                    userRole?.role === 'operations_manager' || userRole?.role === 'dispatcher' 
                      ? 'dispatcher'
                      : userRole?.role === 'driver' 
                        ? 'driver' 
                        : 'owner'
                  }
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
                {t("loads:create_wizard.buttons.previous")}
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t("loads:create_wizard.buttons.cancel")}
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
                    {t("loads:create_wizard.buttons.next")}
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
                     disabled={
                       createLoadMutation.isPending ||
                       !canModify // ⭐ NUEVO: Deshabilitar si conductor pagado
                     }
                     title={protectionTooltip || undefined} // ⭐ NUEVO: Tooltip explicativo
                   >
                     {createLoadMutation.isPending ? (
                       <Loader2 className="h-4 w-4 animate-spin mr-2" />
                     ) : null}
                     {t("loads:create_wizard.buttons.create_load")}
                   </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => {
                      const values = form.getValues();
                      onSubmit(values);
                    }}
                    disabled={
                      createLoadMutation.isPending ||
                      !canModify // ⭐ NUEVO: Deshabilitar si conductor pagado  
                    }
                    title={protectionTooltip || undefined} // ⭐ NUEVO: Tooltip explicativo
                  >
                    {createLoadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t("loads:create_wizard.buttons.save_changes")}
                  </Button>
                )}
              </div>
            </div>
              </form>
            </Form>
          </div>
        </div>

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
