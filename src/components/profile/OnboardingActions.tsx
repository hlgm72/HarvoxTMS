import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFleetNotifications } from '@/components/notifications';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { Play, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingActionsProps {
  className?: string;
}

export function OnboardingActions({ className }: OnboardingActionsProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const { resetOnboarding } = useOnboarding();
  const { resetSetup } = useSetupWizard();
  const { user, currentRole } = useAuth();
  const [resetting, setResetting] = useState(false);

  const handleResetOnboarding = async () => {
    if (!user || !currentRole) {
      showError("Error", "No se pudo identificar el usuario.");
      return;
    }

    setResetting(true);
    try {
      resetOnboarding();
      showSuccess(
        "Onboarding reiniciado",
        "El tour de bienvenida se mostrará la próxima vez que recargues la página."
      );
    } catch (error: any) {
      showError(
        "Error al reiniciar",
        error.message || "No se pudo reiniciar el onboarding."
      );
    } finally {
      setResetting(false);
    }
  };

  const handleResetSetup = async () => {
    if (!user || !currentRole) {
      showError("Error", "No se pudo identificar el usuario.");
      return;
    }

    setResetting(true);
    try {
      resetSetup();
      showSuccess(
        "Configuración reiniciada",
        "El asistente de configuración se mostrará la próxima vez que recargues la página."
      );
    } catch (error: any) {
      showError(
        "Error al reiniciar",
        error.message || "No se pudo reiniciar la configuración."
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleResetOnboarding}
            disabled={resetting}
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            {resetting ? 'Reiniciando...' : 'Ver Tour de Bienvenida'}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleResetSetup}
            disabled={resetting}
            className="flex-1"
          >
            <Settings className="mr-2 h-4 w-4" />
            {resetting ? 'Reiniciando...' : 'Ver Asistente de Configuración'}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Nota:</strong> Los cambios se aplicarán cuando recargues la página. El tour y la configuración inicial solo se muestran una vez por defecto.
        </div>
      </div>
    </div>
  );
}