import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Users, CheckCircle, Settings, DollarSign } from "lucide-react";
import { CompanyDriver } from "@/hooks/useCompanyDrivers";
import { CompanyDispatcher } from "@/hooks/useCompanyDispatchers";
import { useOwnerOperator } from "@/hooks/useOwnerOperator";

interface LoadAssignmentSectionProps {
  drivers: CompanyDriver[];
  selectedDriver: CompanyDriver | null;
  onDriverSelect: (driver: CompanyDriver | null) => void;
  dispatchers: CompanyDispatcher[];
  selectedDispatcher: CompanyDispatcher | null;
  onDispatcherSelect: (dispatcher: CompanyDispatcher | null) => void;
  // Owner Operator percentages
  leasingPercentage?: number;
  factoringPercentage?: number;
  dispatchingPercentage?: number;
  onLeasingPercentageChange?: (value: number) => void;
  onFactoringPercentageChange?: (value: number) => void;
  onDispatchingPercentageChange?: (value: number) => void;
}

export function LoadAssignmentSection({ 
  drivers, 
  selectedDriver, 
  onDriverSelect,
  dispatchers,
  selectedDispatcher,
  onDispatcherSelect,
  leasingPercentage,
  factoringPercentage,
  dispatchingPercentage,
  onLeasingPercentageChange,
  onFactoringPercentageChange,
  onDispatchingPercentageChange
}: LoadAssignmentSectionProps) {
  const activeDrivers = drivers.filter(driver => driver.is_active);
  
  // Get owner operator data for selected driver
  const { ownerOperator, isOwnerOperator, isLoading: ownerOperatorLoading } = useOwnerOperator(selectedDriver?.user_id);

  // Auto-populate percentages when owner operator is selected
  useEffect(() => {
    console.log('🔍 LoadAssignmentSection - useEffect triggered:', {
      isOwnerOperator,
      ownerOperator,
      leasingPercentage,
      factoringPercentage,
      dispatchingPercentage,
      hasCallbacks: !!(onLeasingPercentageChange && onFactoringPercentageChange && onDispatchingPercentageChange)
    });
    
    if (isOwnerOperator && ownerOperator && onLeasingPercentageChange && onFactoringPercentageChange && onDispatchingPercentageChange) {
      console.log('✅ LoadAssignmentSection - Conditions met, checking individual percentages...');
      
      // Only auto-populate if current values are undefined/null (avoid overwriting user changes)
      if (leasingPercentage === undefined && ownerOperator.leasing_percentage !== undefined && ownerOperator.leasing_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting leasing percentage from', leasingPercentage, 'to', ownerOperator.leasing_percentage);
        onLeasingPercentageChange(ownerOperator.leasing_percentage);
      } else {
        console.log('⏭️ LoadAssignmentSection - Skipping leasing percentage:', { leasingPercentage, ownerOperatorValue: ownerOperator.leasing_percentage });
      }
      
      if (factoringPercentage === undefined && ownerOperator.factoring_percentage !== undefined && ownerOperator.factoring_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting factoring percentage from', factoringPercentage, 'to', ownerOperator.factoring_percentage);
        onFactoringPercentageChange(ownerOperator.factoring_percentage);
      } else {
        console.log('⏭️ LoadAssignmentSection - Skipping factoring percentage:', { factoringPercentage, ownerOperatorValue: ownerOperator.factoring_percentage });
      }
      
      if (dispatchingPercentage === undefined && ownerOperator.dispatching_percentage !== undefined && ownerOperator.dispatching_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting dispatching percentage from', dispatchingPercentage, 'to', ownerOperator.dispatching_percentage);
        onDispatchingPercentageChange(ownerOperator.dispatching_percentage);
      } else {
        console.log('⏭️ LoadAssignmentSection - Skipping dispatching percentage:', { dispatchingPercentage, ownerOperatorValue: ownerOperator.dispatching_percentage });
      }
    } else {
      console.log('❌ LoadAssignmentSection - Conditions not met for auto-population');
    }
  }, [isOwnerOperator, ownerOperator, leasingPercentage, factoringPercentage, dispatchingPercentage, onLeasingPercentageChange, onFactoringPercentageChange, onDispatchingPercentageChange]);

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
                <div className="space-y-3">
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
                      {isOwnerOperator && (
                        <Badge variant="secondary" className="ml-2">
                          Owner Operator
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Owner Operator Percentages */}
                  {isOwnerOperator && (
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          Porcentajes del Owner Operator
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Estos porcentajes se aplicarán específicamente a esta carga. Puedes modificarlos según sea necesario.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="leasing-percentage" className="text-xs font-medium">
                              Leasing (%)
                            </Label>
                            <Input
                              id="leasing-percentage"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={leasingPercentage !== undefined && leasingPercentage !== null ? leasingPercentage.toString() : ''}
                              onChange={(e) => onLeasingPercentageChange?.(parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label htmlFor="factoring-percentage" className="text-xs font-medium">
                              Factoring (%)
                            </Label>
                            <Input
                              id="factoring-percentage"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={factoringPercentage || ''}
                              onChange={(e) => onFactoringPercentageChange?.(parseFloat(e.target.value) || 0)}
                              placeholder="3.0"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label htmlFor="dispatching-percentage" className="text-xs font-medium">
                              Dispatching (%)
                            </Label>
                            <Input
                              id="dispatching-percentage"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={dispatchingPercentage || ''}
                              onChange={(e) => onDispatchingPercentageChange?.(parseFloat(e.target.value) || 0)}
                              placeholder="5.0"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                        {ownerOperatorLoading && (
                          <div className="text-xs text-muted-foreground">
                            Cargando datos del Owner Operator...
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
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
                  if (value && value !== "none") {
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
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Sin dispatcher asignado</span>
                  </SelectItem>
                  {dispatchers.filter(dispatcher => dispatcher.user_id && dispatcher.user_id.trim() !== '').map((dispatcher) => (
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