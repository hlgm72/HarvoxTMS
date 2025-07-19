import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, DollarSign, Package, Truck, FileText } from "lucide-react";
import { LoadStopsManager } from "./LoadStopsManager";
import { useUpdateLoad } from "@/hooks/useUpdateLoad";
import { useUpdateLoadStops } from "@/hooks/useUpdateLoadStops";
import { useCompanyBrokers } from "@/hooks/useCompanyBrokers";
import { useCompanyDispatchers } from "@/hooks/useCompanyDispatchers";
import { useATMInput } from "@/hooks/useATMInput";
import { createTextHandlers } from "@/lib/textUtils";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { BrokerCombobox } from "@/components/brokers/BrokerCombobox";
import { InternalDispatcherCombobox } from "@/components/dispatchers/InternalDispatcherCombobox";

const editLoadSchema = z.object({
  load_number: z.string().min(1, "El número de carga es requerido"),
  broker_id: z.string().min(1, "Selecciona un broker"),
  dispatcher_id: z.string().optional(),
  total_amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  commodity: z.string().min(1, "Especifica el commodity"),
  weight_lbs: z.number().optional(),
  notes: z.string().optional(),
});

interface EditLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  load: any; // Load data
}

export function EditLoadDialog({ isOpen, onClose, load }: EditLoadDialogProps) {
  const { t } = useTranslation();
  const [loadStops, setLoadStops] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [selectedDispatcher, setSelectedDispatcher] = useState<any>(null);
  
  const { brokers, loading: brokersLoading } = useCompanyBrokers();
  const { data: dispatchers = [] } = useCompanyDispatchers();
  const updateLoadMutation = useUpdateLoad();
  const updateStopsMutation = useUpdateLoadStops();

  const form = useForm<z.infer<typeof editLoadSchema>>({
    resolver: zodResolver(editLoadSchema),
    defaultValues: {
      load_number: "",
      broker_id: "",
      dispatcher_id: "",
      total_amount: 0,
      commodity: "",
      weight_lbs: 0,
      notes: "",
    },
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value, { shouldValidate: true });
    }
  });

  // Reset state when dialog opens/closes and load data into form
  useEffect(() => {
    if (isOpen && load) {
      // Cargar datos existentes en el formulario
      form.setValue("load_number", load.load_number || "");
      form.setValue("broker_id", load.broker_id || "");
      form.setValue("dispatcher_id", load.internal_dispatcher_id || "");
      form.setValue("total_amount", load.total_amount || 0);
      form.setValue("commodity", load.commodity || "");
      form.setValue("weight_lbs", load.weight_lbs || 0);
      form.setValue("notes", load.notes || "");
      
      // Configurar ATM input
      atmInput.setValue(load.total_amount || 0);
      
      // Encontrar broker y dispatcher
      if (load.broker_id && brokers.length > 0) {
        const broker = brokers.find(b => b.id === load.broker_id);
        setSelectedBroker(broker || null);
      }
      
      if (load.internal_dispatcher_id && dispatchers.length > 0) {
        const dispatcher = dispatchers.find(d => d.user_id === load.internal_dispatcher_id);
        setSelectedDispatcher(dispatcher || null);
      }
      
      setLoadStops([]);
      setActiveTab("details");
    }
  }, [isOpen, load, brokers, dispatchers]);

  const onSubmit = (values: z.infer<typeof editLoadSchema>) => {
    updateLoadMutation.mutate({
      loadId: load.id,
      load_number: values.load_number,
      broker_id: values.broker_id,
      internal_dispatcher_id: values.dispatcher_id,
      total_amount: values.total_amount,
      commodity: values.commodity,
      weight_lbs: values.weight_lbs,
      notes: values.notes,
      stops: activeTab === "stops" ? loadStops : undefined
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const handleSaveStops = async () => {
    if (!load?.id || loadStops.length === 0) {
      toast({
        title: "Error",
        description: "Debes agregar al menos una parada antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStopsMutation.mutateAsync({
        loadId: load.id,
        stops: loadStops
      });
      
      toast({
        title: "Éxito",
        description: "Las paradas de la carga han sido actualizadas correctamente.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating stops:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar las paradas.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    setLoadStops([]);
    setSelectedBroker(null);
    setSelectedDispatcher(null);
    atmInput.setValue(0);
    onClose();
  };

  if (!load) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Editar Carga: {load.load_number}
          </DialogTitle>
        </DialogHeader>

        {/* Load Summary */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Información de la Carga</span>
              <Badge variant="outline">
                {load.status === 'created' ? 'Creada' : 
                 load.status === 'in_transit' ? 'En Tránsito' : 
                 load.status === 'delivered' ? 'Entregada' : 
                 load.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total</p>
                  <p className="font-semibold">{formatCurrency(load.total_amount)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Commodity</p>
                  <p className="font-semibold">{load.commodity || 'No especificado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ruta</p>
                  <p className="font-semibold">{load.pickup_city} → {load.delivery_city}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Edit Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Detalles
                </TabsTrigger>
                <TabsTrigger value="stops" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Paradas y Ruta
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de la Carga</CardTitle>
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
                                onCreateNew={() => {}} // No permitir crear brokers durante edición
                                onBrokerSelect={setSelectedBroker}
                                placeholder="Buscar broker por nombre, DOT, MC..."
                                className="w-full"
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
                                  placeholder="Ej: Auto Parts, Electronics, etc." 
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
                                placeholder="0"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
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
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Notas adicionales..."
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stops" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Gestionar Paradas</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Edita las paradas de recogida y entrega para esta carga. Los cambios se reflejarán en la información de la ruta.
                    </p>
                  </div>
                  
                  <LoadStopsManager 
                    onStopsChange={setLoadStops}
                    showValidation={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestión de Documentos</h3>
                  <p className="text-muted-foreground">
                    La edición de documentos estará disponible próximamente.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          
          {activeTab === "details" && (
            <Button 
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateLoadMutation.isPending}
            >
              {updateLoadMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          )}
          
          {activeTab === "stops" && (
            <Button 
              onClick={handleSaveStops}
              disabled={updateStopsMutation.isPending || loadStops.length === 0}
            >
              {updateStopsMutation.isPending ? "Guardando..." : "Guardar Paradas"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}