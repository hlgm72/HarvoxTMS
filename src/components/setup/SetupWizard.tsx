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
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation('onboarding');

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
      title: t('setup.steps.personal.title'),
      description: t('setup.steps.personal.description'),
      icon: User,
      completed: false
    },
    {
      id: 'preferences',
      title: t('setup.steps.preferences.title'),
      description: t('setup.steps.preferences.description'),
      icon: Settings,
      completed: false
    },
    ...(isDriver ? [{
      id: 'driver',
      title: t('setup.steps.driver.title'),
      description: t('setup.steps.driver.description'),
      icon: Truck,
      completed: false
    }] : []),
    ...(isCompanyOwner ? [{
      id: 'company',
      title: t('setup.steps.company.title'),
      description: t('setup.steps.company.description'),
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

  // Validar paso actual SIN guardar - simplificado para evitar errores
  const validateCurrentStep = async (): Promise<boolean> => {
    // Por ahora, simplemente verificar que los refs estén disponibles
    // La validación real se hará en el momento del guardado final
    try {
      switch (currentStep) {
        case 0: // Personal Info
          return personalInfoFormRef.current !== null;

        case 1: // Preferences
          return preferencesFormRef.current !== null;

        case 2: // Driver Info (if driver)
          if (isDriver) {
            return driverInfoFormRef.current !== null;
          }
          return true; // Skip if not driver

        case (isDriver ? 3 : 2): // Company Info (if company owner)
          if (isCompanyOwner) {
            return companySetupRef.current !== null;
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
        t('setup.validation.required'),
        t('setup.validation.completeFields')
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
    // Capture refs BEFORE setting any state that could cause re-renders
    const currentPersonalInfoRef = personalInfoFormRef.current;
    const currentPreferencesRef = preferencesFormRef.current;
    const currentDriverInfoRef = driverInfoFormRef.current;
    const currentCompanySetupRef = companySetupRef.current;
    
    console.log('🚀 SetupWizard: Starting final save with all data...');
    console.log('🔍 SetupWizard: Captured refs status:');
    console.log('  - personalInfoFormRef:', currentPersonalInfoRef);
    console.log('  - preferencesFormRef:', currentPreferencesRef);
    console.log('  - driverInfoFormRef:', currentDriverInfoRef);
    console.log('  - companySetupRef:', currentCompanySetupRef);
    
    setIsCompleting(true);
    
    try {
      const saveResults: Array<{ step: string; success: boolean; error?: string }> = [];
      
      // Save all data using captured refs (prevents null refs during async operations)
      
      // 1) Guardar Datos Personales
      try {
        if (currentPersonalInfoRef) {
          console.log('🔄 SetupWizard: Saving personal info...');
          const result = await currentPersonalInfoRef.saveData();
          console.log('✅ SetupWizard: Personal info result:', result);
          saveResults.push({ step: 'Información Personal', ...result });
        } else {
          console.warn('⚠️ SetupWizard: personalInfoFormRef not available');
          saveResults.push({ step: 'Información Personal', success: false, error: 'Personal info form ref not available' });
        }
      } catch (error: any) {
        console.error('❌ SetupWizard: Personal info error:', error);
        saveResults.push({ step: 'Información Personal', success: false, error: error.message });
      }
      
      // 2) Guardar Preferencias
      try {
        if (currentPreferencesRef) {
          console.log('🔄 SetupWizard: Saving preferences...');
          const result = await currentPreferencesRef.saveData();
          console.log('✅ SetupWizard: Preferences result:', result);
          saveResults.push({ step: 'Preferencias', ...result });
        } else {
          console.warn('⚠️ SetupWizard: preferencesFormRef not available, using fallback...');
          const detectedTimezone = (() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch {
              return 'America/New_York';
            }
          })();
          
          const result = await updatePreferences({
            preferred_language: wizardData.preferences?.preferred_language || 'en',
            timezone: wizardData.preferences?.timezone || detectedTimezone,
          });
          saveResults.push({ step: 'Preferencias', ...result });
        }
      } catch (error: any) {
        console.error('❌ SetupWizard: Preferences error:', error);
        saveResults.push({ step: 'Preferencias', success: false, error: error.message });
      }
      
      // 3) Guardar datos de Conductor (si aplica)
      if (isDriver) {
        try {
          if (currentDriverInfoRef) {
            console.log('🔄 SetupWizard: Saving driver info...');
            const result = await currentDriverInfoRef.saveData();
            console.log('✅ SetupWizard: Driver info result:', result);
            saveResults.push({ step: 'Información del Conductor', ...result });
          } else {
            console.warn('⚠️ SetupWizard: driverInfoFormRef not available');
            saveResults.push({ step: 'Información del Conductor', success: false, error: 'Driver info form ref not available' });
          }
        } catch (error: any) {
          console.error('❌ SetupWizard: Driver info error:', error);
          saveResults.push({ step: 'Información del Conductor', success: false, error: error.message });
        }
      }
      
      // 4) Guardar datos de Empresa (si aplica)
      if (isCompanyOwner) {
        try {
          if (currentCompanySetupRef) {
            console.log('🔄 SetupWizard: Saving company info...');
            const result = await currentCompanySetupRef.saveData();
            console.log('✅ SetupWizard: Company info result:', result);
            saveResults.push({ 
              step: 'Información de la Empresa', 
              success: result, 
              error: result ? undefined : 'Error al guardar información de empresa'
            });
          } else {
            console.warn('⚠️ SetupWizard: companySetupRef not available');
            saveResults.push({ 
              step: 'Información de la Empresa', 
              success: false, 
              error: 'Company form ref not available'
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
        throw new Error(t('setup.error.inSteps') + '\n' + errorMessage);
      }
      
      console.log('🎉 SetupWizard: All data saved successfully');
      
      // Show success message
      showSuccess(
        t('setup.success.title'),
        t('setup.success.message')
      );
      
      // Call completion callback
      onComplete();
      
    } catch (error: any) {
      console.error('💥 SetupWizard: Error during setup completion:', error);
      showError(
        t('setup.error.title'),
        error.message || t('setup.error.message')
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
            {t('setup.description')}
          </DialogDescription>
        </VisuallyHidden>
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 border-b">
          <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-center">
            {t('setup.title')}
          </DialogTitle>
          <p className="text-sm sm:text-base text-muted-foreground text-center px-2">
            {t('setup.subtitle')}
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Progress Bar */}
          <div className="space-y-2 flex-shrink-0 p-4 sm:p-6 pb-3">
            <div className="flex justify-between text-sm">
              <span>{t('setup.progress')}</span>
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
                    <h3 className="text-lg font-semibold mb-2">{t('setup.saving')}</h3>
                    <p className="text-muted-foreground text-center">
                      {t('setup.savingDescription')}
                    </p>
                  </div>
              ) : (
                <div className="space-y-6">
                  {/* Always mount all forms but only show the current step */}
                  
                  {/* Personal Info Form - Always mounted */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">{t('setup.steps.personal.title')}</h3>
                      <p className="text-muted-foreground">
                        {t('setup.dataWillBeSaved')}
                      </p>
                    </div>
                    <PersonalInfoForm 
                      ref={personalInfoFormRef}
                      showCancelButton={false}
                      showSaveButton={false}
                      className="space-y-6"
                    />
                  </div>

                  {/* Preferences Form - Always mounted */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold mb-2">{t('setup.steps.preferences.configTitle')}</h3>
                      <p className="text-muted-foreground">
                        {t('setup.steps.preferences.autoDetected')} <strong>{wizardData.preferences.timezone}</strong>
                      </p>
                    </div>
                    <PreferencesForm 
                      ref={preferencesFormRef}
                      showCancelButton={false}
                      showSaveButton={false}
                      className="space-y-6"
                      useDetectedTimezone={true}
                    />
                  </div>

                  {/* Driver Info Form - Always mounted if driver */}
                  {isDriver && (
                    <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold mb-2">{t('setup.steps.driver.configTitle')}</h3>
                        <p className="text-muted-foreground">
                          {t('setup.steps.driver.configDescription')}
                        </p>
                      </div>
                    <DriverInfoForm 
                      ref={driverInfoFormRef}
                      showCancelButton={false}
                      showSaveButton={false}
                      className="space-y-6"
                    />
                    </div>
                  )}

                  {/* Company Setup Form - Always mounted if company owner */}
                  {isCompanyOwner && (
                    <div style={{ display: currentStep === (isDriver ? 3 : 2) ? 'block' : 'none' }}>
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold mb-2">{t('setup.steps.company.configTitle')}</h3>
                        <p className="text-muted-foreground">
                          {t('setup.steps.company.configDescription')}
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
                {t('setup.actions.previous')}
              </Button>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <Button variant="ghost" onClick={onClose} className="text-sm sm:text-base order-2 sm:order-1">
                  {t('setup.actions.skip')}
                </Button>
                <Button onClick={handleNext} className="text-sm sm:text-base order-1 sm:order-2">
                  {currentStep === steps.length - 1 ? t('setup.actions.finish') : t('setup.actions.next')}
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
  const { t } = useTranslation('onboarding');
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
      alert(t('setup.validation.completeFields'));
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
          t('setup.error.title'),
          "No se pudieron guardar los datos de la empresa. Inténtalo nuevamente."
        );
        return false;
      }

      console.log('✅ Company data saved successfully');
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-sm font-medium">{t('setup.company.fields.name')} *</Label>
          <Input
            id="company-name"
            type="text"
            placeholder={t('setup.company.fields.namePlaceholder')}
            value={companyData.name}
            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="dot-number" className="text-sm font-medium">{t('setup.company.fields.dotNumber')}</Label>
            <Input
              id="dot-number"
              type="text"
              placeholder={t('setup.company.fields.dotPlaceholder')}
              value={companyData.dotNumber}
              onChange={(e) => setCompanyData({ ...companyData, dotNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc-number" className="text-sm font-medium">{t('setup.company.fields.mcNumber')}</Label>
            <Input
              id="mc-number"
              type="text"
              placeholder={t('setup.company.fields.mcPlaceholder')}
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
            streetAddressLabel={t('setup.company.fields.address')}
            stateLabel={t('setup.company.fields.state')}
            cityLabel={t('setup.company.fields.city')}
            zipCodeLabel={t('setup.company.fields.zipCode')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="company-phone" className="text-sm font-medium">{t('setup.company.fields.phone')}</Label>
          <Input
            id="company-phone"
            type="tel"
            placeholder={t('setup.company.fields.phonePlaceholder')}
            value={companyData.phone}
            onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-email" className="text-sm font-medium">{t('setup.company.fields.email')}</Label>
          <Input
            id="company-email"
            type="email"
            placeholder={t('setup.company.fields.emailPlaceholder')}
            value={companyData.email}
            onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg">
        <p className="text-sm text-amber-800">
          ⚠️ <strong>Importante:</strong> {t('setup.steps.company.warning')}
        </p>
      </div>
    </div>
  );
});
