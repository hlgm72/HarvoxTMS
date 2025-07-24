import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Scale, FileText, Shield, AlertTriangle, Eye, Globe, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function TermsOfService() {
  const { t } = useTranslation(['legal', 'common']);

  const renderSection = (sectionKey: string, icon: React.ReactNode) => {
    const section = t(`legal:terms_of_service.sections.${sectionKey}`, { returnObjects: true }) as any;
    
    return (
      <Card key={sectionKey}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {icon}
            {section.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(section.content) ? (
            section.content.map((paragraph: string, index: number) => (
              <p key={index} className="text-muted-foreground">
                {paragraph}
              </p>
            ))
          ) : (
            <div className="space-y-4">
              {section.account_security && (
                <div>
                  <h4 className="font-semibold mb-2">{section.account_security.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.account_security.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {section.appropriate_use && (
                <div>
                  <h4 className="font-semibold mb-2">{section.appropriate_use.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.appropriate_use.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {section.subscriptions && (
                <div>
                  <h4 className="font-semibold mb-2">{section.subscriptions.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.subscriptions.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {section.cancellations && (
                <div>
                  <h4 className="font-semibold mb-2">{section.cancellations.title}</h4>
                  <p className="text-muted-foreground">{section.cancellations.content}</p>
                </div>
              )}
              {typeof section.content === 'string' && (
                <p className="text-muted-foreground">{section.content}</p>
              )}
              {Array.isArray(section.content) && section.content.map((paragraph: string, index: number) => (
                <p key={index} className="text-muted-foreground">{paragraph}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">{t('common:app.name')}</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link to="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('legal:terms_of_service.back_to_home')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <Scale className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              {t('legal:terms_of_service.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('legal:terms_of_service.subtitle')}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {t('legal:terms_of_service.last_updated')}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {renderSection('acceptance', <Scale className="h-5 w-5 text-primary" />)}
            {renderSection('service_description', <FileText className="h-5 w-5 text-primary" />)}
            {renderSection('user_responsibilities', <Shield className="h-5 w-5 text-primary" />)}
            {renderSection('prohibited_uses', <AlertTriangle className="h-5 w-5 text-destructive" />)}
            {renderSection('data_privacy', <Eye className="h-5 w-5 text-primary" />)}
            {renderSection('payment_terms', <FileText className="h-5 w-5 text-primary" />)}
            {renderSection('intellectual_property', <Shield className="h-5 w-5 text-primary" />)}
            {renderSection('limitation_liability', <AlertTriangle className="h-5 w-5 text-destructive" />)}
            {renderSection('service_availability', <Globe className="h-5 w-5 text-primary" />)}
            {renderSection('termination', <AlertTriangle className="h-5 w-5 text-destructive" />)}
            {renderSection('changes_terms', <FileText className="h-5 w-5 text-primary" />)}
            {renderSection('governing_law', <Scale className="h-5 w-5 text-primary" />)}
            {renderSection('contact', <Mail className="h-5 w-5 text-primary" />)}
          </div>

          {/* Back to Login */}
          <div className="text-center mt-12 pt-8 border-t">
            <Link to="/auth">
              <Button size="lg">
                {t('legal:terms_of_service.back_to_login')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 py-8 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">
            © 2024 {t('common:app.name')}. {t('common:legal.rights_reserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}