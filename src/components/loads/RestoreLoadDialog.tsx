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
          <AlertDialogTitle>Restaurar Carga</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas restaurar la carga <strong>{loadNumber}</strong>?
            <br />
            <br />
            La carga será reactivada con estado "En Tránsito" y se recalculará el payroll del conductor si está asignada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="restore-notes">Notas (opcional)</Label>
          <Textarea
            id="restore-notes"
            placeholder="Razón de la restauración..."
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
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Restaurando...' : 'Restaurar Carga'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
