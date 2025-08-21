import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SetupCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function SetupCompletedModal({ isOpen, onClose, userRole }: SetupCompletedModalProps) {
  const { t } = useTranslation('onboarding');
  console.log('🎯 SetupCompletedModal render - isOpen:', isOpen);
  
  const getMessage = () => {
    return t(`setup.completion.message.${userRole}`) || t('setup.completion.message.default');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <VisuallyHidden>
          <DialogTitle>{t('setup.completion.title')}</DialogTitle>
        </VisuallyHidden>
        <DialogDescription className="hidden">
          {t('setup.completion.subtitle')}
        </DialogDescription>
        <div className="text-center py-12 px-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {t('setup.completion.title')}
          </h2>
          
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            {t('setup.completion.subtitle')}
          </p>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
            <p className="text-sm text-primary font-medium">
              {getMessage()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}