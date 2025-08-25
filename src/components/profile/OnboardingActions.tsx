import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFleetNotifications } from '@/components/notifications';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { Play, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface OnboardingActionsProps {
  className?: string;
}

export function OnboardingActions({ className }: OnboardingActionsProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const { resetOnboarding } = useOnboarding();
  const { resetSetup, markSetupCompleted } = useSetupWizard();
  const { user, currentRole } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const { t } = useTranslation('settings');

  const handleResetOnboarding = async () => {
    if (!user || !currentRole) {
      showError(t('onboarding.actions.error_title'), t('onboarding.actions.error_message'));
      return;
    }

    setResetting(true);
    try {
      resetOnboarding();
      showSuccess(
        t('onboarding.actions.tour_reset_title'),
        t('onboarding.actions.tour_reset_message')
      );
    } catch (error: any) {
      showError(
        t('onboarding.actions.reset_error_title'),
        error.message || t('onboarding.actions.tour_reset_error')
      );
    } finally {
      setResetting(false);
    }
  };

  const handleShowSetup = () => {
    if (!user || !currentRole) {
      showError(t('onboarding.actions.error_title'), t('onboarding.actions.error_message'));
      return;
    }
    setShowSetupWizard(true);
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    markSetupCompleted();
    showSuccess(
      t('onboarding.actions.setup_reset_title'),
      'Setup wizard completed successfully!'
    );
  };

  const handleSetupClose = () => {
    setShowSetupWizard(false);
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
            {resetting ? t('onboarding.actions.resetting') : t('onboarding.actions.view_tour')}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleShowSetup}
            disabled={resetting}
            className="flex-1"
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('onboarding.actions.view_setup')}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>{t('onboarding.note_label')}</strong> {t('onboarding.note')}
        </div>
      </div>

      {/* Setup Wizard Modal */}
      <SetupWizard
        isOpen={showSetupWizard}
        onClose={handleSetupClose}
        onComplete={handleSetupComplete}
        userRole={currentRole || 'driver'}
      />
    </div>
  );
}