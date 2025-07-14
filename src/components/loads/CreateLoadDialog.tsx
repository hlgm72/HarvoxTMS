import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCompanyDrivers, CompanyDriver } from "@/hooks/useCompanyDrivers";
import { useCompanyBrokers } from "@/hooks/useCompanyBrokers";
import { useCreateLoad } from "@/hooks/useCreateLoad";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const createLoadSchema = z.object({
  // Phase 1: Essential Information
  broker_id: z.string().min(1, "Selecciona un broker"),
  dispatcher_id: z.string().optional(),
  total_amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  po_number: z.string().optional(),
  pu_number: z.string().optional(),
  commodity: z.string().min(1, "Especifica el commodity"),
  weight_lbs: z.number().optional(),
  pickup_date: z.string().optional(),
  delivery_date: z.string().optional(),
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
  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const { drivers } = useCompanyDrivers();
  const { brokers } = useCompanyBrokers();
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
      pickup_date: "",
      delivery_date: "",
    },
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
      pickup_date: values.pickup_date,
      delivery_date: values.delivery_date,
      weight_lbs: values.weight_lbs,
      notes: '',
    }, {
      onSuccess: () => {
        form.reset();
        setCurrentPhase(1);
        setSelectedBroker("");
        onClose();
      }
    });
  };

  const selectedBrokerData = brokerOptions.find(b => b.id === selectedBroker);

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
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedBroker(value);
                              form.setValue("dispatcher_id", ""); // Reset dispatcher
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar broker" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brokers.map((broker) => (
                                <SelectItem key={broker.id} value={broker.id}>
                                  {broker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Select 
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedBroker}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar dispatcher" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedBrokerData?.dispatchers.map((dispatcher) => (
                                <SelectItem key={dispatcher.id} value={dispatcher.id}>
                                  {dispatcher.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              type="number" 
                              step="0.01"
                              placeholder="2500.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormLabel>Commodity *</FormLabel>
                          <FormControl>
                            <Input placeholder="Electronics, Food Products, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* PO Number */}
                    <FormField
                      control={form.control}
                      name="po_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PO #</FormLabel>
                          <FormControl>
                            <Input placeholder="Purchase Order Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* PU Number */}
                    <FormField
                      control={form.control}
                      name="pu_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PU #</FormLabel>
                          <FormControl>
                            <Input placeholder="Pickup Number" {...field} />
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

                    {/* Tentative Dates */}
                    <FormField
                      control={form.control}
                      name="pickup_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Pickup (Tentativa)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Delivery (Tentativa)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Placeholder for other phases */}
            {currentPhase > 1 && (
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
      </DialogContent>
    </Dialog>
  );
}