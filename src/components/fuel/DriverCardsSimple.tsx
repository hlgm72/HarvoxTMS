import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Edit, Trash2, Plus } from 'lucide-react';
import { useFleetNotifications } from "@/components/notifications";

interface DriverCard {
  id: string;
  driver_user_id: string;
  card_number_last_five: string;
  card_provider: string;
  card_identifier?: string;
  is_active: boolean;
  assigned_date: string;
  driver_name?: string;
}

export function DriverCardsSimple() {
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  // Consulta directa bypassing RLS temporalmente
  const { data: driverCards, isLoading } = useQuery({
    queryKey: ['driver-cards-simple'],
    queryFn: async () => {
      console.log('🔍 SIMPLE: Fetching cards with supabase-js...');
      
      // Intentar consulta directa
      const { data: rawCards, error: cardsError } = await supabase
        .from('driver_fuel_cards')
        .select('*')
        .eq('company_id', 'e5d52767-ca59-4c28-94e4-058aff6a037b')
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (cardsError) {
        console.error('🔍 SIMPLE: Cards Error:', cardsError);
        throw cardsError;
      }

      console.log('🔍 SIMPLE: Raw cards:', rawCards);

      // Si tenemos tarjetas, agregar nombres de conductores
      if (rawCards && rawCards.length > 0) {
        const cardsWithNames = await Promise.all(
          rawCards.map(async (card) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('user_id', card.driver_user_id)
              .maybeSingle();
            
            return {
              ...card,
              driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin nombre'
            };
          })
        );
        
        console.log('🔍 SIMPLE: Cards with names:', cardsWithNames);
        return cardsWithNames as DriverCard[];
      }

      return [];
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['driver-cards-simple'] });
      showSuccess('Tarjeta desactivada');
    },
    onError: (error) => {
      showError('Error al desactivar tarjeta: ' + error.message);
    }
  });

  const handleRemoveCard = (cardId: string) => {
    if (confirm('¿Estás seguro de que quieres desactivar esta tarjeta?')) {
      removeCardMutation.mutate(cardId);
    }
  };

  if (isLoading) {
    return <div>Cargando tarjetas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tarjetas de Combustible (Versión Simple)</h2>
          <p className="text-muted-foreground">
            Vista directa de las tarjetas sin políticas RLS
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {driverCards?.map((card) => (
          <Card key={card.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  **** {card.card_number_last_five}
                </CardTitle>
                <Badge variant="secondary">{card.card_provider.toUpperCase()}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Conductor:</span>
                  <p className="text-sm text-muted-foreground">
                    {card.driver_name || 'Sin nombre'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Asignada:</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(card.assigned_date).toLocaleDateString()}
                  </p>
                </div>
                {card.card_identifier && (
                  <div>
                    <span className="font-medium">Identificador:</span>
                    <p className="text-sm text-muted-foreground">
                      {card.card_identifier}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemoveCard(card.id)}
                  disabled={removeCardMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Desactivar
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
            <h3 className="font-medium mb-2">No hay tarjetas asignadas</h3>
            <p className="text-muted-foreground">
              Las tarjetas deberían mostrarse aquí si existen en la base de datos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}