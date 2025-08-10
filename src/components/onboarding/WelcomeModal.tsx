import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Truck, FileText, BarChart3, Settings, MapPin } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  userRole: string;
}

const roleFeatures = {
  company_owner: [
    { icon: Users, title: 'Gestión de Usuarios', description: 'Administra conductores y personal' },
    { icon: Truck, title: 'Control de Flota', description: 'Supervisa todos los vehículos' },
    { icon: BarChart3, title: 'Reportes Financieros', description: 'Analiza ingresos y gastos' },
    { icon: Settings, title: 'Configuración', description: 'Personaliza tu empresa' }
  ],
  operations_manager: [
    { icon: MapPin, title: 'Rastreo en Tiempo Real', description: 'Monitorea la ubicación de tu flota' },
    { icon: FileText, title: 'Gestión de Cargas', description: 'Asigna y supervisa entregas' },
    { icon: Truck, title: 'Estado de Vehículos', description: 'Controla mantenimiento y disponibilidad' },
    { icon: BarChart3, title: 'Análisis Operativo', description: 'Optimiza rutas y tiempos' }
  ],
  dispatcher: [
    { icon: MapPin, title: 'Despacho de Cargas', description: 'Asigna cargas a conductores' },
    { icon: FileText, title: 'Documentación', description: 'Gestiona permisos y documentos' },
    { icon: Users, title: 'Comunicación', description: 'Coordina con conductores' },
    { icon: Truck, title: 'Seguimiento', description: 'Monitorea entregas en curso' }
  ],
  driver: [
    { icon: MapPin, title: 'Navegación', description: 'Rutas optimizadas para tus entregas' },
    { icon: FileText, title: 'Documentos de Carga', description: 'Accede a manifiestos y permisos' },
    { icon: Truck, title: 'Estado del Vehículo', description: 'Reporta inspecciones y problemas' },
    { icon: BarChart3, title: 'Historial de Viajes', description: 'Revisa tus entregas completadas' }
  ]
};

const roleNames = {
  company_owner: 'Propietario de Empresa',
  operations_manager: 'Gerente de Operaciones',
  dispatcher: 'Despachador',
  driver: 'Conductor'
};

export function WelcomeModal({ isOpen, onClose, onStartTour, userRole }: WelcomeModalProps) {
  const features = roleFeatures[userRole as keyof typeof roleFeatures] || roleFeatures.driver;
  const roleName = roleNames[userRole as keyof typeof roleNames] || 'Usuario';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <VisuallyHidden>
          <DialogDescription>
            Modal de bienvenida que introduce las funciones principales de FleetNest
          </DialogDescription>
        </VisuallyHidden>
        <DialogHeader>
          <div className="text-center mb-4 sm:mb-6">
            <div className="flex justify-center mb-3 sm:mb-4">
              <AppLogo width={60} height={60} className="sm:w-20 sm:h-20" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
              ¡Bienvenido a FleetNest!
            </DialogTitle>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground px-2">
              Tu plataforma completa de gestión de flotas como <span className="font-semibold text-primary">{roleName}</span>
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features Grid */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center">
              Funciones principales para tu rol
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
                <h3 className="text-base sm:text-lg font-semibold mb-2">¿Sabías que FleetNest te ayuda a...</h3>
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
              Explorar por mi cuenta
            </Button>
            <Button onClick={onStartTour} className="px-4 sm:px-8 text-sm sm:text-base">
              Comenzar tour guiado
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