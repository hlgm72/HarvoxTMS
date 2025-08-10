import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { useOnboardingSteps } from './OnboardingSteps';
import { WelcomeModal } from './WelcomeModal';
import { OnboardingOverlay } from './OnboardingOverlay';
import { SetupWizard } from '../setup/SetupWizard';
import { SetupCompletedModal } from '../setup/SetupCompletedModal';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { shouldShowOnboarding, isLoading, markOnboardingCompleted, currentRole } = useOnboarding();
  const { shouldShowSetup, markSetupCompleted } = useSetupWizard();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showSetupCompleted, setShowSetupCompleted] = useState(false);
  const steps = useOnboardingSteps(currentRole);

  // Controlar el flujo de setup wizard con useEffect
  useEffect(() => {
    console.log('🎯 OnboardingProvider effect - DETAILED:');
    console.log('- shouldShowOnboarding:', shouldShowOnboarding);
    console.log('- shouldShowSetup:', shouldShowSetup);
    console.log('- showTour:', showTour);
    console.log('- showWelcome:', showWelcome);
    console.log('- showSetup:', showSetup);
    console.log('- isLoading:', isLoading);
    
    const canActivate = !shouldShowOnboarding && shouldShowSetup && !showTour && !showWelcome;
    console.log('- canActivateSetup:', canActivate);
    
    if (canActivate) {
      console.log('✅ Activating Setup Wizard NOW');
      setShowSetup(true);
    } else {
      console.log('❌ Setup NOT activated because:');
      console.log('  - onboardingStillShowing:', shouldShowOnboarding);
      console.log('  - setupNotNeeded:', !shouldShowSetup);
      console.log('  - tourActive:', showTour);
      console.log('  - welcomeActive:', showWelcome);
    }
  }, [shouldShowOnboarding, shouldShowSetup, showTour, showWelcome, isLoading]);

  // No mostrar nada mientras carga
  if (isLoading) {
    return <>{children}</>;
  }

  // No mostrar onboarding/setup si AMBOS están completados Y no hay modal de completado activo
  if (!shouldShowOnboarding && !shouldShowSetup && !showSetupCompleted) {
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
    console.log('🎯 Setup completed - showing completion modal');
    setShowSetup(false);
    markSetupCompleted();
    
    // Mostrar modal de configuración completada
    setShowSetupCompleted(true);
    console.log('✅ SetupCompleted modal activated');
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
      console.log('⏰ Auto-closing setup completed modal');
      setShowSetupCompleted(false);
    }, 5000);
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    markSetupCompleted(); // Marcar como completado aunque se haya saltado
  };

  const handleSetupCompletedClose = () => {
    setShowSetupCompleted(false);
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

      {/* Modal de Configuración Completada */}
      <SetupCompletedModal
        isOpen={showSetupCompleted}
        onClose={handleSetupCompletedClose}
      />
    </>
  );
}