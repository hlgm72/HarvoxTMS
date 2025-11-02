import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  BarChart3, 
  Shield, 
  Clock, 
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Star,
  Truck,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AnimatedStats } from '@/components/landing/AnimatedStats';
import { TestimonialsCarousel } from '@/components/landing/TestimonialsCarousel';
import { TrustedBySection } from '@/components/landing/TrustedBySection';
import { TypingAnimation } from '@/components/landing/TypingAnimation';
import heroImage from '@/assets/hero-dashboard.png';

const harvoxLogo = '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png';

export default function Landing() {
  const { t } = useTranslation(['landing', 'common']);
  
  const features = [
    {
      icon: MapPin,
      title: t('landing:features.items.real_time_tracking.title'),
      description: t('landing:features.items.real_time_tracking.description')
    },
    {
      icon: BarChart3,
      title: t('landing:features.items.advanced_reports.title'), 
      description: t('landing:features.items.advanced_reports.description')
    },
    {
      icon: Users,
      title: t('landing:features.items.driver_management.title'),
      description: t('landing:features.items.driver_management.description')
    },
    {
      icon: Shield,
      title: t('landing:features.items.comprehensive_safety.title'),
      description: t('landing:features.items.comprehensive_safety.description')
    },
    {
      icon: Clock,
      title: t('landing:features.items.route_optimization.title'),
      description: t('landing:features.items.route_optimization.description')
    },
    {
      icon: Truck,
      title: t('landing:features.items.preventive_maintenance.title'),
      description: t('landing:features.items.preventive_maintenance.description')
    }
  ];

  const benefits = t('landing:benefits.items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={harvoxLogo} 
                alt="Harvox TMS Logo"
                className="h-10 w-10 object-contain"
              />
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{t('common:app.name')}</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                {t('common:navigation.features')}
              </a>
              <a href="#benefits" className="text-muted-foreground hover:text-primary transition-colors">
                {t('common:navigation.benefits')}
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                {t('common:navigation.contact')}
              </a>
            </nav>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <LanguageSwitcher />
              <Link to="/auth">
                <Button size="sm">
                  {t('common:navigation.login')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 animate-gradient" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="text-center lg:text-left animate-fade-in">
              <Badge variant="secondary" className="mb-6 bg-secondary text-white hover:bg-secondary/90 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('landing:hero.badge')}
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight">
                {t('landing:hero.title')}{" "}
                <br />
                <TypingAnimation 
                  words={[
                    t('landing:hero.title_highlight'),
                    "Logística",
                    "Flota",
                    "Negocio"
                  ]}
                  className="text-primary"
                />
                <br />
                {t('landing:hero.title_end')}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t('landing:hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link to="/auth">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    {t('common:actions.get_started')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 hover:bg-accent">
                  {t('common:actions.view_demo')}
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-muted-foreground">{t('landing:hero.features.no_credit_card')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-muted-foreground">{t('landing:hero.features.quick_setup')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-muted-foreground">{t('landing:hero.features.support_included')}</span>
                </div>
              </div>
            </div>

            {/* Right side - Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 hover:shadow-glow transition-all duration-500 hover:scale-[1.02]">
                <img 
                  src={heroImage} 
                  alt="Harvox TMS Dashboard"
                  className="w-full h-auto"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <TrustedBySection />

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Funcionalidades
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('landing:features.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('landing:features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-card/50 backdrop-blur-sm group overflow-hidden relative"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <CardHeader className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-8 w-8 text-primary group-hover:text-secondary transition-colors" />
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Resultados Comprobados
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Cifras que Hablan por Sí Mismas
            </h2>
          </div>
          
          <AnimatedStats />
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Ventajas
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('landing:benefits.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('landing:benefits.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-accent/50 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="text-lg text-foreground font-medium">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="relative">
              <Card className="border-none shadow-2xl bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="mb-8">
                    <div className="text-7xl font-bold text-primary mb-4">
                      {t('landing:benefits.stats.cost_reduction')}
                    </div>
                    <div className="text-2xl font-semibold text-foreground mb-3">
                      {t('landing:benefits.stats.cost_reduction_label')}
                    </div>
                    <div className="text-muted-foreground text-lg">
                      {t('landing:benefits.stats.cost_reduction_desc')}
                    </div>
                  </div>
                  
                  <div className="border-t border-border pt-8">
                    <div className="flex justify-center mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-8 w-8 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <div className="text-lg text-muted-foreground font-medium">
                      {t('landing:benefits.stats.rating')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Testimonios
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Lo Que Dicen Nuestros Clientes
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Empresas reales, resultados reales
            </p>
          </div>

          <TestimonialsCarousel />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-fleet-navy" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Sparkles className="w-4 h-4 mr-2" />
              Comienza Gratis
            </Badge>
            
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {t('landing:cta.title')}
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              {t('landing:cta.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-7 bg-secondary hover:bg-secondary/90 text-white shadow-2xl hover:shadow-glow hover:scale-105 transition-all duration-300 font-bold"
                >
                  {t('common:actions.start_now')}
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-10 py-7 border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-300 font-bold"
              >
                {t('common:actions.contact_sales')}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Sin Tarjeta de Crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Cancelación Gratuita</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Soporte 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fleet-sky/20 rounded-full blur-3xl" />
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gradient-to-br from-muted/80 to-muted/50 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Newsletter Section */}
          <div className="py-12 border-b border-border/50">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Mantente Actualizado
              </h3>
              <p className="text-muted-foreground mb-6">
                Recibe las últimas novedades, tips y actualizaciones de Harvox TMS
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button className="px-8 py-3 bg-primary hover:bg-primary-glow">
                  Suscribirse
                </Button>
              </div>
            </div>
          </div>

          {/* Main Footer Content */}
          <div className="py-12">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <img 
                    src={harvoxLogo} 
                    alt="Harvox TMS Logo"
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-2xl font-bold text-primary">{t('common:app.name')}</span>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('landing:footer.description')}
                </p>
                
                {/* Contact Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Button variant="outline" size="sm" className="justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    {t('landing:footer.contact.phone')}
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    {t('landing:footer.contact.email')}
                  </Button>
                </div>

                {/* Social Media Links */}
                <div className="flex gap-3">
                  <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold mb-4 text-foreground text-lg">{t('landing:footer.sections.product.title')}</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li><a href="#features" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.product.links.features')}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.product.links.integrations')}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.product.links.api')}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.product.links.security')}</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold mb-4 text-foreground text-lg">{t('landing:footer.sections.support.title')}</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.support.links.documentation')}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.support.links.help_center')}</a></li>
                  <li><a href="#contact" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.support.links.contact')}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('landing:footer.sections.support.links.system_status')}</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold mb-4 text-foreground text-lg">Legal</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li><Link to="/privacy-policy" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('common:legal.privacy_policy')}</Link></li>
                  <li><Link to="/terms-of-service" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('common:legal.terms_of_service')}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-border/50 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                &copy; 2024 {t('common:app.name')}. {t('common:legal.rights_reserved')}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  SSL Seguro
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  99.9% Uptime
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}