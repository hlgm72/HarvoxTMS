import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';

interface SetupCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupCompletedModal({ isOpen, onClose }: SetupCompletedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <div className="text-center py-12 px-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-3">
            ¡Configuración Completada!
          </h2>
          
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            Tu cuenta está completamente configurada. Ya puedes comenzar a gestionar tu flota de manera eficiente con FleetNest.
          </p>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
            <p className="text-sm text-primary font-medium">
              🚀 ¡Bienvenido a FleetNest!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}