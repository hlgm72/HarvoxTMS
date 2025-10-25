import { useState } from 'react';
import { formatDateOnly } from '@/lib/dateFormatting';
import { getFuelCardProviderVariant } from '@/lib/fuelCardProviderUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, Trash2, AlertCircle, Edit } from 'lucide-react';
import { useFleetNotifications } from "@/components/notifications";
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFuelCardProviders } from '@/hooks/useFuelCardProviders';

interface DriverCard {
  id: string;
  driver_user_id: string;
  card_number_last_five: string;
  card_provider: string;
  card_identifier?: string;
  is_active: boolean;
  assigned_date: string;
  // Join data
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Driver {
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export function DriverCardsManager() {
  const { t } = useTranslation('fuel');
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DriverCard | null>(null);
  const { showSuccess, showError } = useFleetNotifications();
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardIdentifier, setCardIdentifier] = useState('');
  const queryClient = useQueryClient();

  // Fetch fuel card providers
  const { data: providers } = useFuelCardProviders();

  // Fetch driver cards with driver names
  const { data: driverCards, isLoading, refetch } = useQuery({
    queryKey: ['driver-cards'],
    queryFn: async () => {
      // First get the user's company ID
      const { data: userCompany, error: companyError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching user company:', companyError);
        throw companyError;
      }

      if (!userCompany?.company_id) {
        console.log('No company found for current user');
        return [];
      }

      // Debug logs removed to prevent Sentry spam

      const { data, error } = await supabase
        .from('driver_fuel_cards')
        .select('*')
        .eq('company_id', userCompany.company_id)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) {
        console.error('Error fetching driver cards:', error);
        throw error;
      }

      // Debug logs removed to prevent Sentry spam

      // Get driver names for each card
      const cardsWithDrivers = await Promise.all(
        data.map(async (card) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', card.driver_user_id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error fetching profile for driver:', card.driver_user_id, profileError);
          }
          
          return {
            ...card,
            profiles: profile || { first_name: 'Sin', last_name: 'Nombre' }
          };
        })
      );

