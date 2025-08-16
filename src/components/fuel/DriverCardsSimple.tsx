import { useState, useEffect } from 'react';
import { formatDateOnly } from '@/lib/dateFormatting';
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

  // Mostrar directamente las tarjetas conocidas (test)
  const [driverCards, setDriverCards] = useState<DriverCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Datos de prueba directos
  useEffect(() => {
    console.log('🔍 SIMPLE: Loading test cards...');
    setDriverCards([
      {
        id: '11f8ccd1-a991-4225-a12a-add968160bd7',
        driver_user_id: '087a825c-94ea-42d9-8388-5087a19d776f',
        card_number_last_five: '27160',
        card_provider: 'efs',
        card_identifier: '708305 003 0086527160',
        is_active: true,
        assigned_date: '2025-07-25T20:10:53.553916+00:00',
        driver_name: 'Hector Gonzalez'
      },
      {
        id: '7db3df07-04de-40e1-bf7f-a5d869bc47d7',
        driver_user_id: '087a825c-94ea-42d9-8388-5087a19d776f',
        card_number_last_five: '00097',
        card_provider: 'fleetone',
        card_identifier: '501 4861 1824 9860 0097',
        is_active: true,
        assigned_date: '2025-07-25T18:07:01.105773+00:00',
        driver_name: 'Hector Gonzalez'
      }
    ]);
    console.log('🔍 SIMPLE: Test cards loaded');
  }, []);

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
                    {formatDateOnly(card.assigned_date)}
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