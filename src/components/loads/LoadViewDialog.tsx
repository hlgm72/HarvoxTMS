import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, DollarSign, Calendar, Package, User, Building, Clock, FileText, Truck, ArrowRight, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDateOnly, formatDateTime, formatPaymentPeriod } from '@/lib/dateFormatting';
import { cn } from "@/lib/utils";

const statusColors = {
  created: "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-200",
  route_planned: "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200",
  assigned: "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200",
  in_transit: "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200",
  completed: "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200"
};

const statusIcons = {
  created: Clock,
  route_planned: MapPin,
  assigned: User,
  in_transit: Truck,
  delivered: Package,
  completed: CheckCircle
};

const statusLabels = {
  created: "Creada",
  route_planned: "Ruta Planificada", 
  assigned: "Asignada",
  in_transit: "En Tránsito",
  delivered: "Entregada",
  completed: "Completada"
};

interface LoadViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  load: any;
}

export function LoadViewDialog({ isOpen, onClose, load }: LoadViewDialogProps) {
  if (!load) return null;

  const StatusIcon = statusIcons[load.status as keyof typeof statusIcons] || Clock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  {load.load_number}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Detalles completos de la carga incluyendo paradas, conductor asignado y documentos.
                </DialogDescription>
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn("px-3 py-1 text-sm font-medium", statusColors[load.status as keyof typeof statusColors])}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusLabels[load.status as keyof typeof statusLabels]}
                  </Badge>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(load.total_amount)}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Ruta visual */}
          <div className="mb-8">
            <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-3 rounded-full bg-primary/10 border-2 border-primary/20">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Origen</h3>
                        <p className="text-foreground font-medium">{load.pickup_city}</p>
                        {load.pickup_date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📅 {formatDateOnly(load.pickup_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center px-8">
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent w-20"></div>
                      <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
                      <div className="h-px bg-gradient-to-r from-primary via-primary to-transparent w-20"></div>
                    </div>
                  </div>

                  <div className="flex-1 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-3 rounded-full bg-secondary/10 border-2 border-secondary/20">
                        <Package className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Destino</h3>
                        <p className="text-foreground font-medium">{load.delivery_city}</p>
                        {load.delivery_date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            📅 {formatDateOnly(load.delivery_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información General */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Número de Carga
                    </label>
                    <p className="text-lg font-bold text-foreground">{load.load_number}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Commodity
                    </label>
                    <p className="text-sm font-medium">{load.commodity}</p>
                    {load.weight_lbs && (
                      <p className="text-xs text-muted-foreground">
                        ⚖️ {load.weight_lbs.toLocaleString()} lbs
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Monto Total
                  </label>
                  <div className="text-3xl font-bold text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {formatCurrency(load.total_amount)}
                  </div>
                </div>

                {load.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Notas
                      </label>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm text-foreground">{load.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contactos y Asignaciones */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  Contactos y Asignaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Broker / Cliente
                  </label>
                  <div className="bg-gradient-to-r from-blue-50 to-transparent p-3 rounded-lg border border-blue-100">
                    <p className="text-lg font-semibold text-blue-900">{load.broker_name}</p>
                    {load.dispatcher_name && (
                      <p className="text-sm text-blue-700">📞 Contacto: {load.dispatcher_name}</p>
                    )}
                    {load.customer_name && (
                      <p className="text-sm text-blue-700">🏢 Cliente: {load.customer_name}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Conductor Asignado
                  </label>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    load.driver_name 
                      ? "bg-gradient-to-r from-green-50 to-transparent border-green-100"
                      : "bg-gradient-to-r from-gray-50 to-transparent border-gray-100"
                  )}>
                    {load.driver_name ? (
                      <>
                        <p className="text-lg font-semibold text-green-900">🚛 {load.driver_name}</p>
                        {load.internal_dispatcher_name && (
                          <p className="text-sm text-green-700">📋 Dispatcher: {load.internal_dispatcher_name}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 italic">❌ Sin conductor asignado</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Período de Pago */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  Período de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {load.period_start_date && load.period_end_date ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-transparent p-4 rounded-lg border border-purple-100">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                            Período
                          </label>
                          <p className="text-lg font-bold text-purple-900">
                            {formatPaymentPeriod(load.period_start_date, load.period_end_date)}
                          </p>
                        </div>

                        {load.period_frequency && (
                          <div>
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                              Frecuencia
                            </label>
                            <p className="text-sm font-medium text-purple-800">
                              📅 {load.period_frequency === 'weekly' ? 'Semanal' :
                                 load.period_frequency === 'biweekly' ? 'Quincenal' :
                                 load.period_frequency === 'monthly' ? 'Mensual' :
                                 load.period_frequency}
                            </p>
                          </div>
                        )}

                        {load.period_status && (
                          <div>
                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                              Estado del Período
                            </label>
                            <Badge variant="outline" className="mt-1">
                              {load.period_status === 'open' ? '🔓 Abierto' :
                               load.period_status === 'locked' ? '🔒 Cerrado' :
                               load.period_status === 'paid' ? '💰 Pagado' :
                               load.period_status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground text-lg">📋</div>
                    <p className="text-sm text-muted-foreground italic mt-2">
                      Sin período de pago asignado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fechas y Timestamps */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  Fechas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-orange-50 to-transparent p-3 rounded-lg border border-orange-100">
                    <label className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                      Fecha de Creación
                    </label>
                    <p className="text-sm font-medium text-orange-900">
                      🗓️ {formatDateTime(load.created_at)}
                    </p>
                  </div>

                  {load.updated_at && load.updated_at !== load.created_at && (
                    <div className="bg-gradient-to-r from-yellow-50 to-transparent p-3 rounded-lg border border-yellow-100">
                      <label className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">
                        Última Actualización
                      </label>
                      <p className="text-sm font-medium text-yellow-900">
                        ⏰ {formatDateTime(load.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}