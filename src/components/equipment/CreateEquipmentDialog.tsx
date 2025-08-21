import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useEquipment, type CreateEquipmentData } from "@/hooks/useEquipment";
import { ComboboxField } from "@/components/ui/ComboboxField";
import { getBrandsByEquipmentType } from "@/constants/equipmentBrands";

interface CreateEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEquipmentType?: "truck" | "trailer" | "van" | "car";
}

export function CreateEquipmentDialog({ open, onOpenChange, defaultEquipmentType = "truck" }: CreateEquipmentDialogProps) {
  const { t } = useTranslation(['common', 'equipment']);
  const { createEquipment, isCreating } = useEquipment();
  const [currentEquipmentType, setCurrentEquipmentType] = useState(defaultEquipmentType);

  const equipmentSchema = z.object({
    equipment_number: z.string().min(1, t("equipment.validation.equipmentNumberRequired")),
    equipment_type: z.string().min(1, t("equipment.validation.typeRequired")),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().min(1990, t("equipment.validation.yearMinimum")).max(new Date().getFullYear() + 1, t("equipment.validation.yearMaximum", "El año no puede ser mayor a {{year}}", { year: new Date().getFullYear() + 1 })).optional(),
    vin_number: z.string().optional(),
    license_plate: z.string().optional(),
    license_plate_expiry_date: z.string().optional(),
    registration_expiry_date: z.string().optional(),
    insurance_expiry_date: z.string().optional(),
    annual_inspection_expiry_date: z.string().optional(),
    fuel_type: z.string().optional(),
    status: z.string().optional(),
    current_mileage: z.number().optional(),
    purchase_date: z.string().optional(),
    purchase_price: z.number().optional(),
    notes: z.string().optional(),
  });

  const form = useForm<z.infer<typeof equipmentSchema>>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      equipment_number: "",
      equipment_type: defaultEquipmentType,
      make: "",
      model: "",
      year: undefined,
      vin_number: "",
      license_plate: "",
      license_plate_expiry_date: "",
      registration_expiry_date: "",
      insurance_expiry_date: "",
      annual_inspection_expiry_date: "",
      fuel_type: "diesel",
      status: "active",
      current_mileage: undefined,
      purchase_date: "",
      purchase_price: undefined,
      notes: "",
    },
  });

  // Actualizar el tipo de equipo cuando cambie el prop defaultEquipmentType
  useEffect(() => {
    if (open) {
      setCurrentEquipmentType(defaultEquipmentType);
      form.setValue("equipment_type", defaultEquipmentType);
      // Limpiar la marca cuando se abra con un tipo diferente
      form.setValue("make", "");
    }
  }, [open, defaultEquipmentType, form]);

  // Obtener marcas basadas en el tipo de equipo seleccionado
  const availableBrands = getBrandsByEquipmentType(currentEquipmentType);

  // Escuchar cambios en el tipo de equipo para actualizar las marcas disponibles
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "equipment_type" && value.equipment_type) {
        const equipmentType = value.equipment_type as "truck" | "trailer" | "van" | "car";
        setCurrentEquipmentType(equipmentType);
        // Limpiar la marca seleccionada cuando cambie el tipo
        form.setValue("make", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (data: z.infer<typeof equipmentSchema>) => {
    const equipmentData: CreateEquipmentData = {
      equipment_number: data.equipment_number,
      equipment_type: data.equipment_type,
      make: data.make,
      model: data.model,
      year: data.year,
      vin_number: data.vin_number,
      license_plate: data.license_plate,
      license_plate_expiry_date: data.license_plate_expiry_date,
      registration_expiry_date: data.registration_expiry_date,
      insurance_expiry_date: data.insurance_expiry_date,
      annual_inspection_expiry_date: data.annual_inspection_expiry_date,
      fuel_type: data.fuel_type,
      status: data.status,
      current_mileage: data.current_mileage,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price,
      notes: data.notes,
    };

    createEquipment(equipmentData);
    form.reset();
    setCurrentEquipmentType(defaultEquipmentType);
    onOpenChange(false);
  };

  const equipmentTypes = [
    { value: "truck", label: t("equipment.type.truck", "Camión") },
    { value: "trailer", label: t("equipment.type.trailer", "Remolque") },
    { value: "van", label: t("equipment.type.van", "Camioneta") },
    { value: "car", label: t("equipment.type.car", "Automóvil") },
  ];

  const fuelTypes = [
    { value: "diesel", label: t("equipment.fuel.diesel", "Diésel") },
    { value: "gasoline", label: t("equipment.fuel.gasoline", "Gasolina") },
    { value: "hybrid", label: t("equipment.fuel.hybrid", "Híbrido") },
    { value: "electric", label: t("equipment.fuel.electric", "Eléctrico") },
  ];

  const statusOptions = [
    { value: "active", label: t("equipment.status.active", "Activo") },
    { value: "maintenance", label: t("equipment.status.maintenance", "Mantenimiento") },
    { value: "inactive", label: t("equipment.status.inactive", "Inactivo") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {t("equipment.create.title", "Agregar Nuevo Equipo")}
          </DialogTitle>
          <DialogDescription>
            {t("equipment.create.description", "Complete la información del nuevo equipo para agregarlo a la flota.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">
                  {t("equipment.create.tabs.basic", "Información Básica")}
                </TabsTrigger>
                <TabsTrigger value="documents">
                  {t("equipment.create.tabs.documents", "Documentos")}
                </TabsTrigger>
                <TabsTrigger value="financial">
                  {t("equipment.create.tabs.financial", "Información Financiera")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="equipment_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.equipmentNumber")} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.type")} *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.make")}</FormLabel>
                         <ComboboxField
                          options={availableBrands}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder=""
                          emptyText={t("equipment.actions.noMakesFound")}
                          allowCustom={true}
                          customText={t("equipment.actions.addCustomMake")}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.model")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.year")}</FormLabel>
                         <FormControl>
                           <Input 
                             type="number" 
                             placeholder=""
                             min="1990"
                             max={new Date().getFullYear() + 1}
                             value={field.value || ""}
                             onChange={(e) => {
                               const value = e.target.value;
                               field.onChange(value ? parseInt(value) : undefined);
                             }}
                             onBlur={(e) => {
                               const value = parseInt(e.target.value);
                               if (!isNaN(value) && (value < 1990 || value > new Date().getFullYear() + 1)) {
                                 // Si está fuera del rango, limpiar el campo
                                 field.onChange(undefined);
                               }
                             }}
                           />
                         </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vin_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.vin")}</FormLabel>
                        <FormControl>
                          <Input 
                             {...field}
                            onChange={(e) => {
                              // Remove all spaces from VIN input
                              const value = e.target.value.replace(/\s/g, '');
                              field.onChange(value);
                            }}
                            onKeyPress={(e) => {
                              // Prevent space key from being typed
                              if (e.key === ' ') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="license_plate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.licensePlate")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuel_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.fuelType")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fuelTypes.map((fuel) => (
                              <SelectItem key={fuel.value} value={fuel.value}>
                                {fuel.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.status")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="current_mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.currentMileage")}</FormLabel>
                        <FormControl>
                           <Input 
                             type="number" 
                             placeholder="" 
                             value={field.value || ""}
                             onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("equipment.fields.notes")}</FormLabel>
                      <FormControl>
                         <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="license_plate_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.licensePlateExpiry")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registration_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.registrationExpiry")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insurance_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.insuranceExpiry")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="annual_inspection_expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.annualInspectionExpiry")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.purchaseDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("equipment.fields.purchasePrice")}</FormLabel>
                        <FormControl>
                           <Input 
                             type="number" 
                             step="0.01"
                             placeholder="" 
                             value={field.value || ""}
                             onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "Cancelar")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? t("common.creating", "Creando...") : t("common.create", "Crear")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}