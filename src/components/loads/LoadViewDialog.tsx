import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, DollarSign, Calendar, Package, User, Building, Clock, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusColors = {
  created: "bg-slate-100 text-slate-700 border-slate-300",
  route_planned: "bg-blue-100 text-blue-700 border-blue-300",
  assigned: "bg-yellow-100 text-yellow-700 border-yellow-300",
  in_transit: "bg-orange-100 text-orange-700 border-orange-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-300"
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Detalles de la Carga: {load.load_number}</span>
            <Badge 
              variant="outline" 
              className={statusColors[load.status as keyof typeof statusColors]}
            >
              {statusLabels[load.status as keyof typeof statusLabels]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Número de Carga
                </label>
                <p className="text-sm font-semibold">{load.load_number}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </label>
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={statusColors[load.status as keyof typeof statusColors]}
                  >
                    {statusLabels[load.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Monto Total
                </label>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(load.total_amount)}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Commodity
                </label>
                <p className="text-sm font-medium">{load.commodity}</p>
              </div>

              {load.weight_lbs && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Peso
                  </label>
                  <p className="text-sm font-medium">{load.weight_lbs.toLocaleString()} lbs</p>
                </div>
              )}

              {load.notes && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Notas
                  </label>
                  <p className="text-sm">{load.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ubicaciones y Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ruta y Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Origen
                </label>
                <p className="text-sm font-medium">{load.pickup_city}</p>
                {load.pickup_date && (
                  <p className="text-xs text-muted-foreground">
                    Fecha de recogida: {format(new Date(load.pickup_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <div className="border-l-2 border-dashed border-muted h-6"></div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Destino
                </label>
                <p className="text-sm font-medium">{load.delivery_city}</p>
                {load.delivery_date && (
                  <p className="text-xs text-muted-foreground">
                    Fecha de entrega: {format(new Date(load.delivery_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Creada
                </label>
                <p className="text-sm">
                  {format(new Date(load.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>

              {load.updated_at && load.updated_at !== load.created_at && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Última Actualización
                  </label>
                  <p className="text-sm">
                    {format(new Date(load.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contactos y Asignaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contactos y Asignaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Broker / Cliente
                </label>
                <p className="text-sm font-medium">{load.broker_name}</p>
                {load.dispatcher_name && (
                  <p className="text-xs text-muted-foreground">Contacto: {load.dispatcher_name}</p>
                )}
                {load.customer_name && (
                  <p className="text-xs text-muted-foreground">Cliente: {load.customer_name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Conductor Asignado
                </label>
                <p className="text-sm font-medium">
                  {load.driver_name || (
                    <span className="text-muted-foreground italic">Sin asignar</span>
                  )}
                </p>
                {load.internal_dispatcher_name && (
                  <p className="text-xs text-muted-foreground">Dispatcher: {load.internal_dispatcher_name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Período de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.period_start_date && load.period_end_date ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Período
                    </label>
                    <p className="text-sm font-medium">
                      {format(new Date(load.period_start_date), "dd/MM/yyyy", { locale: es })} - {" "}
                      {format(new Date(load.period_end_date), "dd/MM/yyyy", { locale: es })}
                    </p>
                  </div>

                  {load.period_frequency && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Frecuencia
                      </label>
                      <p className="text-sm">
                        {load.period_frequency === 'weekly' ? 'Semanal' :
                         load.period_frequency === 'biweekly' ? 'Quincenal' :
                         load.period_frequency === 'monthly' ? 'Mensual' :
                         load.period_frequency}
                      </p>
                    </div>
                  )}

                  {load.period_status && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Estado del Período
                      </label>
                      <p className="text-sm">
                        {load.period_status === 'open' ? 'Abierto' :
                         load.period_status === 'locked' ? 'Cerrado' :
                         load.period_status === 'paid' ? 'Pagado' :
                         load.period_status}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Sin período de pago asignado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}