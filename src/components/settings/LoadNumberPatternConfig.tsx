import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useFleetNotifications } from '@/components/notifications';

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
  currentDescription?: string;
  currentExplanation?: string;
  currentExamples?: {
    valid: string[];
    invalid: string[];
  };
  onPatternSaved?: (pattern: string) => void;
}

export const LoadNumberPatternConfig = ({ 
  companyId, 
  currentPattern,
  currentDescription,
  currentExplanation,
  currentExamples,
  onPatternSaved 
}: LoadNumberPatternConfigProps) => {
  const { t, i18n } = useTranslation('settings');
  const { showSuccess, showError } = useFleetNotifications();
  const [description, setDescription] = useState(currentDescription || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      showError(t('system.load_pattern.describe_error'));
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-load-pattern', {
        body: { 
          description,
          language: i18n.language // Enviar el idioma actual
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      
      showSuccess(t('system.load_pattern.pattern_generated'));
    } catch (error: any) {
      console.error('Error generating pattern:', error);
      showError(error.message || t('system.load_pattern.generate_error'));
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
        .update({ 
          load_number_pattern: result.pattern,
          load_number_pattern_description: description,
          load_number_pattern_explanation: result.explanation,
          load_number_pattern_examples: result.examples
        })
        .eq('id', companyId);

      if (error) throw error;

      showSuccess(t('system.load_pattern.pattern_saved'));

      onPatternSaved?.(result.pattern);
      setResult(null);
    } catch (error: any) {
      console.error('Error saving pattern:', error);
      showError(t('system.load_pattern.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('system.load_pattern.title')}
        </CardTitle>
        <CardDescription>
          {t('system.load_pattern.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPattern && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
            <div>
              <span className="font-semibold text-sm">{t('system.load_pattern.current_pattern')}</span>
              <code className="block mt-1 text-sm bg-background p-2 rounded border">{currentPattern}</code>
            </div>
            
            {currentDescription && (
              <div>
                <span className="font-semibold text-sm">{t('system.load_pattern.saved_description')}</span>
                <p className="mt-1 text-sm text-muted-foreground">{currentDescription}</p>
              </div>
            )}

            {currentExplanation && (
              <div>
                <span className="font-semibold text-sm">{t('system.load_pattern.explanation')}</span>
                <p className="mt-1 text-sm text-muted-foreground">{currentExplanation}</p>
              </div>
            )}

            {currentExamples && (
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('system.load_pattern.valid_examples')}
                  </h4>
                  <ul className="space-y-1">
                    {currentExamples.valid.map((example, idx) => (
                      <li key={idx} className="text-xs font-mono bg-green-50 dark:bg-green-950/30 p-2 rounded">
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-red-600 mb-2">
                    <XCircle className="h-4 w-4" />
                    {t('system.load_pattern.invalid_examples')}
                  </h4>
                  <ul className="space-y-1">
                    {currentExamples.invalid.map((example, idx) => (
                      <li key={idx} className="text-xs font-mono bg-red-50 dark:bg-red-950/30 p-2 rounded">
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">{t('system.load_pattern.describe_format')}</Label>
          <Textarea
            id="description"
            placeholder={t('system.load_pattern.placeholder')}
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
              {t('system.load_pattern.generating')}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('system.load_pattern.generate_button')}
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-6 p-4 border rounded-lg bg-muted/30">
            <div>
              <h4 className="font-semibold mb-2">{t('system.load_pattern.explanation')}</h4>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t('system.load_pattern.generated_pattern')}</h4>
              <code className="block text-sm bg-background p-2 rounded border">
                {result.pattern}
              </code>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('system.load_pattern.valid_examples')}
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
                  {t('system.load_pattern.invalid_examples')}
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
                  {t('system.load_pattern.saving')}
                </>
              ) : (
                t('system.load_pattern.save_button')
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
