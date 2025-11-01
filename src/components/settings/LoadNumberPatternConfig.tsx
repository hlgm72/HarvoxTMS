import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('settings');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error(t('system.load_pattern.describe_error'));
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
      
      toast.success(t('system.load_pattern.pattern_generated'));
    } catch (error: any) {
      console.error('Error generating pattern:', error);
      toast.error(error.message || t('system.load_pattern.generate_error'));
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

      toast.success(t('system.load_pattern.pattern_saved'));

      onPatternSaved?.(result.pattern);
      setDescription('');
      setResult(null);
    } catch (error: any) {
      console.error('Error saving pattern:', error);
      toast.error(t('system.load_pattern.save_error'));
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
          <div className="text-sm p-3 bg-muted rounded-md">
            <span className="font-medium">{t('system.load_pattern.current_pattern')}</span> <code className="ml-2">{currentPattern}</code>
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
