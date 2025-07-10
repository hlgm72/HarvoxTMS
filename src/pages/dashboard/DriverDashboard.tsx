import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Clock, DollarSign, Fuel, Phone, MessageSquare, FileText, AlertTriangle } from "lucide-react";

export default function DriverDashboard() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-fleet bg-clip-text text-transparent mb-2">
            Mi Dashboard
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-fleet-green rounded-full animate-pulse"></span>
            Bienvenido, Juan Pérez • {new Date().toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐 {new Date().toLocaleTimeString('es-ES')}</span>
        </div>
      </div>

      {/* Driver Status & Current Load */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Carga Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Carga #LD-001</span>
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  En ruta
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Origen:</span>
                  <span className="font-medium">Houston, TX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Destino:</span>
                  <span className="font-medium">Dallas, TX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrega estimada:</span>
                  <span className="font-medium">Hoy 2:30 PM</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso del viaje</span>
                  <span className="font-medium">68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button size="sm" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  Llamar Dispatch
                </Button>
                <Button size="sm" variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensaje
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Ingresos esta semana</span>
                  <span className="font-bold text-green-800">$2,450.00</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Millas recorridas:</span>
                  <span className="font-medium">1,250 mi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cargas completadas:</span>
                  <span className="font-medium">6</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Próximo pago:</span>
                  <span className="font-medium">Viernes 15</span>
                </div>
              </div>

              <Button className="w-full" variant="outline" size="sm">
                Ver Detalle de Pagos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Vehicle Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Licencia CDL</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Vigente
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Certificado Médico</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Vigente
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Permiso HazMat</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  Vence pronto
                </Badge>
              </div>
              <Button className="w-full mt-4" variant="outline" size="sm">
                Gestionar Documentos
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600" />
              Estado del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Combustible:</span>
                <span className="font-medium">75%</span>
              </div>
              <Progress value={75} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Odómetro:</span>
                <span className="font-medium">145,678 mi</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Próximo servicio:</span>
                <span className="font-medium">2,300 mi</span>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">Todo en orden</p>
                <p className="text-xs text-green-600">Sin alertas mecánicas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Horas de Servicio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conducción hoy:</span>
                <span className="font-medium">6.5 / 11 hrs</span>
              </div>
              <Progress value={59} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">En servicio:</span>
                <span className="font-medium">8.2 / 14 hrs</span>
              </div>
              <Progress value={58} className="h-2" />
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Descanso requerido en:</p>
                <p className="text-xs text-blue-600">4 hrs 30 min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Carga entregada exitosamente</p>
                  <p className="text-xs text-muted-foreground">Hace 2 horas - Miami, FL</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Nueva carga asignada</p>
                  <p className="text-xs text-muted-foreground">Hace 3 horas - Houston, TX → Dallas, TX</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Mensaje del dispatcher</p>
                  <p className="text-xs text-muted-foreground">Hace 4 horas - Cambio de ruta por tráfico</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Notificaciones Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">Permiso HazMat vence en 30 días</p>
                <p className="text-xs text-orange-600">Renovar antes del 15 de agosto</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Entrenamiento de seguridad pendiente</p>
                <p className="text-xs text-blue-600">Completar antes del 30 de julio</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">Bonus por seguridad aplicado</p>
                <p className="text-xs text-green-600">$200 añadidos al próximo pago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}