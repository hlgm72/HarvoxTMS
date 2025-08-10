import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { useEquipment, type CreateEquipmentData } from "@/hooks/useEquipment";
import { ComboboxField } from "@/components/ui/ComboboxField";
import { getBrandsByEquipmentType } from "@/constants/equipmentBrands";
import { Truck, Plus } from "lucide-react";

const equipmentInlineSchema = z.object({
  equipment_number: z.string().min(1, "El número de equipo es requerido"),
  equipment_type: z.string().min(1, "El tipo de equipo es requerido"),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().min(1990, "El año debe ser mayor a 1990").max(new Date().getFullYear() + 1, `El año no puede ser mayor a ${new Date().getFullYear() + 1}`).optional(),
  vin_number: z.string().optional(),
  license_plate: z.string().optional(),
  fuel_type: z.string().optional(),
});

type EquipmentInlineFormData = z.infer<typeof equipmentInlineSchema>;

interface CreateEquipmentInlineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentType: "truck" | "trailer";
  onSuccess?: (equipmentId: string) => void;
}

export function CreateEquipmentInline({ 
  open, 
  onOpenChange, 
  equipmentType,
  onSuccess 
}: CreateEquipmentInlineProps) {
  const { t } = useTranslation();
  const { createEquipment, isCreating } = useEquipment();

  const form = useForm<EquipmentInlineFormData>({
    resolver: zodResolver(equipmentInlineSchema),
    defaultValues: {
      equipment_number: "",
      equipment_type: equipmentType,
      make: "",
      model: "",
      year: undefined,
      vin_number: "",
      license_plate: "",
      fuel_type: "diesel",
    },
  });

  // Obtener marcas basadas en el tipo de equipo
  const availableBrands = getBrandsByEquipmentType(equipmentType);

  const onSubmit = (data: EquipmentInlineFormData) => {
    const equipmentData: CreateEquipmentData = {
      equipment_number: data.equipment_number,
      equipment_type: data.equipment_type,
      make: data.make,
      model: data.model,
      year: data.year,
      vin_number: data.vin_number,
      license_plate: data.license_plate,
      fuel_type: data.fuel_type,
      status: "active",
    };

    createEquipment(equipmentData);
    form.reset();
    onOpenChange(false);
  };

  const fuelTypes = [
    { value: "diesel", label: t("equipment.fuel.diesel", "Diésel") },
    { value: "gasoline", label: t("equipment.fuel.gasoline", "Gasolina") },
    { value: "hybrid", label: t("equipment.fuel.hybrid", "Híbrido") },
    { value: "electric", label: t("equipment.fuel.electric", "Eléctrico") },
  ];

  const getTitle = () => {
    return equipmentType === "truck" 
      ? "Agregar Nuevo Camión" 
      : "Agregar Nuevo Trailer";
  };

  const getIcon = () => {
    return equipmentType === "truck" 
      ? "text-blue-600" 
      : "text-green-600";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className={`h-5 w-5 ${getIcon()}`} />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Complete la información básica del equipo para agregarlo rápidamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="equipment_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Equipo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: T001, R001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <ComboboxField
                      options={availableBrands}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar marca..."
                      emptyText="No se encontraron marcas."
                      allowCustom={true}
                      customText="Agregar marca personalizada"
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
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Modelo del equipo" />
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
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="2024"
                        min="1990"
                        max={new Date().getFullYear() + 1}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : undefined);
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
                    <FormLabel>Número VIN</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="VIN del equipo"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '');
                          field.onChange(value);
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
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Número de placa" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {equipmentType === "truck" && (
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Combustible</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-50">
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
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isCreating}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {isCreating ? "Creando..." : "Crear Equipo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}