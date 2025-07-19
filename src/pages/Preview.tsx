
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, BarChart3, Users, Shield, MapPin, Clock } from "lucide-react";

export default function Preview() {
  const features = [
    {
      icon: Truck,
      title: "Gestión de Flota",
      description: "Control completo de tu flota de vehículos en tiempo real"
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Análisis detallados de rendimiento y costos operativos"
    },
    {
      icon: Users,
      title: "Gestión de Conductores",
      description: "Administra perfiles, licencias y horarios de trabajo"
    },
    {
      icon: Shield,
      title: "Cumplimiento DOT",
      description: "Mantén el cumplimiento regulatorio automáticamente"
    },
    {
      icon: MapPin,
      title: "Seguimiento GPS",
      description: "Monitoreo en tiempo real con actualizaciones automáticas"
    },
    {
      icon: Clock,
      title: "Optimización de Rutas",
      description: "Planifica rutas eficientes y reduce costos de combustible"
    }
  ];

  const stats = [
    { value: "500+", label: "Empresas Confían en Nosotros" },
    { value: "25%", label: "Reducción de Costos Promedio" },
    { value: "99.9%", label: "Tiempo de Actividad" },
    { value: "24/7", label: "Soporte Técnico" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">FleetNest</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              Demo
            </Button>
            <Button size="sm">
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium mb-6">
              🚀 #1 Plataforma de Gestión de Flotas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Gestiona tu Flota de{" "}
              <span className="text-primary">Transporte</span>{" "}
              con Inteligencia
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              FleetNest te ayuda a optimizar operaciones, reducir costos y mantener el cumplimiento regulatorio con nuestra plataforma todo-en-uno para empresas de transporte.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Prueba Gratuita
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que Necesitas para Gestionar tu Flota
            </h2>
            <p className="text-xl text-muted-foreground">
              Herramientas poderosas diseñadas específicamente para empresas de transporte
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-muted hover:border-primary/50 transition-colors">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Dashboard Profesional en Tiempo Real
          </h2>
          <div className="bg-muted/50 rounded-lg p-8 border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Cargas Activas</CardDescription>
                  <CardTitle className="text-3xl">24</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-green-600">↗️ +12% vs ayer</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Utilización de Flota</CardDescription>
                  <CardTitle className="text-3xl">85.7%</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-green-600">↗️ +3.2% esta semana</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Ingresos Hoy</CardDescription>
                  <CardTitle className="text-3xl">$47,890</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-green-600">↗️ +15.3% vs promedio</div>
                </CardContent>
              </Card>
            </div>
            <div className="text-muted-foreground">
              Vista previa del dashboard principal - Datos actualizados en tiempo real
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Listo para Optimizar tu Flota?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a cientos de empresas que ya están ahorrando tiempo y dinero con FleetNest
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Comenzar Prueba Gratuita
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/20 hover:bg-primary-foreground/10">
              Contactar Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-background">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Truck className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">FleetNest</span>
            </div>
            <div className="text-muted-foreground text-center md:text-right">
              <p>© 2024 FleetNest. Todos los derechos reservados.</p>
              <p className="text-sm mt-1">
                La plataforma líder para gestión de flotas de transporte.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
