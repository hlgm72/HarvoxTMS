import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Users, CheckCircle } from "lucide-react";
import { CompanyDriver } from "@/hooks/useCompanyDrivers";

interface LoadAssignmentSectionProps {
  drivers: CompanyDriver[];
  selectedDriver: CompanyDriver | null;
  onDriverSelect: (driver: CompanyDriver | null) => void;
}

export function LoadAssignmentSection({ 
  drivers, 
  selectedDriver, 
  onDriverSelect 
}: LoadAssignmentSectionProps) {
  const activeDrivers = drivers.filter(driver => driver.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Asignación de Conductor
        </CardTitle>
        <CardDescription>
          Selecciona el conductor que realizará esta carga. El conductor asignado podrá ver la información de la carga en su portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Driver Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">
              Conductores disponibles ({activeDrivers.length})
            </h4>
          </div>

          {activeDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No hay conductores disponibles</p>
              <p className="text-sm">Contacta al administrador para agregar conductores.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeDrivers.map((driver) => (
                <div
                  key={driver.user_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedDriver?.user_id === driver.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onDriverSelect(
                    selectedDriver?.user_id === driver.user_id ? null : driver
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h5 className="font-medium">
                          {driver.first_name} {driver.last_name}
                        </h5>
                        {driver.phone && (
                          <p className="text-sm text-muted-foreground">
                            📞 {driver.phone}
                          </p>
                        )}
                        {driver.license_number && (
                          <p className="text-sm text-muted-foreground">
                            CDL: {driver.license_number}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={driver.is_active ? "default" : "secondary"}>
                        {driver.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      {selectedDriver?.user_id === driver.user_id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Driver Summary */}
        {selectedDriver && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Conductor seleccionado
            </h4>
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
               <div>
                 <p className="font-medium">
                   {selectedDriver.first_name} {selectedDriver.last_name}
                 </p>
                 {selectedDriver.phone && (
                   <p className="text-sm text-muted-foreground">
                     📞 {selectedDriver.phone}
                   </p>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">ℹ️ Información importante</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• El conductor seleccionado recibirá notificación de la asignación</li>
            <li>• Podrá ver los detalles de la carga en su portal</li>
            <li>• Solo conductores activos pueden recibir asignaciones</li>
            <li>• Puedes cambiar la asignación después de crear la carga</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}