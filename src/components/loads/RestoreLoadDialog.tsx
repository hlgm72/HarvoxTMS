import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface RestoreLoadDialogProps {
  open: boolean;
  loadNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreLoadDialog({
  open,
  loadNumber,
  onConfirm,
  onCancel,
}: RestoreLoadDialogProps) {
  const { t } = useTranslation(['loads']);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('list.restore_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('list.restore_dialog.description_edit', { loadNumber })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {t('list.restore_dialog.cancel')}
          </Button>
          <Button onClick={onConfirm}>
            {t('list.restore_dialog.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
