import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
              Conductor (Requerido)
            </h4>
          </div>

          {activeDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No hay conductores disponibles</p>
              <p className="text-sm">Contacta al administrador para agregar conductores.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Select 
                value={selectedDriver?.user_id || ""} 
                onValueChange={(value) => {
                  if (value) {
                    const driver = activeDrivers.find(d => d.user_id === value);
                    onDriverSelect(driver || null);
                  } else {
                    onDriverSelect(null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un conductor..." />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {driver.first_name} {driver.last_name}
                          </span>
                          {driver.phone && (
                            <span className="text-sm text-muted-foreground ml-2">
                              📞 {driver.phone}
                            </span>
                          )}
                          {driver.license_number && (
                            <span className="text-sm text-muted-foreground ml-2">
                              CDL: {driver.license_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDriver && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Conductor: {selectedDriver.first_name} {selectedDriver.last_name}
                    </span>
                    {selectedDriver.phone && (
                      <span className="text-sm text-muted-foreground">
                        📞 {selectedDriver.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
            <div className="space-y-3">
              <Select 
                value={selectedDispatcher?.user_id || ""} 
                onValueChange={(value) => {
                  if (value) {
                    const dispatcher = dispatchers.find(d => d.user_id === value);
                    onDispatcherSelect(dispatcher || null);
                  } else {
                    onDispatcherSelect(null);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un dispatcher (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">Sin dispatcher asignado</span>
                  </SelectItem>
                  {dispatchers.map((dispatcher) => (
                    <SelectItem key={dispatcher.user_id} value={dispatcher.user_id}>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {dispatcher.first_name} {dispatcher.last_name}
                          </span>
                          {dispatcher.phone && (
                            <span className="text-sm text-muted-foreground ml-2">
                              📞 {dispatcher.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDispatcher && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Dispatcher: {selectedDispatcher.first_name} {selectedDispatcher.last_name}
                    </span>
                    {selectedDispatcher.phone && (
                      <span className="text-sm text-muted-foreground">
                        📞 {selectedDispatcher.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}
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