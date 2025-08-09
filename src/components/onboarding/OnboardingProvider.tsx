import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useOnboardingSteps } from './OnboardingSteps';
import { WelcomeModal } from './WelcomeModal';
import { OnboardingOverlay } from './OnboardingOverlay';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { shouldShowOnboarding, isLoading, markOnboardingCompleted, currentRole } = useOnboarding();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const steps = useOnboardingSteps(currentRole);

  // No mostrar nada mientras carga
  if (isLoading) {
    return <>{children}</>;
  }

  // No mostrar onboarding si no debe mostrarse
  if (!shouldShowOnboarding) {
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

  return (
    <>
      {children}
      
      {/* Modal de Bienvenida */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        onStartTour={handleStartTour}
        userRole={currentRole}
      />

      {/* Tour Guiado */}
      <OnboardingOverlay
        isOpen={showTour}
        onClose={handleCloseTour}
        steps={steps}
        currentRole={currentRole}
      />
    </>
  );
}