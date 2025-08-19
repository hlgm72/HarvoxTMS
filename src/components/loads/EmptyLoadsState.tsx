import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Clock, FileText } from "lucide-react";

interface EmptyLoadsStateProps {
  onCreateLoad: () => void;
}

export function EmptyLoadsState({ onCreateLoad }: EmptyLoadsStateProps) {
  const { t } = useTranslation('loads');
  
  const features = [
    {
      icon: Clock,
      title: t('empty_state.features.time_management'),
      description: t('empty_state.features.automatic_tracking')
    },
    {
      icon: TrendingUp,
      title: t('empty_state.features.profitability'),
      description: t('empty_state.features.realtime_analysis')
    },
    {
      icon: FileText,
      title: t('empty_state.features.documentation'),
      description: t('empty_state.features.complete_control')
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="relative">
            <img 
              src="/lovable-uploads/18be73f2-b0d0-4690-b3e3-d14c20b255e6.png" 
              alt="Modern truck illustration"
              className="w-64 h-48 mx-auto object-contain animate-fade-in bg-transparent"
            />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">
              {t('empty_state.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {t('empty_state.description')}
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
            onClick={onCreateLoad}
            size="lg"
            className="px-8 py-6 text-lg hover-scale shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('empty_state.create_button')}
          </Button>
          
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{t('empty_state.features.automated_management')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>{t('empty_state.features.realtime_tracking')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>{t('empty_state.features.detailed_reports')}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">{t('empty_state.stats.active_loads')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">$0</div>
            <div className="text-xs text-muted-foreground">{t('empty_state.stats.total_revenue')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">{t('empty_state.stats.completed_deliveries')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}