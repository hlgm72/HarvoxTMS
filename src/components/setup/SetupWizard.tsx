import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { CheckCircle, User, Settings, Building, Truck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PersonalInfoForm, PersonalInfoFormRef } from '@/components/profile/PersonalInfoForm';
import { PreferencesForm, PreferencesFormRef } from '@/components/profile/PreferencesForm';
import { DriverInfoForm, DriverInfoFormRef } from '@/components/profile/DriverInfoForm';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { supabase } from '@/integrations/supabase/client';
import { AddressForm } from '@/components/ui/AddressForm';
import { useFleetNotifications } from '@/components/notifications';


interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userRole: string;
}

export function SetupWizard({ isOpen, onClose, onComplete, userRole }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { user, isDriver, isCompanyOwner } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();

  // Form refs
  const personalInfoFormRef = useRef<PersonalInfoFormRef>(null);
  const preferencesFormRef = useRef<PreferencesFormRef>(null);
  const driverInfoFormRef = useRef<DriverInfoFormRef>(null);
  const companySetupRef = useRef<{ saveData: () => Promise<boolean> }>(null);

  const steps: SetupStep[] = [
    {
      id: 'profile',
      title: 'Datos Personales',
      description: 'Completa tu información personal',
      icon: User,
      completed: false
    },
    {
      id: 'preferences',
      title: 'Preferencias',
      description: 'Configura idioma y zona horaria',
      icon: Settings,
      completed: false
    },
    ...(isDriver ? [{
      id: 'driver',
      title: 'Conductor',
      description: 'Información de licencia y contactos',
      icon: Truck,
      completed: false
    }] : []),
    ...(isCompanyOwner ? [{
      id: 'company',
      title: 'Datos de Empresa',
      description: 'Información de tu empresa',
      icon: Building,
      completed: false
    }] : [])
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      console.log('Starting setup completion process...');
      
      const saveResults: Array<{ step: string; success: boolean; error?: string }> = [];
      
      // Save Personal Info (always present)
      if (personalInfoFormRef.current) {
        console.log('Saving personal info...');
        const result = await personalInfoFormRef.current.saveData();
        saveResults.push({ step: 'Información Personal', ...result });
      }
      
      // Save Preferences (always present)
      if (preferencesFormRef.current) {
        console.log('Saving preferences...');
        const result = await preferencesFormRef.current.saveData();
        saveResults.push({ step: 'Preferencias', ...result });
      }
      
      // Save Driver Info (only for drivers)
      if (isDriver && driverInfoFormRef.current) {
        console.log('Saving driver info...');
        const result = await driverInfoFormRef.current.saveData();
        saveResults.push({ step: 'Información del Conductor', ...result });
      }
      
      // Save Company Info (only for company owners)
      if (isCompanyOwner && companySetupRef.current) {
        console.log('Saving company info...');
        const companyResult = await companySetupRef.current.saveData();
        saveResults.push({ 
          step: 'Información de la Empresa', 
          success: companyResult, 
          error: companyResult ? undefined : 'Error al guardar información de la empresa'
        });
      }
      
      // Check if all saves were successful
      const failedSaves = saveResults.filter(result => !result.success);
      
      if (failedSaves.length > 0) {
        const errorMessage = failedSaves.map(fail => `${fail.step}: ${fail.error}`).join('\n');
        throw new Error(`Error en los siguientes pasos:\n${errorMessage}`);
      }
      
      console.log('All data saved successfully');
      
      // Show success message
      showSuccess(
        "¡Configuración completada!",
        "Todos tus datos han sido guardados exitosamente."
      );
      
      // Call completion callback
      onComplete();
      
    } catch (error: any) {
      console.error('Error during setup completion:', error);
      showError(
        "Error al completar la configuración",
        error.message || "Algunos datos no pudieron ser guardados. Por favor, inténtalo nuevamente."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <VisuallyHidden>
          <DialogDescription>
            Asistente de configuración inicial para completar el perfil del usuario
          </DialogDescription>
        </VisuallyHidden>
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 border-b">
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-center">
            Configuración Inicial
          </DialogTitle>
          <p className="text-sm sm:text-base text-muted-foreground text-center px-2">
            Vamos a configurar tu cuenta paso a paso
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Progress Bar */}
          <div className="space-y-2 flex-shrink-0 p-4 sm:p-6 pb-3">
            <div className="flex justify-between text-sm">
              <span>Progreso de configuración</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Navigation */}
          <div className="flex justify-center sm:justify-between items-center flex-shrink-0 overflow-x-auto px-4 sm:px-6 pb-3 gap-2 sm:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 sm:gap-3 cursor-pointer transition-all flex-shrink-0 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : isCompleted 
                      ? 'bg-green-100 text-green-600 border-green-600' 
                      : 'border-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-3 w-3 sm:h-5 sm:w-5" />
                    ) : (
                      <Icon className="h-3 w-3 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <div className="hidden md:block">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6">
            <div className="flex items-center gap-2 text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex-shrink-0">
              {React.createElement(steps[currentStep].icon, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
              {steps[currentStep].title}
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-lg p-4">
              {isCompleting ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Guardando configuración...</h3>
                  <p className="text-muted-foreground text-center">
                    Estamos configurando tu cuenta con la información proporcionada
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Personal Info Form - Always present */}
                  <div className={currentStep === 0 ? 'block' : 'hidden'}>
                    <PersonalInfoForm 
                      ref={personalInfoFormRef}
                      showCancelButton={false}
                      className="space-y-6"
                    />
                  </div>

                  {/* Preferences Form - Always present */}
                  <div className={currentStep === 1 ? 'block' : 'hidden'}>
                    <PreferencesForm 
                      ref={preferencesFormRef}
                      showCancelButton={false}
                      className="space-y-6"
                    />
                  </div>

                  {/* Driver Info Form - Only for drivers */}
                  {isDriver && (
                    <div className={currentStep === 2 ? 'block' : 'hidden'}>
                      <DriverInfoForm 
                        ref={driverInfoFormRef}
                        showCancelButton={false}
                        className="space-y-6"
                      />
                    </div>
                  )}

                  {/* Company Setup Form - Only for company owners */}
                  {isCompanyOwner && (
                    <div className={currentStep === (isDriver ? 3 : 2) ? 'block' : 'hidden'}>
                      <CompanySetupStep 
                        ref={companySetupRef}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          {!isCompleting && (
            <div className="flex flex-col sm:flex-row justify-between p-4 sm:p-6 pt-3 flex-shrink-0 gap-3 sm:gap-0 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="text-sm sm:text-base"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <Button variant="ghost" onClick={onClose} className="text-sm sm:text-base order-2 sm:order-1">
                  Saltar configuración
                </Button>
                <Button onClick={handleNext} className="text-sm sm:text-base order-1 sm:order-2">
                  {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Componente especializado para configuración de empresa en el setup
const CompanySetupStep = React.forwardRef<{ saveData: () => Promise<boolean> }>((props, ref) => {
  const { userCompany } = useCompanyCache();
  const { showSuccess, showError } = useFleetNotifications();
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    dotNumber: '',
    mcNumber: '',
    address: '',
    cityId: '',
    stateId: '',
    zipCode: '',
    phone: '',
    email: ''
  });

  // Cargar datos existentes de la empresa
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!userCompany?.company_id) return;
      
      try {
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userCompany.company_id)
          .single();

        if (error) {
          console.error('Error loading company data:', error);
          return;
        }

        if (company) {
          setCompanyData({
            name: company.name || '',
            dotNumber: company.dot_number || '',
            mcNumber: company.mc_number || '',
            address: company.street_address || '',
            cityId: company.city_id || '',
            stateId: company.state_id || '',
            zipCode: company.zip_code || '',
            phone: company.phone || '',
            email: company.email || ''
          });
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };

    loadCompanyData();
  }, [userCompany]);

  // Función para guardar datos de la empresa
  const handleSaveCompany = async () => {
    if (!userCompany?.company_id) {
      console.error('No company ID available');
      return false;
    }

    // Validar campos requeridos
    if (!companyData.name.trim() || !companyData.address.trim() || !companyData.stateId || !companyData.zipCode.trim()) {
      alert('Por favor completa todos los campos requeridos (*)');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name.trim(),
          dot_number: companyData.dotNumber.trim() || null,
          mc_number: companyData.mcNumber.trim() || null,
          street_address: companyData.address.trim(),
          city_id: companyData.cityId || null,
          state_id: companyData.stateId,
          zip_code: companyData.zipCode.trim(),
          phone: companyData.phone.trim() || null,
          email: companyData.email.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userCompany.company_id);

      if (error) {
        console.error('Error updating company:', error);
        showError(
          "Error al guardar",
          "No se pudieron guardar los datos de la empresa. Inténtalo nuevamente."
        );
        return false;
      }

      console.log('✅ Company data saved successfully');
      showSuccess(
        "Datos guardados",
        "La información de la empresa ha sido guardada exitosamente."
      );
      return true;
    } catch (error) {
      console.error('Error saving company data:', error);
      alert('Error al guardar los datos de la empresa');
      return false;
    } finally {
      setLoading(false);
    }
    };

  // Expose saveData method via ref
  React.useImperativeHandle(ref, () => ({
    saveData: handleSaveCompany
  }));

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold mb-2">Información de la Empresa</h3>
        <p className="text-muted-foreground">
          Configura los datos básicos de tu empresa de transporte
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-sm font-medium">Nombre de la Empresa *</Label>
          <Input
            id="company-name"
            type="text"
            placeholder="Transportes ABC LLC"
            value={companyData.name}
            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="dot-number" className="text-sm font-medium">Número DOT</Label>
            <Input
              id="dot-number"
              type="text"
              placeholder="1234567"
              value={companyData.dotNumber}
              onChange={(e) => setCompanyData({ ...companyData, dotNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc-number" className="text-sm font-medium">Número MC</Label>
            <Input
              id="mc-number"
              type="text"
              placeholder="MC-123456"
              value={companyData.mcNumber}
              onChange={(e) => setCompanyData({ ...companyData, mcNumber: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Componente de dirección reutilizable */}
      <div className="space-y-2">
        <div className="px-1">
          <AddressForm
            streetAddress={companyData.address}
            onStreetAddressChange={(value) => setCompanyData({ ...companyData, address: value })}
            stateId={companyData.stateId}
            onStateChange={(value) => setCompanyData({ ...companyData, stateId: value || '' })}
            cityId={companyData.cityId}
            onCityChange={(value) => setCompanyData({ ...companyData, cityId: value || '' })}
            zipCode={companyData.zipCode}
            onZipCodeChange={(value) => setCompanyData({ ...companyData, zipCode: value })}
            required={true}
            streetAddressLabel="Dirección"
            stateLabel="Estado"
            cityLabel="Ciudad"
            zipCodeLabel="Código Postal"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="company-phone" className="text-sm font-medium">Teléfono</Label>
          <Input
            id="company-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={companyData.phone}
            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-email" className="text-sm font-medium">Email de la Empresa</Label>
          <Input
            id="company-email"
            type="email"
            placeholder="info@transportesabc.com"
            value={companyData.email}
            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg">
        <p className="text-sm text-amber-800">
          ⚠️ <strong>Importante:</strong> Los números DOT y MC son requeridos para operaciones comerciales en Estados Unidos
        </p>
      </div>

      {/* Botón para guardar datos */}
      <div className="flex justify-end pt-4" data-company-form>
        <Button 
          onClick={handleSaveCompany}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            'Guardar Datos de Empresa'
          )}
        </Button>
      </div>
    </div>
  );
});
