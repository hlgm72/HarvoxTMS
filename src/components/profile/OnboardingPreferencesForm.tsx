import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { OnboardingActions } from './OnboardingActions';
import { useTranslation } from 'react-i18next';

interface OnboardingActionsProps {
  className?: string;
}

export function OnboardingPreferencesForm({ className }: OnboardingActionsProps) {
  const { t } = useTranslation('settings');
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {t('onboarding.title')}
        </CardTitle>
        <CardDescription>
          {t('onboarding.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingActions />
      </CardContent>
    </Card>
  );
}