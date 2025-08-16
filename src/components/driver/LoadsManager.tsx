import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  MapPin, 
  Clock, 
  Navigation, 
  CheckCircle, 
  AlertCircle,
  Phone,
  MessageSquare,
  Route
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLoads } from "@/hooks/useLoads";
import { useUpdateLoadStatus } from "@/hooks/useUpdateLoadStatus";
import { useFleetNotifications } from "@/components/notifications";

interface Load {
  id: string;
  load_number: string;
  client_name: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  progress?: number;
}

interface LoadsManagerProps {
  className?: string;
}

export function LoadsManager({ className }: LoadsManagerProps) {
  const { t } = useTranslation(['common', 'fleet']);
  const { user } = useAuth();
  const { showSuccess } = useFleetNotifications();
  const updateLoadStatus = useUpdateLoadStatus();

  const calculateProgress = (status: string): number => {
    switch (status) {
      case 'assigned': return 10;
      case 'en_route_pickup': return 25;
      case 'at_pickup': return 50;
      case 'loaded': return 65;
      case 'en_route_delivery': return 80;
      case 'at_delivery': return 95;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  // Fetch driver's loads using the real hook
  const { data: loadsData = [], isLoading, refetch } = useLoads();
  
  // Transform data for LoadsManager component
  const loads = loadsData.filter(load => load.driver_user_id === user?.id).map(load => ({
    id: load.id,
    load_number: load.load_number,
    client_name: load.broker_name || 'Sin cliente',
    origin_city: load.pickup_city || 'Sin origen',
    origin_state: '',
    destination_city: load.delivery_city || 'Sin destino', 
    destination_state: '',
    pickup_date: new Date().toISOString(), // TODO: Add pickup dates from stops
    delivery_date: new Date(Date.now() + 86400000).toISOString(), // TODO: Add delivery dates from stops
    status: load.status,
    total_amount: load.total_amount,
    progress: calculateProgress(load.status)
  }));

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en_route_pickup': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'at_pickup': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'loaded': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'en_route_delivery': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'at_delivery': return 'bg-lime-100 text-lime-800 border-lime-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'assigned': return 'Asignada';
      case 'en_route_pickup': return 'En ruta al origen';
      case 'at_pickup': return 'En origen';
      case 'loaded': return 'Cargada';
      case 'en_route_delivery': return 'En ruta al destino';
      case 'at_delivery': return 'En destino';
      case 'delivered': return 'Entregada';
      default: return status;
    }
  };

  const handleUpdateStatus = async (loadId: string, newStatus: string) => {
    try {
      await updateLoadStatus.mutateAsync({ loadId, newStatus });
      await refetch();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'assigned': 'en_route_pickup',
      'en_route_pickup': 'at_pickup',
      'at_pickup': 'loaded',
      'loaded': 'en_route_delivery',
      'en_route_delivery': 'at_delivery',
      'at_delivery': 'delivered'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  const activeLoads = loads.filter(load => !['delivered', 'cancelled'].includes(load.status));
  const completedLoads = loads.filter(load => ['delivered'].includes(load.status));

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargando cargas...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="relative">
            Cargas Activas
            {activeLoads.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeLoads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completadas
            {completedLoads.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {completedLoads.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeLoads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cargas activas</h3>
                <p className="text-muted-foreground">
                  Actualmente no tienes cargas asignadas
                </p>
              </CardContent>
            </Card>
          ) : (
            activeLoads.map((load) => (
              <Card key={load.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <CardTitle className="text-base">{load.load_number}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(load.status)}>
                      {getStatusText(load.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{load.client_name}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Route Info */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div className="w-0.5 h-8 bg-border"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-medium text-sm">{load.origin_city}, {load.origin_state}</p>
                          <p className="text-xs text-muted-foreground">
                            Recogida: {new Date(load.pickup_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{load.destination_city}, {load.destination_state}</p>
                          <p className="text-xs text-muted-foreground">
                            Entrega: {new Date(load.delivery_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${load.total_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span className="font-medium">{load.progress}%</span>
                    </div>
                    <Progress value={load.progress} className="h-2" />
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    {getNextStatus(load.status) && (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUpdateStatus(load.id, getNextStatus(load.status)!)}
                        disabled={updateLoadStatus.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {getNextStatus(load.status) === 'en_route_pickup' && 'Ir al origen'}
                        {getNextStatus(load.status) === 'at_pickup' && 'En origen'}
                        {getNextStatus(load.status) === 'loaded' && 'Cargado'}
                        {getNextStatus(load.status) === 'en_route_delivery' && 'Ir al destino'}
                        {getNextStatus(load.status) === 'at_delivery' && 'En destino'}
                        {getNextStatus(load.status) === 'delivered' && 'Entregado'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Route className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedLoads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay cargas completadas</h3>
                <p className="text-muted-foreground">
                  Las cargas completadas aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            completedLoads.map((load) => (
              <Card key={load.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base">{load.load_number}</CardTitle>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Entregada
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{load.client_name}</p>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <p>{load.origin_city} → {load.destination_city}</p>
                      <p className="text-muted-foreground">
                        {new Date(load.delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">${load.total_amount.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}