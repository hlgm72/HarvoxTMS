import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Truck, FileText, BarChart3, Settings, MapPin } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <AppLogo width={80} height={80} />
            </div>
            <DialogTitle className="text-3xl font-bold mb-2">
              ¡Bienvenido a FleetNest!
            </DialogTitle>
            <p className="text-lg text-muted-foreground">
              Tu plataforma completa de gestión de flotas como <span className="font-semibold text-primary">{roleName}</span>
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features Grid */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">
              Funciones principales para tu rol
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">¿Sabías que FleetNest te ayuda a...</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">30%</div>
                    <div className="text-sm text-muted-foreground">Reducir costos operativos</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">25%</div>
                    <div className="text-sm text-muted-foreground">Mejorar eficiencia de rutas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">40%</div>
                    <div className="text-sm text-muted-foreground">Ahorrar tiempo administrativo</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button variant="outline" onClick={onClose} className="px-8">
              Explorar por mi cuenta
            </Button>
            <Button onClick={onStartTour} className="px-8">
              Comenzar tour guiado
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Puedes acceder a este tutorial en cualquier momento desde el menú de ayuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}