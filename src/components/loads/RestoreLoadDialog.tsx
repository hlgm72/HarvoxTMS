import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface RestoreLoadDialogProps {
  open: boolean;
  loadNumber: string;
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function RestoreLoadDialog({
  open,
  loadNumber,
  onConfirm,
  onCancel,
  isPending,
}: RestoreLoadDialogProps) {
  const { t } = useTranslation(['loads']);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const handleCancel = () => {
    onCancel();
    setNotes('');
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('list.restore_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('list.restore_dialog.description')} <strong>{loadNumber}</strong>?
            <br />
            <br />
            {t('list.restore_dialog.description_2')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="restore-notes">{t('list.restore_dialog.notes_label')}</Label>
          <Textarea
            id="restore-notes"
            placeholder={t('list.restore_dialog.notes_placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            {t('list.restore_dialog.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? t('list.restore_dialog.confirming') : t('list.restore_dialog.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
