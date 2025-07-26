import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, Trash2, AlertCircle, Edit } from 'lucide-react';
import { useFleetNotifications } from "@/components/notifications";
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
  card_number_last_four: string;
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
  const { data: driverCards, isLoading } = useQuery({
    queryKey: ['driver-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_cards')
        .select('*')
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      if (error) throw error;

      // Get driver names separately
      const cardsWithDrivers = await Promise.all(
        data.map(async (card) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', card.driver_user_id)
            .single();
          
          return {
            ...card,
            profiles: profile || { first_name: 'Sin', last_name: 'Nombre' }
          };
        })
      );

      return cardsWithDrivers as DriverCard[];
    }
  });

  // Fetch available drivers
  const { data: drivers } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('user_id')
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
        throw new Error('Conductor, proveedor y últimos 4 dígitos son requeridos');
      }

      if (editingCard) {
        // Update existing card
        const { data, error } = await supabase
          .from('driver_cards')
          .update({
            driver_user_id: selectedDriver,
            card_number_last_four: cardLastFour,
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
          throw new Error('Error al obtener la empresa del conductor');
        }

        if (!userRoles) {
          throw new Error('No se encontró la empresa del conductor');
        }

        const cardData = {
          driver_user_id: selectedDriver,
          company_id: userRoles.company_id,
          card_number_last_four: cardLastFour,
          card_provider: selectedProvider,
          ...(cardIdentifier && { card_identifier: cardIdentifier })
        };

        const { data, error } = await supabase
          .from('driver_cards')
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
      showSuccess(editingCard ? 'Tarjeta actualizada exitosamente' : 'Tarjeta asignada exitosamente');
    },
    onError: (error) => {
      showError('Error al guardar tarjeta: ' + error.message);
    }
  });

  // Remove card mutation
  const removeCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('driver_cards')
        .update({ 
          is_active: false,
          deactivated_date: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-cards'] });
      showSuccess('Tarjeta desactivada');
    },
    onError: (error) => {
      showError('Error al desactivar tarjeta: ' + error.message);
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
    setCardLastFour(card.card_number_last_four);
    setCardIdentifier(card.card_identifier || '');
    setIsCardDialogOpen(true);
  };

  const handleAddCard = () => {
    resetForm();
    setIsCardDialogOpen(true);
  };

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
          <h2 className="text-2xl font-bold">Tarjetas de Combustible</h2>
          <p className="text-muted-foreground">
            Gestiona las tarjetas de combustible asignadas a los conductores
          </p>
        </div>
        
        <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar Tarjeta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCard ? 'Editar Tarjeta de Combustible' : 'Asignar Nueva Tarjeta de Combustible'}
              </DialogTitle>
              <DialogDescription>
                {editingCard ? 'Modifica los datos de la tarjeta de combustible' : 'Asigna una tarjeta de combustible a un conductor'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="driver">Conductor</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
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
                <Label htmlFor="provider">Proveedor de Tarjeta</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
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
                <Label htmlFor="cardLastFour">Últimos 4 dígitos de la tarjeta</Label>
                <Input
                  id="cardLastFour"
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              
              <div>
                <Label htmlFor="cardIdentifier">Identificador completo (opcional)</Label>
                <Input
                  id="cardIdentifier"
                  value={cardIdentifier}
                  onChange={(e) => setCardIdentifier(e.target.value)}
                  placeholder="Para uso interno"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveCard}
                disabled={saveCardMutation.isPending}
              >
                {saveCardMutation.isPending 
                  ? (editingCard ? 'Actualizando...' : 'Asignando...') 
                  : (editingCard ? 'Actualizar Tarjeta' : 'Asignar Tarjeta')
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
              <h3 className="font-medium text-blue-900">Configuración de Webhooks</h3>
              <p className="text-sm text-blue-700 mt-1">
                FleetOne Webhook URL:<br />
                <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                  https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/fleetone-webhook
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {driverCards?.map((card) => (
          <Card key={card.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  **** {card.card_number_last_four}
                </CardTitle>
                <Badge variant="secondary">{card.card_provider.toUpperCase()}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Conductor:</span>
                  <p className="text-sm text-muted-foreground">
                    {card.profiles?.first_name} {card.profiles?.last_name}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Asignada:</span>
                  <p className="text-sm text-muted-foreground">
                    {new Date(card.assigned_date).toLocaleDateString()}
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
                  Editar
                </Button>
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
            <p className="text-muted-foreground mb-4">
              Comienza asignando tarjetas de combustible a tus conductores
            </p>
            <Button onClick={handleAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar Primera Tarjeta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}