import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Users, CheckCircle, Settings } from "lucide-react";
import { CompanyDriver } from "@/hooks/useCompanyDrivers";
import { CompanyDispatcher } from "@/hooks/useCompanyDispatchers";

interface LoadAssignmentSectionProps {
  drivers: CompanyDriver[];
  selectedDriver: CompanyDriver | null;
  onDriverSelect: (driver: CompanyDriver | null) => void;
  dispatchers: CompanyDispatcher[];
  selectedDispatcher: CompanyDispatcher | null;
  onDispatcherSelect: (dispatcher: CompanyDispatcher | null) => void;
}

export function LoadAssignmentSection({ 
  drivers, 
  selectedDriver, 
  onDriverSelect,
  dispatchers,
  selectedDispatcher,
  onDispatcherSelect
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

        {/* Dispatcher Selection */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">
              Dispatcher Interno (Opcional)
            </h4>
          </div>

          {dispatchers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay dispatchers disponibles</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {dispatchers.map((dispatcher) => (
                <div
                  key={dispatcher.user_id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedDispatcher?.user_id === dispatcher.user_id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onDispatcherSelect(
                    selectedDispatcher?.user_id === dispatcher.user_id ? null : dispatcher
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {dispatcher.first_name} {dispatcher.last_name}
                        </p>
                        {dispatcher.phone && (
                          <p className="text-xs text-muted-foreground">
                            📞 {dispatcher.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {selectedDispatcher?.user_id === dispatcher.user_id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedDispatcher && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                  Dispatcher: {selectedDispatcher.first_name} {selectedDispatcher.last_name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">ℹ️ Información importante</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• El conductor seleccionado recibirá notificación de la asignación</li>
            <li>• Podrá ver los detalles de la carga en su portal</li>
            <li>• El dispatcher interno es opcional y ayuda con el seguimiento</li>
            <li>• Solo conductores y dispatchers activos pueden recibir asignaciones</li>
            <li>• Puedes cambiar las asignaciones después de crear la carga</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}