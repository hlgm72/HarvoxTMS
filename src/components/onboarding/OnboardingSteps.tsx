import React from 'react';
import { Users, Truck, FileText, BarChart3, Settings, MapPin, CreditCard, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

  const commonSteps = [
    {
      id: 'dashboard',
      title: 'Centro de Comando',
      description: 'Tu panel principal donde puedes ver el estado general de tu flota',
      content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Estadísticas en Tiempo Real</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Visualiza métricas importantes de tu operación
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Mapa de Seguimiento</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ubicación en tiempo real de tu flota
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
        title: 'Gestión de Usuarios',
        description: 'Administra tu equipo: conductores, despachadores y gerentes',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Invitar Usuarios</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Añade conductores y personal administrativo
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Puedes asignar diferentes roles y permisos a cada usuario
            </div>
          </div>
        ),
        action: {
          label: 'Ver Gestión de Usuarios',
          onClick: () => navigate('/users')
        }
      },
      {
        id: 'equipment',
        title: 'Flota de Vehículos',
        description: 'Registra y gestiona todos tus vehículos y equipos',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Registro de Vehículos</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Añade tractocamiones, remolques y equipos
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Registra información de mantenimiento y documentos
            </div>
          </div>
        ),
        action: {
          label: 'Gestionar Equipos',
          onClick: () => navigate('/equipment')
        }
      },
      {
        id: 'financial',
        title: 'Sistema de Pagos',
        description: 'Configura pagos a conductores y gestiona deducciones',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Períodos de Pago</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Automatiza el cálculo de pagos por períodos
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Puedes configurar deducciones automáticas y reportes
            </div>
          </div>
        ),
        action: {
          label: 'Ver Sistema de Pagos',
          onClick: () => navigate('/payments')
        }
      }
    ],
    operations_manager: [
      ...commonSteps,
      {
        id: 'loads',
        title: 'Gestión de Cargas',
        description: 'Administra entregas, asigna cargas y supervisa el progreso',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Crear Cargas</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Registra nuevas entregas con todos los detalles
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Asigna cargas a conductores y rastrea su progreso
            </div>
          </div>
        ),
        action: {
          label: 'Gestionar Cargas',
          onClick: () => navigate('/loads')
        }
      },
      {
        id: 'tracking',
        title: 'Rastreo de Flota',
        description: 'Monitorea la ubicación y estado de todos tus vehículos',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Ubicación en Tiempo Real</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ve dónde están todos tus vehículos
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Recibe alertas de demoras o desvíos de ruta
            </div>
          </div>
        )
      }
    ],
    dispatcher: [
      ...commonSteps,
      {
        id: 'dispatch',
        title: 'Despacho de Cargas',
        description: 'Asigna cargas a conductores y coordina entregas',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Asignación de Cargas</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Conecta cargas con conductores disponibles
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Verifica la disponibilidad antes de asignar
            </div>
          </div>
        ),
        action: {
          label: 'Ver Cargas',
          onClick: () => navigate('/loads')
        }
      },
      {
        id: 'drivers',
        title: 'Gestión de Conductores',
        description: 'Supervisa y comunícate con tu equipo de conductores',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Estado de Conductores</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ve quién está disponible, en ruta o descansando
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Mantén comunicación constante para optimizar operaciones
            </div>
          </div>
        ),
        action: {
          label: 'Ver Conductores',
          onClick: () => navigate('/drivers')
        }
      }
    ],
    driver: [
      {
        id: 'mobile-dashboard',
        title: 'Tu Panel de Conductor',
        description: 'Accede a todas tus herramientas desde cualquier dispositivo',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Cargas Asignadas</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ve tus entregas pendientes y en progreso
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Actualiza el estado de tus cargas en tiempo real
            </div>
          </div>
        )
      },
      {
        id: 'documents',
        title: 'Documentos de Carga',
        description: 'Accede a manifiestos, permisos y documentación necesaria',
        content: (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-sm sm:text-base">Documentación Digital</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Todo lo que necesitas para tus entregas
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Descarga documentos antes de salir sin conexión
            </div>
          </div>
        ),
        action: {
          label: 'Ver Documentos',
          onClick: () => navigate('/documents')
        }
      }
    ]
  };

  return roleSpecificSteps[userRole as keyof typeof roleSpecificSteps] || roleSpecificSteps.driver;
}