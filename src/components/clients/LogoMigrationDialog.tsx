import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Download, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useLogoMigration } from "@/hooks/useLogoMigration";

interface LogoMigrationDialogProps {
  trigger?: React.ReactNode;
}

export function LogoMigrationDialog({ trigger }: LogoMigrationDialogProps) {
  const [open, setOpen] = useState(false);
  const { migrateClearbitLogos, isMigrating, result, clearResult } = useLogoMigration();

  const handleMigration = async () => {
    await migrateClearbitLogos();
  };

  const handleClose = () => {
    setOpen(false);
    clearResult();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Migrar Logos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Migrar Logos al Storage Local</DialogTitle>
          <DialogDescription>
            Esta acción descargará todos los logos de Clearbit y los almacenará en el storage local
            para eliminar la dependencia externa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Esta migración:
                <ul className="list-disc ml-4 mt-2">
                  <li>Descargará las imágenes de Clearbit</li>
                  <li>Las almacenará en el bucket client-logos</li>
                  <li>Actualizará las URLs en la base de datos</li>
                  <li>Eliminará la dependencia externa</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-3">
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <strong>{result.message}</strong>
                </AlertDescription>
              </Alert>

              {result.results && (
                <div className="text-sm space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-medium">{result.results.total}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600">{result.results.migrated}</div>
                      <div className="text-muted-foreground">Migrados</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">{result.results.failed}</div>
                      <div className="text-muted-foreground">Fallaron</div>
                    </div>
                  </div>

                  {result.results.errors.length > 0 && (
                    <div className="mt-3">
                      <div className="font-medium text-sm mb-2">Errores:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.results.errors.map((error, index) => (
                          <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button 
              onClick={handleMigration} 
              disabled={isMigrating}
            >
              {isMigrating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isMigrating ? 'Migrando...' : 'Iniciar Migración'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}