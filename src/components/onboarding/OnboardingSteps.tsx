import React from 'react';
import { Users, Truck, FileText, BarChart3, Settings, MapPin, CreditCard, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Hook para obtener pasos según el rol
export function useOnboardingSteps(userRole: string): OnboardingStep[] {
  const navigate = useNavigate();
  const { t } = useTranslation('onboarding');

  const commonSteps = [
    {
      id: 'dashboard',
      title: t('tour.steps.dashboard.title'),
      description: t('tour.steps.dashboard.description'),
      content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.dashboard.stats')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.dashboard.statsDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.dashboard.tracking')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.dashboard.trackingDesc')}
                </p>
              </div>
            </div>
          </div>
      )
    }
  ];

  const roleSpecificSteps = {
    company_owner: [
      ...commonSteps,
      {
        id: 'users',
        title: t('tour.steps.users.title'),
        description: t('tour.steps.users.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.users.invite')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.users.inviteDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.users.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.users.action'),
          onClick: () => navigate('/users')
        }
      },
      {
        id: 'equipment',
        title: t('tour.steps.equipment.title'),
        description: t('tour.steps.equipment.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.equipment.register')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.equipment.registerDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.equipment.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.equipment.action'),
          onClick: () => navigate('/equipment')
        }
      },
      {
        id: 'financial',
        title: t('tour.steps.financial.title'),
        description: t('tour.steps.financial.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.financial.periods')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.financial.periodsDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.financial.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.financial.action'),
          onClick: () => navigate('/payments')
        }
      }
    ],
    operations_manager: [
      ...commonSteps,
      {
        id: 'loads',
        title: t('tour.steps.loads.title'),
        description: t('tour.steps.loads.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.loads.create')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.loads.createDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.loads.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.loads.action'),
          onClick: () => navigate('/loads')
        }
      },
      {
        id: 'tracking',
        title: t('tour.steps.tracking.title'),
        description: t('tour.steps.tracking.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.tracking.realtime')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.tracking.realtimeDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.tracking.tip')}</strong>
            </div>
          </div>
        )
      }
    ],
    dispatcher: [
      ...commonSteps,
      {
        id: 'dispatch',
        title: t('tour.steps.dispatch.title'),
        description: t('tour.steps.dispatch.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.dispatch.assignment')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.dispatch.assignmentDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.dispatch.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.dispatch.action'),
          onClick: () => navigate('/loads')
        }
      },
      {
        id: 'drivers',
        title: t('tour.steps.drivers.title'),
        description: t('tour.steps.drivers.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.drivers.status')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.drivers.statusDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.drivers.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.drivers.action'),
          onClick: () => navigate('/drivers')
        }
      }
    ],
    driver: [
      {
        id: 'mobile-dashboard',
        title: t('tour.steps.mobileDashboard.title'),
        description: t('tour.steps.mobileDashboard.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.mobileDashboard.assigned')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.mobileDashboard.assignedDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.mobileDashboard.tip')}</strong>
            </div>
          </div>
        )
      },
      {
        id: 'documents',
        title: t('tour.steps.documents.title'),
        description: t('tour.steps.documents.description'),
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">{t('tour.steps.documents.digital')}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('tour.steps.documents.digitalDesc')}
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>{t('tour.steps.documents.tip')}</strong>
            </div>
          </div>
        ),
        action: {
          label: t('tour.steps.documents.action'),
          onClick: () => navigate('/documents')
        }
      }
    ]
  };

  return roleSpecificSteps[userRole as keyof typeof roleSpecificSteps] || roleSpecificSteps.driver;
}