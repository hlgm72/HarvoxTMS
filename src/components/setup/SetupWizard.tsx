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
import { useUserPreferences } from '@/hooks/useUserPreferences';
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

// Detectar zona horaria automáticamente
const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // Fallback
  }
};

export function SetupWizard({ isOpen, onClose, onComplete, userRole }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [validSteps, setValidSteps] = useState<boolean[]>([]);
  const { user, isDriver, isCompanyOwner } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { updatePreferences } = useUserPreferences();

  // Estados centralizados para todos los datos del wizard
  const [wizardData, setWizardData] = useState({
    personalInfo: null as any,
    preferences: {
      preferred_language: 'en',
      timezone: getUserTimezone(),
    } as any,
    driverInfo: null as any,
    companyInfo: null as any,
  });

  // Form refs para validación
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

  // Inicializar validSteps
  useEffect(() => {
    setValidSteps(new Array(steps.length).fill(false));
  }, [steps.length]);

  // Detectar zona horaria automáticamente al abrir el wizard
  useEffect(() => {
    if (isOpen) {
      const detectedTimezone = getUserTimezone();
      console.log('🌍 Zona horaria detectada automáticamente:', detectedTimezone);
      setWizardData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          timezone: detectedTimezone
        }
      }));
    }
  }, [isOpen]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Validar paso actual sin guardar
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      switch (currentStep) {
        case 0: // Personal Info
          if (personalInfoFormRef.current) {
            // Solo validar sin guardar - los datos se almacenarán al final
            const result = await personalInfoFormRef.current.saveData();
            return result.success;
          }
          return false;

        case 1: // Preferences
          if (preferencesFormRef.current) {
            const result = await preferencesFormRef.current.saveData();
            return result.success;
          }
          return false;

        case 2: // Driver Info (if driver)
          if (isDriver && driverInfoFormRef.current) {
            const result = await driverInfoFormRef.current.saveData();
            return result.success;
          }
          return true; // Skip if not driver

        case (isDriver ? 3 : 2): // Company Info (if company owner)
          if (isCompanyOwner && companySetupRef.current) {
            const result = await companySetupRef.current.saveData();
            return result;
          }
          return true; // Skip if not company owner

        default:
          return true;
      }
    } catch (error) {
      console.error('Error validating step:', error);
      return false;
    }
  };

  const handleNext = async () => {
    // Validar paso actual
    const isValid = await validateCurrentStep();
    
    if (!isValid) {
      showError(
        "Validación requerida",
        "Por favor completa todos los campos requeridos antes de continuar."
      );
      return;
    }

    // Marcar paso como válido
    setValidSteps(prev => {
      const newValid = [...prev];
      newValid[currentStep] = true;
      return newValid;
    });

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
      console.log('🚀 SetupWizard: Starting final save with all data...', wizardData);
      
      const saveResults: Array<{ step: string; success: boolean; error?: string }> = [];
      
      // 1) Guardar Datos Personales
      if (wizardData.personalInfo || personalInfoFormRef.current) {
        console.log('🔄 SetupWizard: Saving personal info...');
        try {
          let result;
          if (wizardData.personalInfo) {
            result = { success: true };
          } else {
            result = await personalInfoFormRef.current!.saveData();
          }
          console.log('✅ SetupWizard: Personal info result:', result);
          saveResults.push({ step: 'Información Personal', ...result });
        } catch (error: any) {
          console.error('❌ SetupWizard: Personal info error:', error);
          saveResults.push({ step: 'Información Personal', success: false, error: error.message });
        }
      }
      
      // 2) Guardar Preferencias (siempre con zona horaria detectada)
      console.log('🔄 SetupWizard: Saving preferences with timezone:', wizardData.preferences?.timezone || 'auto-detected');
      try {
        let result;
        
        // Intentar obtener datos desde el ref primero
        if (preferencesFormRef.current) {
          console.log('🔄 SetupWizard: Getting preferences from form ref...');
          result = await preferencesFormRef.current.saveData();
        } else if (wizardData.preferences) {
          console.log('🔄 SetupWizard: Using cached preferences data...');
          // Si tenemos datos en caché pero no ref, usar los datos directamente
          result = await updatePreferences({
            preferred_language: wizardData.preferences.preferred_language || 'en',
            timezone: wizardData.preferences.timezone || (() => {
              try {
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
              } catch {
                return 'America/New_York';
              }
            })(),
          });
        } else {
          console.warn('⚠️ SetupWizard: No preferences data available, using defaults...');
          // Como último recurso, usar valores por defecto
          const getUserTimezone = () => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch {
              return 'America/New_York';
            }
          };
          
          result = await updatePreferences({
            preferred_language: 'en',
            timezone: getUserTimezone(),
          });
        }
        
        console.log('✅ SetupWizard: Preferences result:', result);
        saveResults.push({ step: 'Preferencias', ...result });
      } catch (error: any) {
        console.error('❌ SetupWizard: Preferences error:', error);
        saveResults.push({ step: 'Preferencias', success: false, error: error.message });
      }
      
      // 3) Guardar datos de Conductor (si aplica)
      if (isDriver) {
        console.log('🔄 SetupWizard: Saving driver info...');
        try {
          let result;
          if (wizardData.driverInfo || driverInfoFormRef.current) {
            if (wizardData.driverInfo) {
              result = { success: true };
            } else {
              result = await driverInfoFormRef.current!.saveData();
            }
            console.log('✅ SetupWizard: Driver info result:', result);
            saveResults.push({ step: 'Información del Conductor', ...result });
          }
        } catch (error: any) {
          console.error('❌ SetupWizard: Driver info error:', error);
          saveResults.push({ step: 'Información del Conductor', success: false, error: error.message });
        }
      }
      
      // 4) Guardar datos de Empresa (si aplica)
      if (isCompanyOwner) {
        console.log('🔄 SetupWizard: Saving company info...');
        try {
          let result;
          if (wizardData.companyInfo !== null || companySetupRef.current) {
            if (wizardData.companyInfo !== null) {
              result = wizardData.companyInfo;
            } else {
              result = await companySetupRef.current!.saveData();
            }
            console.log('✅ SetupWizard: Company info result:', result);
            saveResults.push({ 
              step: 'Información de la Empresa', 
              success: result, 
              error: result ? undefined : 'Error al guardar información de la empresa'
            });
          }
        } catch (error: any) {
          console.error('❌ SetupWizard: Company info error:', error);
          saveResults.push({ step: 'Información de la Empresa', success: false, error: error.message });
        }
      }
      
      console.log('📊 SetupWizard: All save results:', saveResults);
      
      // Check if all saves were successful
      const failedSaves = saveResults.filter(result => !result.success);
      
      if (failedSaves.length > 0) {
        console.error('❌ SetupWizard: Failed saves:', failedSaves);
        const errorMessage = failedSaves.map(fail => `${fail.step}: ${fail.error}`).join('\n');
        throw new Error(`Error en los siguientes pasos:\n${errorMessage}`);
      }
      
      console.log('🎉 SetupWizard: All data saved successfully');
      
      // Show success message
      showSuccess(
        "¡Configuración completada!",
        `Todos tus datos han sido guardados exitosamente. Zona horaria configurada: ${wizardData.preferences.timezone}`
      );
      
      // Call completion callback
      onComplete();
      
    } catch (error: any) {
      console.error('💥 SetupWizard: Error during setup completion:', error);
      showError(
        "Error al completar la configuración",
        error.message || "Algunos datos no pudieron ser guardados. Por favor, inténtalo nuevamente."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Solo permitir navegar a pasos previos o al siguiente paso válido
    if (stepIndex <= currentStep || validSteps[stepIndex - 1]) {
      setCurrentStep(stepIndex);
    }
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
                    Estamos guardando todos tus datos de configuración.<br/>
                    Zona horaria detectada: <strong>{wizardData.preferences.timezone}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Personal Info Form - Always present */}
                  <div className={currentStep === 0 ? 'block' : 'hidden'}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">Información Personal</h3>
                      <p className="text-muted-foreground">
                        Los datos se guardarán al finalizar el wizard completo
                      </p>
                    </div>
                    <PersonalInfoForm 
                      ref={personalInfoFormRef}
                      showCancelButton={false}
                      showSaveButton={false}
                      className="space-y-6"
                    />
                  </div>

                  {/* Preferences Form - Always present */}
                  <div className={currentStep === 1 ? 'block' : 'hidden'}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">Configuración de Preferencias</h3>
                      <p className="text-muted-foreground">
                        Zona horaria detectada automáticamente: <strong>{wizardData.preferences.timezone}</strong>
                      </p>
                    </div>
                    <PreferencesForm 
                      ref={preferencesFormRef}
                      showCancelButton={false}
                      showSaveButton={false}
                      className="space-y-6"
                    />
                  </div>

                  {/* Driver Info Form - Only for drivers */}
                  {isDriver && (
                    <div className={currentStep === 2 ? 'block' : 'hidden'}>
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold mb-2">Información del Conductor</h3>
                        <p className="text-muted-foreground">
                          Completa tu información de licencia y contactos de emergencia
                        </p>
                      </div>
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
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold mb-2">Configuración de Empresa</h3>
                        <p className="text-muted-foreground">
                          Configura los datos básicos de tu empresa
                        </p>
                      </div>
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
    city: '',
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
            city: company.city || '',
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
          city: companyData.city || null,
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
            city={companyData.city}
            onCityChange={(value) => setCompanyData({ ...companyData, city: value || '' })}
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
          ⚠️ <strong>Importante:</strong> Los números DOT y MC son requeridos para operaciones comerciales en Estados Unidos. 
          Los datos se guardarán al finalizar el wizard completo.
        </p>
      </div>
    </div>
  );
});
