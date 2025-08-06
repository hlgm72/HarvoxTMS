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
  Truck
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
const fleetNestLogo = '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png';

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
                src={fleetNestLogo} 
                alt="FleetNest Logo" 
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

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link to="/setup">
                <Button variant="outline" size="sm">
                  {t('common:navigation.admin')}
                </Button>
              </Link>
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-[#FF6C1A] text-white hover:bg-[#e55a0f] px-4 py-2 text-sm font-semibold">
              {t('landing:hero.badge')}
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              {t('landing:hero.title')}{" "}
              <span className="text-primary">{t('landing:hero.title_highlight')}</span>{" "}
              {t('landing:hero.title_end')}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('landing:hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-4">
                  {t('common:actions.get_started')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                {t('common:actions.view_demo')}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t('landing:hero.features.no_credit_card')}</span>
              <span>•</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t('landing:hero.features.quick_setup')}</span>
              <span>•</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{t('landing:hero.features.support_included')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('landing:features.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('landing:features.subtitle')}
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
                {t('landing:benefits.title')}
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                {t('landing:benefits.subtitle')}
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
                  <div className="text-6xl font-bold text-primary mb-2">{t('landing:benefits.stats.cost_reduction')}</div>
                  <div className="text-xl font-semibold mb-2">{t('landing:benefits.stats.cost_reduction_label')}</div>
                  <div className="text-muted-foreground">{t('landing:benefits.stats.cost_reduction_desc')}</div>
                  
                  <div className="flex justify-center mt-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {t('landing:benefits.stats.rating')}
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
            {t('landing:cta.title')}
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            {t('landing:cta.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4 bg-[#FF6C1A] text-white hover:bg-[#e55a0f]">
                {t('common:actions.start_now')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              {t('common:actions.contact_sales')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src={fleetNestLogo} 
                  alt="FleetNest Logo" 
                  className="h-10 w-10 object-contain"
                />
                <span className="text-2xl font-bold text-primary">{t('common:app.name')}</span>
              </div>
              <p className="text-muted-foreground mb-4">
                {t('landing:footer.description')}
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  {t('landing:footer.contact.phone')}
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  {t('landing:footer.contact.email')}
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">{t('landing:footer.sections.product.title')}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.product.links.features')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.product.links.integrations')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.product.links.api')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.product.links.security')}</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">{t('landing:footer.sections.support.title')}</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.support.links.documentation')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.support.links.help_center')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.support.links.contact')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('landing:footer.sections.support.links.system_status')}</a></li>
                <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">{t('common:legal.privacy_policy')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <div className="flex justify-center items-center space-x-4 mb-2">
              <Link to="/privacy-policy" className="text-sm hover:text-primary transition-colors">
                {t('common:legal.privacy_policy')}
              </Link>
              <span>•</span>
              <Link to="/terms-of-service" className="text-sm hover:text-primary transition-colors">
                {t('common:legal.terms_of_service')}
              </Link>
            </div>
            <p>&copy; 2024 {t('common:app.name')}. {t('common:legal.rights_reserved')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}