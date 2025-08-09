import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { useOnboardingSteps } from './OnboardingSteps';
import { WelcomeModal } from './WelcomeModal';
import { OnboardingOverlay } from './OnboardingOverlay';
import { SetupWizard } from '../setup/SetupWizard';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { shouldShowOnboarding, isLoading, markOnboardingCompleted, currentRole } = useOnboarding();
  const { shouldShowSetup, markSetupCompleted } = useSetupWizard();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const steps = useOnboardingSteps(currentRole);

  // Controlar el flujo de setup wizard con useEffect
  useEffect(() => {
    console.log('🎯 OnboardingProvider effect:', {
      shouldShowOnboarding,
      shouldShowSetup,
      showTour,
      showWelcome,
      shouldActivateSetup: !shouldShowOnboarding && shouldShowSetup && !showTour && !showWelcome
    });
    
    if (!shouldShowOnboarding && shouldShowSetup && !showTour && !showWelcome) {
      console.log('✅ Activating Setup Wizard');
      setShowSetup(true);
    }
  }, [shouldShowOnboarding, shouldShowSetup, showTour, showWelcome]);

  // No mostrar nada mientras carga
  if (isLoading) {
    return <>{children}</>;
  }

  // No mostrar onboarding/setup si AMBOS están completados
  if (!shouldShowOnboarding && !shouldShowSetup) {
    return <>{children}</>;
  }

  const handleStartTour = () => {
    setShowWelcome(false);
    setShowTour(true);
  };

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    markOnboardingCompleted(true); // Marcar como saltado
  };

  const handleCloseTour = () => {
    setShowTour(false);
    markOnboardingCompleted(false); // Marcar como completado
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    markSetupCompleted();
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    markSetupCompleted(); // Marcar como completado aunque se haya saltado
  };

  return (
    <>
      {children}
      
      {/* Modal de Bienvenida */}
      {shouldShowOnboarding && (
        <WelcomeModal
          isOpen={showWelcome}
          onClose={handleCloseWelcome}
          onStartTour={handleStartTour}
          userRole={currentRole}
        />
      )}

      {/* Tour Guiado */}
      {shouldShowOnboarding && (
        <OnboardingOverlay
          isOpen={showTour}
          onClose={handleCloseTour}
          steps={steps}
          currentRole={currentRole}
        />
      )}

      {/* Setup Wizard */}
      <SetupWizard
        isOpen={showSetup}
        onClose={handleSetupClose}
        onComplete={handleSetupComplete}
        userRole={currentRole}
      />
    </>
  );
}