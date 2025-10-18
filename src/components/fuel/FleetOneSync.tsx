import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';

export function FleetOneSync() {
  const { t } = useTranslation(['fuel', 'common']);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDateFrom, setSyncDateFrom] = useState('');
  const [syncDateTo, setSyncDateTo] = useState('');
  const { showSuccess, showError } = useFleetNotifications();

  const handleFleetOneSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fleetone-sync', {
        body: {
          action: 'sync_transactions',
          date_from: syncDateFrom || undefined,
          date_to: syncDateTo || undefined,
        }
      });

      if (error) throw error;

      showSuccess(
        t('floating_actions.sync.success_title'),
        t('floating_actions.sync.success_message', { count: data?.synced_count || 0 })
      );
    } catch (error: any) {
      console.error('❌ Error syncing FleetOne:', error);
      showError(
        t('floating_actions.sync.error_title'),
        error.message || t('floating_actions.sync.error_message')
      );
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t('floating_actions.sync.title')}
          </CardTitle>
          <CardDescription>
            {t('floating_actions.sync.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">{t('floating_actions.sync.date_from')}</Label>
              <Input
                id="dateFrom"
                type="date"
                value={syncDateFrom}
                onChange={(e) => setSyncDateFrom(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">{t('floating_actions.sync.date_to')}</Label>
              <Input
                id="dateTo"
                type="date"
                value={syncDateTo}
                onChange={(e) => setSyncDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleFleetOneSync}
              disabled={syncLoading}
              size="lg"
              className="w-full"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncLoading && "animate-spin")} />
              {syncLoading ? t('floating_actions.sync.syncing') : t('floating_actions.sync.sync_transactions')}
            </Button>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• {t('floating_actions.sync.sync_notes.default_period')}</p>
                  <p>• {t('floating_actions.sync.sync_notes.duplicates_skipped')}</p>
                  <p>• {t('floating_actions.sync.sync_notes.only_assigned')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
