import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { shouldShowOnboarding, isLoading, markOnboardingCompleted, currentRole } = useOnboarding();
  const { shouldShowSetup, markSetupCompleted } = useSetupWizard();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showSetupCompleted, setShowSetupCompleted] = useState(false);
  const steps = useOnboardingSteps(currentRole);

  // Controlar el flujo de setup wizard con useEffect
  useEffect(() => {
    const canActivate = !shouldShowOnboarding && shouldShowSetup && !showTour && !showWelcome;
    
    if (canActivate) {
      setShowSetup(true);
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
    // Navegar al dashboard al cerrar la bienvenida
    navigate('/');
  };

  const handleCloseTour = () => {
    setShowTour(false);
    markOnboardingCompleted(false); // Marcar como completado
    // Navegar al dashboard al completar el tour
    navigate('/');
  };

  const handleSetupComplete = () => {
    console.log('🎯 Setup completed - showing completion modal');
    setShowSetup(false);
    markSetupCompleted();
    
    // Mostrar modal de configuración completada
    setShowSetupCompleted(true);
    console.log('✅ SetupCompleted modal activated');
    
    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
      console.log('⏰ Auto-closing setup completed modal');
      setShowSetupCompleted(false);
    }, 10000);
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