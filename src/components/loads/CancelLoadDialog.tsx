import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface CancelLoadDialogProps {
  isOpen: boolean;
  loadNumber: string;
  onConfirm: (cancellationNote: string) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function CancelLoadDialog({
  isOpen,
  loadNumber,
  onConfirm,
  onCancel,
  isPending = false,
}: CancelLoadDialogProps) {
  const { t } = useTranslation(['loads']);
  const [cancellationNote, setCancellationNote] = useState('');

  const handleConfirm = () => {
    onConfirm(cancellationNote.trim());
    setCancellationNote(''); // Reset para próxima vez
  };

  const handleCancel = () => {
    setCancellationNote(''); // Reset al cancelar
    onCancel();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('list.cancel_dialog.title', { loadNumber })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('list.cancel_dialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="cancellation-note">
            {t('list.cancel_dialog.note_label')}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="cancellation-note"
            placeholder={t('list.cancel_dialog.note_placeholder')}
            value={cancellationNote}
            onChange={(e) => setCancellationNote(e.target.value)}
            disabled={isPending}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            {t('list.cancel_dialog.note_help')}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={handleCancel}>
            {t('list.cancel_dialog.cancel_button')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending || !cancellationNote.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t('list.cancel_dialog.cancelling') : t('list.cancel_dialog.confirm_button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