      // Debug logs removed to prevent Sentry spam
      return cardsWithDrivers as DriverCard[];
    }
  });

  // Fetch available drivers
  const { data: drivers } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: async () => {
      // First get the user's company ID
      const { data: userCompany, error: companyError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching user company for drivers:', companyError);
        throw companyError;
      }

      if (!userCompany?.company_id) {
        console.log('No company found for current user when fetching drivers');
        return [];
      }

      const { data, error } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompany.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (error) throw error;

      // Get driver names separately
      const driversWithNames = await Promise.all(
        data.map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', role.user_id)
            .single();
          
          return {
            user_id: role.user_id,
            profiles: profile || { first_name: 'Sin', last_name: 'Nombre' }
          };
        })
      );

      return driversWithNames as Driver[];
    }
  });

  // Save card mutation (handles both create and update)
  const saveCardMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDriver || !selectedProvider || !cardLastFour) {
        throw new Error(t('cards.messages.required_fields'));
      }

      if (editingCard) {
        // Update existing card
        const { data, error } = await supabase
          .from('driver_fuel_cards')
          .update({
            driver_user_id: selectedDriver,
            card_number_last_five: cardLastFour,
            card_provider: selectedProvider,
            card_identifier: cardIdentifier || null
          })
          .eq('id', editingCard.id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      } else {
        // Create new card
        // Get company ID from current user
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', selectedDriver)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          throw new Error(t('cards.messages.company_error'));
        }

        if (!userRoles) {
          throw new Error(t('cards.messages.company_not_found'));
        }

        const cardData = {
          driver_user_id: selectedDriver,
          company_id: userRoles.company_id,
          card_number_last_five: cardLastFour,
          card_provider: selectedProvider,
          ...(cardIdentifier && { card_identifier: cardIdentifier })
        };

        const { data, error } = await supabase
          .from('driver_fuel_cards')
          .insert(cardData)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-cards'] });
      resetForm();
      showSuccess(editingCard ? t('cards.messages.update_success') : t('cards.messages.assign_success'));
    },
    onError: (error) => {
      showError(t('cards.messages.save_error') + error.message);
    }
  });

  // Remove card mutation
  const removeCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('driver_fuel_cards')
        .update({ 
          is_active: false,
          deactivated_date: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-cards'] });
      showSuccess(t('cards.messages.deactivate_success'));
    },
    onError: (error) => {
      showError(t('cards.messages.deactivate_error') + error.message);
    }
  });

  const resetForm = () => {
    setIsCardDialogOpen(false);
    setEditingCard(null);
    setSelectedDriver('');
    setSelectedProvider('');
    setCardLastFour('');
    setCardIdentifier('');
  };

  const handleSaveCard = () => {
    saveCardMutation.mutate();
  };

  const handleEditCard = (card: DriverCard) => {
    setEditingCard(card);
    setSelectedDriver(card.driver_user_id);
    setSelectedProvider(card.card_provider);
    setCardLastFour(card.card_number_last_five);
    setCardIdentifier(card.card_identifier || '');
    setIsCardDialogOpen(true);
  };

  const handleAddCard = () => {
    resetForm();
    setIsCardDialogOpen(true);
  };

  const handleRemoveCard = (cardId: string) => {
    if (confirm(t('cards.messages.deactivate_confirm'))) {
      removeCardMutation.mutate(cardId);
    }
  };

  // Debug logs removed to prevent Sentry spam

  if (isLoading) {
    return <div>{t('cards.list.loading')}</div>;
  }

  // Debug logs removed to prevent Sentry spam

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('cards.page.title')}</h2>
          <p className="text-muted-foreground">
            {t('cards.page.subtitle')}
          </p>
        </div>
        
        <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              {t('cards.page.assign_card')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCard ? t('cards.dialog.edit_title') : t('cards.dialog.create_title')}
              </DialogTitle>
              <DialogDescription>
                {editingCard ? t('cards.dialog.edit_description') : t('cards.dialog.create_description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="driver">{t('cards.dialog.driver_field')}</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cards.dialog.select_driver')} />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.map((driver) => (
                      <SelectItem key={driver.user_id} value={driver.user_id}>
                        {driver.profiles.first_name} {driver.profiles.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provider">{t('cards.dialog.provider_field')}</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cards.dialog.select_provider')} />
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map((provider) => (
                      <SelectItem key={provider.id} value={provider.name}>
                        {provider.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="cardLastFour">{t('cards.dialog.last_digits')}</Label>
                <Input
                  id="cardLastFour"
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value)}
                  placeholder={t('cards.dialog.last_digits_placeholder')}
                  maxLength={5}
                />
              </div>
              
              <div>
                <Label htmlFor="cardIdentifier">{t('cards.dialog.identifier')}</Label>
                <Input
                  id="cardIdentifier"
                  value={cardIdentifier}
                  onChange={(e) => setCardIdentifier(e.target.value)}
                  placeholder={t('cards.dialog.identifier_placeholder')}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetForm}>
                {t('cards.dialog.cancel')}
              </Button>
              <Button 
                onClick={handleSaveCard}
                disabled={saveCardMutation.isPending}
              >
                {saveCardMutation.isPending 
                  ? (editingCard ? t('cards.dialog.updating') : t('cards.dialog.assigning')) 
                  : (editingCard ? t('cards.dialog.update') : t('cards.dialog.assign'))
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">{t('cards.webhook.title')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('cards.webhook.fleetone_url')}<br />
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                  https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/fleetone-webhook
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards List */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {driverCards?.map((card) => (
          <Card key={card.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  **** {card.card_number_last_five}
                </CardTitle>
                <Badge variant={getFuelCardProviderVariant(card.card_provider)}>{card.card_provider.toUpperCase()}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">{t('cards.card.driver_label')}</span>
                  <p className="text-sm text-muted-foreground">
                    {card.profiles?.first_name} {card.profiles?.last_name}
                  </p>
                </div>
                <div>
                  <span className="font-medium">{t('cards.card.assigned_label')}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatDateOnly(card.assigned_date)}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditCard(card)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('cards.card.edit')}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveCard(card.id)}
                  disabled={removeCardMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('cards.card.deactivate')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {driverCards?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t('cards.list.no_cards')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('cards.list.no_cards_description')}
            </p>
            <Button onClick={handleAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              {t('cards.page.assign_first_card')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}