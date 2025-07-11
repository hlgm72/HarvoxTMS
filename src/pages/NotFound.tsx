import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, Compass } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation('admin');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-muted/30 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl transition-all duration-1000 ease-out"
          style={{
            left: `${mousePosition.x}%`,
            top: `${mousePosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div className="absolute top-20 right-20 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-secondary/20 rounded-full blur-xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* 404 Number */}
          <div className="relative">
            <h1 className="text-8xl md:text-9xl lg:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary animate-fade-in">
              404
            </h1>
            <div className="absolute inset-0 text-8xl md:text-9xl lg:text-[12rem] font-bold text-primary/10 blur-sm animate-pulse">
              404
            </div>
          </div>

          {/* Error Message Card */}
          <Card className="backdrop-blur-lg bg-card/80 border-border/50 shadow-2xl animate-scale-in">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-muted rounded-full">
                    <Compass className="h-8 w-8 text-muted-foreground animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  {t('pages.not_found.title')}
                </h2>
                
                <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {t('pages.not_found.description')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button asChild size="lg" className="min-w-40 group">
                  <Link to="/">
                    <Home className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    {t('pages.not_found.buttons.home')}
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="lg" className="min-w-40 group">
                  <Link to="/superadmin">
                    <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    {t('pages.not_found.buttons.dashboard')}
                  </Link>
                </Button>
              </div>

              {/* Search Suggestion */}
              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span>{t('pages.not_found.search_suggestion')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Floating Elements */}
          <div className="hidden lg:block">
            <div className="absolute top-10 left-10 animate-bounce delay-500">
              <div className="w-6 h-6 bg-primary/30 rounded-full"></div>
            </div>
            <div className="absolute top-32 right-32 animate-bounce delay-1000">
              <div className="w-4 h-4 bg-accent/40 rounded-full"></div>
            </div>
            <div className="absolute bottom-20 right-10 animate-bounce delay-700">
              <div className="w-5 h-5 bg-secondary/35 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-muted/20 to-transparent"></div>
    </div>
  );
}