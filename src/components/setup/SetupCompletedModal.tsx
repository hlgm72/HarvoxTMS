import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { CheckCircle } from 'lucide-react';

interface SetupCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function SetupCompletedModal({ isOpen, onClose, userRole }: SetupCompletedModalProps) {
  console.log('🎯 SetupCompletedModal render - isOpen:', isOpen);
  
  const isDriver = userRole === 'driver';
  const isOwner = userRole === 'company_owner' || userRole === 'owner';
  
  const getWelcomeMessage = () => {
    if (isDriver) {
      return {
        title: '¡Configuración Completada!',
        description: 'Tu perfil de conductor está completamente configurado. Ya puedes comenzar a recibir y gestionar tus cargas asignadas.',
        welcomeText: '🚛 ¡Bienvenido conductor!'
      };
    } else if (isOwner) {
      return {
        title: '¡Configuración Completada!',
        description: 'Tu cuenta está completamente configurada. Ya puedes comenzar a gestionar tu flota de manera eficiente con FleetNest.',
        welcomeText: '🚀 ¡Bienvenido a FleetNest!'
      };
    } else {
      return {
        title: '¡Configuración Completada!',
        description: 'Tu cuenta está configurada. Ya puedes comenzar a usar FleetNest.',
        welcomeText: '🚀 ¡Bienvenido a FleetNest!'
      };
    }
  };

  const welcomeMessage = getWelcomeMessage();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <VisuallyHidden>
          <DialogTitle>Configuración Completada</DialogTitle>
        </VisuallyHidden>
        <DialogDescription className="hidden">
          Modal que confirma que la configuración inicial ha sido completada exitosamente
        </DialogDescription>
        <div className="text-center py-12 px-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {welcomeMessage.title}
          </h2>
          
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            {welcomeMessage.description}
          </p>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
            <p className="text-sm text-primary font-medium">
              {welcomeMessage.welcomeText}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}