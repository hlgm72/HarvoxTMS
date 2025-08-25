import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { SetupProvider, useSetup } from '@/contexts/SetupContext';
import { PersonalInfoStepWrapper } from './steps/PersonalInfoStepWrapper';
import { PreferencesStepWrapper } from './steps/PreferencesStepWrapper';
import { DriverInfoStepWrapper } from './steps/DriverInfoStepWrapper';

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userRole: string;
}

const STEPS = [
  { id: 1, title: 'Información Personal', component: PersonalInfoStepWrapper },
  { id: 2, title: 'Preferencias', component: PreferencesStepWrapper },
  { id: 3, title: 'Información del Conductor', component: DriverInfoStepWrapper }
];

function SetupWizardContent({ onClose, onComplete }: Omit<SetupWizardProps, 'isOpen' | 'userRole'>) {
  const { currentStep, setCurrentStep, saveAllData, isLoading, setupData } = useSetup();

  const currentStepData = STEPS.find(step => step.id === currentStep);
  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const handleComplete = async () => {
    console.log('🎯 Setup wizard completing...');
    
    try {
      const success = await saveAllData();
      if (success) {
        onComplete();
      }
    } catch (error) {
      console.error('❌ Error completing setup:', error);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return setupData.firstName && setupData.lastName && setupData.email;
      case 2:
        return setupData.language && setupData.theme && setupData.timezone;
      case 3:
        return setupData.licenseNumber && setupData.licenseState;
      default:
        return true;
    }
  };

  if (!currentStepData) return null;

  const CurrentStepComponent = currentStepData.component;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-center">
          Configuración Inicial - {currentStepData.title}
        </DialogTitle>
      </DialogHeader>

      {/* Progress Bar */}
      <div className="space-y-2 mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Paso {currentStep} de {STEPS.length}</span>
          <span>{Math.round(progress)}% completado</span>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2 sm:space-x-4">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={`flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 border ${
                step.id === currentStep
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : step.id < currentStep
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {step.id < currentStep ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted text-muted-foreground text-xs sm:text-sm font-medium">
                  {step.id}
                </span>
              )}
              <span className="hidden sm:inline text-sm">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="min-h-[400px] bg-card rounded-lg border p-6">
        <CurrentStepComponent />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || isLoading}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>

        <Button
          onClick={handleNext}
          disabled={isLoading || !canProceed()}
          className="flex items-center space-x-2"
        >
          <span>
            {currentStep === STEPS.length ? 'Finalizar' : 'Siguiente'}
          </span>
          {currentStep < STEPS.length && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </DialogContent>
  );
}

export function SetupWizard({ isOpen, onClose, onComplete, userRole }: SetupWizardProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <SetupProvider>
        <SetupWizardContent onClose={onComplete} onComplete={onComplete} />
      </SetupProvider>
    </Dialog>
  );
}