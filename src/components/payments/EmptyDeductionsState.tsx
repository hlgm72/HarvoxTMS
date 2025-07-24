import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator, Clock, AlertTriangle, Minus } from "lucide-react";

interface EmptyDeductionsStateProps {
  onCreateTemplate: () => void;
}

export function EmptyDeductionsState({ onCreateTemplate }: EmptyDeductionsStateProps) {
  const features = [
    {
      icon: Calculator,
      title: "Cálculo Automático",
      description: "Deducciones procesadas automáticamente en cada periodo"
    },
    {
      icon: Clock,
      title: "Programación Flexible",
      description: "Configura frecuencias semanales, quincenales o mensuales"
    },
    {
      icon: AlertTriangle,
      title: "Control Total",
      description: "Gestiona gastos recurrentes con transparencia completa"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-64 h-48 mx-auto flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl">
              <div className="relative">
                <Calculator className="w-20 h-20 text-primary/60" />
                <div className="absolute -top-2 -right-2">
                  <Minus className="w-8 h-8 text-destructive bg-background rounded-full p-1 shadow-lg" />
                </div>
              </div>
            </div>
            <div className="absolute -top-2 -right-2">
              <Badge variant="secondary" className="animate-pulse">
                Nuevo
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">
              Configura tus deducciones automáticas
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Administra gastos recurrentes de conductores con cálculos automáticos y control total
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-dashed border-2 hover:border-primary/50 transition-colors animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-4 text-center space-y-2">
                <feature.icon className="h-8 w-8 mx-auto text-primary" />
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-4">
          <Button 
            onClick={onCreateTemplate}
            size="lg"
            className="px-8 py-6 text-lg hover-scale shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Primera Plantilla
          </Button>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Cálculo automático</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Control de pagos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Transparencia total</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Plantillas Activas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">$0</div>
            <div className="text-xs text-muted-foreground">Deducciones Mensuales</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Conductores</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
          <h3 className="font-medium text-foreground">¿Qué puedes configurar?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <span>• Combustible</span>
            <span>• Seguros</span>
            <span>• Mantenimiento</span>
            <span>• Préstamos</span>
            <span>• Multas</span>
            <span>• Comisiones</span>
            <span>• Equipos</span>
            <span>• Otros gastos</span>
          </div>
        </div>
      </div>
    </div>
  );
}