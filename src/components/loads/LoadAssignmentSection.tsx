import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Users, CheckCircle, Settings, DollarSign, Building2, Contact } from "lucide-react";
import { CompanyDriver } from "@/hooks/useCompanyDrivers";
import { CompanyDispatcher } from "@/hooks/useCompanyDispatchers";
import { Client } from "@/hooks/useClients";
import { useOwnerOperator } from "@/hooks/useOwnerOperator";
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { ContactCombobox } from "@/components/clients/ContactCombobox";


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
  percentagesInitialized?: string | null;
  onPercentagesInitialized?: (driverId: string | null) => void;
  mode?: 'create' | 'edit' | 'duplicate';
  // New props for client fields
  form?: UseFormReturn<any>;
  clients?: Client[];
  selectedClient?: Client | null;
  onClientSelect?: (client: Client | null) => void;
  onShowCreateClient?: (searchTerm: string) => void;
  onShowCreateDispatcher?: () => void;
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
  onDispatchingPercentageChange,
  percentagesInitialized,
  onPercentagesInitialized,
  mode,
  form,
  clients = [],
  selectedClient,
  onClientSelect,
  onShowCreateClient,
  onShowCreateDispatcher
}: LoadAssignmentSectionProps) {
  const { t } = useTranslation();
  const activeDrivers = drivers.filter(driver => driver.is_active);
  
  // Get owner operator data for selected driver
  const { ownerOperator, isOwnerOperator, isLoading: ownerOperatorLoading } = useOwnerOperator(selectedDriver?.user_id);

  // Auto-populate percentages when owner operator is selected (only once per driver)
  useEffect(() => {
    console.log('🔍 LoadAssignmentSection - useEffect triggered:', {
      selectedDriverInfo: selectedDriver ? {
        user_id: selectedDriver.user_id,
        name: `${selectedDriver.first_name} ${selectedDriver.last_name}`,
        id: selectedDriver.id
      } : null,
      isOwnerOperator,
      ownerOperatorData: ownerOperator,
      ownerOperatorLoading,
      percentagesInitialized,
      currentPercentages: {
        leasingPercentage,
        factoringPercentage,
        dispatchingPercentage
      },
      hasCallbacks: !!(onLeasingPercentageChange && onFactoringPercentageChange && onDispatchingPercentageChange)
    });
    
    // Check if percentages already have values (indicating edit mode with existing data)
    const hasExistingPercentages = (
      (leasingPercentage !== undefined && leasingPercentage !== null && leasingPercentage > 0) ||
      (factoringPercentage !== undefined && factoringPercentage !== null && factoringPercentage > 0) ||
      (dispatchingPercentage !== undefined && dispatchingPercentage !== null && dispatchingPercentage > 0)
    );
    
    // Only auto-populate if:
    // 1. We have a new driver and haven't initialized percentages for this driver yet
    // 2. In edit mode: don't override existing percentages; In duplicate mode: allow override
    if (isOwnerOperator && 
        ownerOperator && 
        selectedDriver && 
        percentagesInitialized !== selectedDriver.user_id &&
        (mode === 'duplicate' || !hasExistingPercentages) && // Allow override in duplicate mode
        onLeasingPercentageChange && 
        onFactoringPercentageChange && 
        onDispatchingPercentageChange &&
        onPercentagesInitialized) {
      
      console.log('✅ LoadAssignmentSection - Applying Owner Operator percentages for new driver...', { mode, hasExistingPercentages });
      
      // Only apply owner operator percentages when a new owner operator is selected
      if (ownerOperator.leasing_percentage !== undefined && ownerOperator.leasing_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting leasing percentage from', leasingPercentage, 'to', ownerOperator.leasing_percentage);
        onLeasingPercentageChange(ownerOperator.leasing_percentage);
      }
      
      if (ownerOperator.factoring_percentage !== undefined && ownerOperator.factoring_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting factoring percentage from', factoringPercentage, 'to', ownerOperator.factoring_percentage);
        onFactoringPercentageChange(ownerOperator.factoring_percentage);
      }
      
      if (ownerOperator.dispatching_percentage !== undefined && ownerOperator.dispatching_percentage !== null) {
        console.log('🔄 LoadAssignmentSection - Setting dispatching percentage from', dispatchingPercentage, 'to', ownerOperator.dispatching_percentage);
        onDispatchingPercentageChange(ownerOperator.dispatching_percentage);
      }

      // Mark that we've initialized percentages for this driver
      onPercentagesInitialized(selectedDriver.user_id);
    } else if (!selectedDriver) {
      // Reset when no driver is selected
      onPercentagesInitialized?.(null);
    } else if (hasExistingPercentages && mode !== 'duplicate') {
      // If we have existing percentages, mark as initialized to prevent future overrides
      // Exception: in duplicate mode, allow overrides 
      console.log('📋 LoadAssignmentSection - Preserving existing percentages in edit mode');
      onPercentagesInitialized?.(selectedDriver?.user_id || 'existing-data');
    } else {
      console.log('❌ LoadAssignmentSection - Conditions not met for auto-population', { mode, hasExistingPercentages, isOwnerOperator: !!ownerOperator });
    }
  }, [isOwnerOperator, ownerOperator, selectedDriver?.user_id]); // Removed callbacks from dependencies to prevent infinite loop

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {t("loads:create_wizard.phases.assignment.card_title")}
        </CardTitle>
        <CardDescription>
          {t("loads:create_wizard.phases.assignment.card_description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client and Contact Fields at the Top */}
        {form && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6 border-b">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("loads:create_wizard.form.client_broker")} {t("loads:create_wizard.form.client_broker_required")}
                  </FormLabel>
                  <FormControl>
                    <ClientCombobox
                      clients={clients}
                      value={field.value}
                      onValueChange={(value) => {
                        console.log('🔍 CLIENT SELECTED - Value:', value);
                        field.onChange(value);
                        const client = clients.find(c => c.id === value);
                        console.log('🔍 CLIENT SELECTED - Found client:', client?.name);
                        onClientSelect?.(client || null);
                        form.setValue("contact_id", "");
                        console.log('🔍 CLIENT SELECTED - Cleared contact_id');
                        if (form.formState.errors.client_id) {
                          form.clearErrors("client_id");
                        }
                      }}
                      onClientSelect={(client) => onClientSelect?.(client as Client)}
                      placeholder={t("loads:create_wizard.form.client_placeholder")}
                      className="w-full"
                      onCreateNew={onShowCreateClient}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Selection */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Contact className="h-4 w-4" />
                    {t("loads:create_wizard.form.client_contact")}
                  </FormLabel>
                  <FormControl>
                    <ContactCombobox
                      clientId={selectedClient?.id}
                      value={field.value}
                      onValueChange={(value) => {
                        console.log('🔍 CONTACT SELECTED - Value:', value);
                        field.onChange(value);
                      }}
                      placeholder={t("loads:create_wizard.form.contact_placeholder")}
                      disabled={!selectedClient}
                      className="w-full"
                      onCreateNew={selectedClient ? onShowCreateDispatcher : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Driver Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">
              {t("loads:create_wizard.phases.assignment.driver_section.title")}
            </h4>
          </div>

          {activeDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("loads:create_wizard.phases.assignment.driver_section.no_drivers")}</p>
              <p className="text-sm">{t("loads:create_wizard.phases.assignment.driver_section.contact_admin")}</p>
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
                  <SelectValue placeholder={t("loads:create_wizard.phases.assignment.driver_section.placeholder")} />
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
                          {t("loads:create_wizard.phases.assignment.driver_section.selected_label")} {selectedDriver.first_name} {selectedDriver.last_name}
                        </span>
                        {selectedDriver.phone && (
                          <span className="text-sm text-muted-foreground">
                            📞 {selectedDriver.phone}
                          </span>
                        )}
                        {isOwnerOperator && (
                          <Badge variant="secondary" className="ml-2">
                            {t("loads:create_wizard.phases.assignment.owner_operator.badge")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  {isOwnerOperator && (
                      <Card className="border-amber-200 bg-amber-50/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                            {t("loads:create_wizard.phases.assignment.owner_operator.percentages_title")}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {t("loads:create_wizard.phases.assignment.owner_operator.percentages_description")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor="leasing-percentage" className="text-xs font-medium">
                                {t("loads:create_wizard.phases.assignment.owner_operator.leasing_label")}
                              </Label>
                              <Input
                                id="leasing-percentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={leasingPercentage !== undefined && leasingPercentage !== null ? leasingPercentage.toFixed(2) : ''}
                                onChange={(e) => onLeasingPercentageChange?.(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <Label htmlFor="factoring-percentage" className="text-xs font-medium">
                                {t("loads:create_wizard.phases.assignment.owner_operator.factoring_label")}
                              </Label>
                              <Input
                                id="factoring-percentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={factoringPercentage !== undefined && factoringPercentage !== null ? factoringPercentage.toFixed(2) : ''}
                                onChange={(e) => onFactoringPercentageChange?.(parseFloat(e.target.value) || 0)}
                                placeholder="3.00"
                                className="text-xs h-8"
                              />
                            </div>
                            <div>
                              <Label htmlFor="dispatching-percentage" className="text-xs font-medium">
                                {t("loads:create_wizard.phases.assignment.owner_operator.dispatching_label")}
                              </Label>
                              <Input
                                id="dispatching-percentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={dispatchingPercentage !== undefined && dispatchingPercentage !== null ? dispatchingPercentage.toFixed(2) : ''}
                                onChange={(e) => onDispatchingPercentageChange?.(parseFloat(e.target.value) || 0)}
                                placeholder="5.00"
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                          {ownerOperatorLoading && (
                            <div className="text-xs text-muted-foreground">
                              {t("loads:create_wizard.phases.assignment.owner_operator.loading")}
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
              {t("loads:create_wizard.phases.assignment.dispatcher_section.title")}
            </h4>
          </div>

          {dispatchers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("loads:create_wizard.phases.assignment.dispatcher_section.no_dispatchers")}</p>
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
                  <SelectValue placeholder={t("loads:create_wizard.phases.assignment.dispatcher_section.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{t("loads:create_wizard.phases.assignment.dispatcher_section.no_assignment")}</span>
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
                      {t("loads:create_wizard.phases.assignment.dispatcher_section.selected_label")} {selectedDispatcher.first_name} {selectedDispatcher.last_name}
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
      </CardContent>
    </Card>
  );
}