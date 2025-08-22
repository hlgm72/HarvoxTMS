import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { OnboardingActions } from './OnboardingActions';

interface OnboardingActionsProps {
  className?: string;
}

export function OnboardingPreferencesForm({ className }: OnboardingActionsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Tour y Configuración Inicial
        </CardTitle>
        <CardDescription>
          ¿Necesitas volver a ver el tour de bienvenida o el asistente de configuración? Puedes reactivarlos aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingActions />
      </CardContent>
    </Card>
  );
}