import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, FileText, Eye, Lock, Database, Globe, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function PrivacyPolicy() {
  const { t } = useTranslation(['legal', 'common']);

  const renderSection = (sectionKey: string, icon: React.ReactNode) => {
    const section = t(`legal:privacy_policy.sections.${sectionKey}`, { returnObjects: true }) as any;
    
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
              {section.personal_info && (
                <div>
                  <h4 className="font-semibold mb-2">{section.personal_info.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.personal_info.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {section.operational_data && (
                <div>
                  <h4 className="font-semibold mb-2">{section.operational_data.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.operational_data.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {section.technical_data && (
                <div>
                  <h4 className="font-semibold mb-2">{section.technical_data.title}</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    {section.technical_data.items.map((item: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{item}</li>
                    ))}
                  </ul>
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
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">{t('common:app.name')}</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link to="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('legal:privacy_policy.back_to_home')}
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              {t('legal:privacy_policy.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('legal:privacy_policy.subtitle')}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              {t('legal:privacy_policy.last_updated')}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {renderSection('introduction', <FileText className="h-5 w-5 text-primary" />)}
            {renderSection('information_collection', <Database className="h-5 w-5 text-primary" />)}
            {renderSection('usage', <Eye className="h-5 w-5 text-primary" />)}
            {renderSection('sharing', <Globe className="h-5 w-5 text-primary" />)}
            {renderSection('security', <Lock className="h-5 w-5 text-primary" />)}
            {renderSection('rights', <Shield className="h-5 w-5 text-primary" />)}
            {renderSection('retention', <Database className="h-5 w-5 text-primary" />)}
            {renderSection('cookies', <Globe className="h-5 w-5 text-primary" />)}
            {renderSection('international', <Globe className="h-5 w-5 text-primary" />)}
            {renderSection('changes', <FileText className="h-5 w-5 text-primary" />)}
            {renderSection('contact', <Mail className="h-5 w-5 text-primary" />)}
          </div>

          {/* Back to Login */}
          <div className="text-center mt-12 pt-8 border-t">
            <Link to="/auth">
              <Button size="lg">
                {t('legal:privacy_policy.back_to_login')}
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