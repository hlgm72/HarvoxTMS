import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCompanyDrivers, CompanyDriver } from "@/hooks/useCompanyDrivers";
import { useCompanyBrokers, CompanyBroker } from "@/hooks/useCompanyBrokers";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { useATMInput } from "@/hooks/useATMInput";
import { createTextHandlers } from "@/lib/textUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BrokerCombobox } from "@/components/brokers/BrokerCombobox";
import { DispatcherCombobox } from "@/components/brokers/DispatcherCombobox";
import { CreateBrokerDialog } from "@/components/brokers/CreateBrokerDialog";
import { CreateDispatcherDialog } from "@/components/brokers/CreateDispatcherDialog";
import { LoadStopsManager } from "./LoadStopsManager";

const createLoadSchema = z.object({
  // Phase 1: Essential Information
  broker_id: z.string().min(1, "Selecciona un broker"),
  dispatcher_id: z.string().optional(),
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

export function CreateLoadDialog({ isOpen, onClose }: CreateLoadDialogProps) {
  const { t } = useTranslation();
  const [currentPhase, setCurrentPhase] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState<CompanyBroker | null>(null);
  const [showCreateBroker, setShowCreateBroker] = useState(false);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [loadStops, setLoadStops] = useState<any[]>([]);
  const { drivers } = useCompanyDrivers();
  const { brokers, loading: brokersLoading } = useCompanyBrokers();
  const createLoadMutation = useCreateLoad();

  const form = useForm<z.infer<typeof createLoadSchema>>({
    resolver: zodResolver(createLoadSchema),
    defaultValues: {
      broker_id: "",
      dispatcher_id: "",
      total_amount: 0,
      po_number: "",
      pu_number: "",
      commodity: "",
      weight_lbs: undefined,
    },
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      form.setValue("total_amount", value);
    }
  });

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
      title: "Documentos",
      description: "Rate confirmation y otros",
      completed: false
    },
    {
      id: 4,
      title: "Asignación",
      description: "Conductor y activación",
      completed: false
    }
  ];

  const onSubmit = (values: z.infer<typeof createLoadSchema>) => {
    const loadNumber = `LD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    createLoadMutation.mutate({
      load_number: loadNumber,
      driver_user_id: drivers[0]?.user_id || '', // Temporal - luego permitir selección
      broker_id: values.broker_id,
      total_amount: values.total_amount,
      commodity: values.commodity,
      weight_lbs: values.weight_lbs,
      notes: '',
    }, {
      onSuccess: () => {
        form.reset();
        setCurrentPhase(1);
        setSelectedBroker(null);
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                                form.setValue("dispatcher_id", ""); // Reset dispatcher
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

                    {/* Dispatcher Selection */}
                    <FormField
                      control={form.control}
                      name="dispatcher_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dispatcher</FormLabel>
                          <FormControl>
                            <DispatcherCombobox
                              dispatchers={selectedBroker?.dispatchers || []}
                              value={field.value}
                              onValueChange={field.onChange}
                              onCreateNew={() => setShowCreateDispatcher(true)}
                              placeholder="Buscar dispatcher..."
                              disabled={!selectedBroker}
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
              <LoadStopsManager onStopsChange={setLoadStops} />
            )}

            {/* Placeholder for phases 3 and 4 */}
            {currentPhase > 2 && (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">
                      Fase {currentPhase} - {phases[currentPhase - 1].title}
                    </p>
                    <p className="text-sm">Esta funcionalidad será implementada próximamente</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentPhase(Math.max(1, currentPhase - 1))}
                disabled={currentPhase === 1}
              >
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                
                {currentPhase < phases.length ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentPhase(currentPhase + 1)}
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
          onSuccess={(dispatcherId) => {
            // Auto-seleccionar el dispatcher recién creado
            form.setValue("dispatcher_id", dispatcherId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}