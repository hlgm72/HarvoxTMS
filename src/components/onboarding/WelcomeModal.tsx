import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Truck, FileText, BarChart3, Settings, MapPin } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useTranslation } from 'react-i18next';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  userRole: string;
}

export function WelcomeModal({ isOpen, onClose, onStartTour, userRole }: WelcomeModalProps) {
  const { t } = useTranslation('onboarding');

  const roleFeatures = {
    company_owner: [
      { icon: Users, title: t('welcome.features.company_owner.drivers.title'), description: t('welcome.features.company_owner.drivers.description') },
      { icon: Truck, title: t('welcome.features.company_owner.fleet.title'), description: t('welcome.features.company_owner.fleet.description') },
      { icon: BarChart3, title: t('welcome.features.company_owner.analytics.title'), description: t('welcome.features.company_owner.analytics.description') },
      { icon: Settings, title: t('welcome.features.company_owner.loads.title'), description: t('welcome.features.company_owner.loads.description') }
    ],
    operations_manager: [
      { icon: MapPin, title: t('welcome.features.company_owner.fleet.title'), description: t('welcome.features.company_owner.fleet.description') },
      { icon: FileText, title: t('welcome.features.company_owner.loads.title'), description: t('welcome.features.company_owner.loads.description') },
      { icon: Truck, title: t('welcome.features.driver.vehicle.title'), description: t('welcome.features.driver.vehicle.description') },
      { icon: BarChart3, title: t('welcome.features.company_owner.analytics.title'), description: t('welcome.features.company_owner.analytics.description') }
    ],
    dispatcher: [
      { icon: MapPin, title: t('welcome.features.company_owner.loads.title'), description: t('welcome.features.company_owner.loads.description') },
      { icon: FileText, title: t('welcome.features.driver.documents.title'), description: t('welcome.features.driver.documents.description') },
      { icon: Users, title: t('welcome.features.driver.communication.title'), description: t('welcome.features.driver.communication.description') },
      { icon: Truck, title: t('welcome.features.driver.trips.title'), description: t('welcome.features.driver.trips.description') }
    ],
    driver: [
      { icon: MapPin, title: t('welcome.features.driver.trips.title'), description: t('welcome.features.driver.trips.description') },
      { icon: FileText, title: t('welcome.features.driver.documents.title'), description: t('welcome.features.driver.documents.description') },
      { icon: Truck, title: t('welcome.features.driver.vehicle.title'), description: t('welcome.features.driver.vehicle.description') },
      { icon: BarChart3, title: t('welcome.features.driver.trips.title'), description: t('welcome.features.driver.trips.description') }
    ]
  };

  const features = roleFeatures[userRole as keyof typeof roleFeatures] || roleFeatures.driver;
  const roleName = t(`welcome.roleTitle.${userRole}`) || t('welcome.roleTitle.default');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <VisuallyHidden>
          <DialogDescription>
            {t('welcome.subtitle')}
          </DialogDescription>
        </VisuallyHidden>
        <DialogHeader>
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <AppLogo width={60} height={60} className="sm:w-20 sm:h-20" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
              {t('welcome.title')}
            </DialogTitle>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground px-2">
              {t('welcome.subtitle')} <span className="font-semibold text-primary">{roleName}</span>
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features Grid */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center">
              {t('welcome.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold mb-1 text-sm sm:text-base">{feature.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold mb-2">{t('welcome.stats.title')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">30%</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Reducir costos operativos</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">25%</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Mejorar eficiencia de rutas</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">40%</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Ahorrar tiempo administrativo</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Button variant="outline" onClick={onClose} className="px-4 sm:px-8 text-sm sm:text-base">
              {t('welcome.actions.close')}
            </Button>
            <Button onClick={onStartTour} className="px-4 sm:px-8 text-sm sm:text-base">
              {t('welcome.actions.startTour')}
            </Button>
          </div>

          <p className="text-center text-xs sm:text-sm text-muted-foreground px-2">
            Puedes acceder a este tutorial en cualquier momento desde el menú de ayuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}