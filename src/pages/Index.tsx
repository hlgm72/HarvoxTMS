import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  MapPin, 
  BarChart3, 
  Shield, 
  Clock, 
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const features = [
    {
      icon: MapPin,
      title: "Tracking en Tiempo Real",
      description: "Monitorea tu flota en tiempo real con GPS integrado y actualizaciones automáticas de ubicación."
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados", 
      description: "Análisis detallados de rendimiento, costos operativos y métricas clave para tu negocio."
    },
    {
      icon: Users,
      title: "Gestión de Conductores",
      description: "Administra perfiles de conductores, licencias, certificaciones y horarios de trabajo."
    },
    {
      icon: Shield,
      title: "Seguridad Integral",
      description: "Cumplimiento DOT, alertas de seguridad y monitoreo de comportamiento de conducción."
    },
    {
      icon: Clock,
      title: "Optimización de Rutas",
      description: "Planifica rutas eficientes, reduce costos de combustible y mejora tiempos de entrega."
    },
    {
      icon: Truck,
      title: "Mantenimiento Preventivo",
      description: "Programa mantenimientos, trackea reparaciones y mantén tu flota en óptimas condiciones."
    }
  ];

  const benefits = [
    "Reduce costos operativos hasta 25%",
    "Mejora la eficiencia de rutas",
    "Cumplimiento automático DOT/FMCSA",
    "Reportes en tiempo real",
    "Integración con Geotab",
    "Soporte 24/7"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">FleetNest</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                Características
              </a>
              <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors">
                Beneficios
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contacto
              </a>
            </nav>

            <div className="flex items-center space-x-4">
              <Link to="/setup">
                <Button variant="outline" size="sm">
                  Admin
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              🚀 Plataforma de Gestión de Flotas #1
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Gestiona tu Flota de{" "}
              <span className="text-primary">Transporte</span>{" "}
              con Inteligencia
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              FleetNest te ayuda a optimizar operaciones, reducir costos y mantener el cumplimiento 
              regulatorio con nuestra plataforma todo-en-uno para empresas de transporte.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-4">
                  Comenzar Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Ver Demo
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Sin tarjeta de crédito</span>
              <span>•</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Setup en 5 minutos</span>
              <span>•</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Soporte incluido</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que Necesitas para Gestionar tu Flota
            </h2>
            <p className="text-xl text-muted-foreground">
              Herramientas poderosas diseñadas específicamente para empresas de transporte
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ¿Por qué Elegir FleetNest?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Más de 500 empresas de transporte confían en FleetNest para optimizar 
                sus operaciones y aumentar su rentabilidad.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl font-bold text-primary mb-2">25%</div>
                  <div className="text-xl font-semibold mb-2">Reducción de Costos</div>
                  <div className="text-muted-foreground">Promedio de ahorro reportado por nuestros clientes</div>
                  
                  <div className="flex justify-center mt-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    4.9/5 - Calificación promedio
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            ¿Listo para Optimizar tu Flota?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya están ahorrando tiempo y dinero con FleetNest
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                Comenzar Ahora - Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Contactar Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-primary">FleetNest</span>
              </div>
              <p className="text-muted-foreground mb-4">
                La plataforma líder en gestión de flotas de transporte. 
                Optimiza, controla y crece tu negocio con nuestras herramientas profesionales.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  (555) 123-4567
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  info@fleetnest.com
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Características</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Integraciones</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Seguridad</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Documentación</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Estado del Sistema</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 FleetNest. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
