import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PatternResult {
  pattern: string;
  explanation: string;
  examples: {
    valid: string[];
    invalid: string[];
  };
}

interface LoadNumberPatternConfigProps {
  companyId: string;
  currentPattern?: string;
  onPatternSaved?: (pattern: string) => void;
}

export const LoadNumberPatternConfig = ({ 
  companyId, 
  currentPattern,
  onPatternSaved 
}: LoadNumberPatternConfigProps) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Por favor describe el formato que deseas validar");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-load-pattern', {
        body: { description }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      
      toast.success("Patrón generado. Revisa los ejemplos y guarda si es correcto");
    } catch (error: any) {
      console.error('Error generating pattern:', error);
      toast.error(error.message || "No se pudo generar el patrón. Intenta de nuevo");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ load_number_pattern: result.pattern })
        .eq('id', companyId);

      if (error) throw error;

      toast.success("El formato de números de carga ha sido actualizado");

      onPatternSaved?.(result.pattern);
      setDescription('');
      setResult(null);
    } catch (error: any) {
      console.error('Error saving pattern:', error);
      toast.error("No se pudo guardar el patrón");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Formato de Números de Carga
        </CardTitle>
        <CardDescription>
          Describe en lenguaje natural cómo deben ser los números de carga y la IA generará el patrón de validación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPattern && (
          <div className="text-sm p-3 bg-muted rounded-md">
            <span className="font-medium">Patrón actual:</span> <code className="ml-2">{currentPattern}</code>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Describe el formato</Label>
          <Textarea
            id="description"
            placeholder="Ejemplo: Los números de las cargas serán 2 dígitos seguidos de un guion y luego 3 dígitos como mínimo y opcionalmente dos letras"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={isGenerating}
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !description.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando patrón...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generar Patrón
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-6 p-4 border rounded-lg bg-muted/30">
            <div>
              <h4 className="font-semibold mb-2">Explicación:</h4>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Patrón generado:</h4>
              <code className="block text-sm bg-background p-2 rounded border">
                {result.pattern}
              </code>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Ejemplos válidos:
                </h4>
                <ul className="space-y-1">
                  {result.examples.valid.map((example, idx) => (
                    <li key={idx} className="text-sm font-mono bg-green-50 dark:bg-green-950/30 p-2 rounded">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  Ejemplos inválidos:
                </h4>
                <ul className="space-y-1">
                  {result.examples.invalid.map((example, idx) => (
                    <li key={idx} className="text-sm font-mono bg-red-50 dark:bg-red-950/30 p-2 rounded">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
              variant="default"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Patrón'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
