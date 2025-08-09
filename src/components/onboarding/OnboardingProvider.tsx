import React, { useState } from 'react';
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

  // No mostrar nada mientras carga
  if (isLoading) {
    return <>{children}</>;
  }

  // Mostrar setup wizard si debe mostrarse y no está en onboarding
  if (!shouldShowOnboarding && shouldShowSetup) {
    setShowSetup(true);
  }

  // No mostrar onboarding si no debe mostrarse
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
    // Verificar si debe mostrar setup después
    if (shouldShowSetup) {
      setShowSetup(true);
    }
  };

  const handleCloseTour = () => {
    setShowTour(false);
    markOnboardingCompleted(false); // Marcar como completado
    // Mostrar setup wizard después del onboarding
    if (shouldShowSetup) {
      setShowSetup(true);
    }
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