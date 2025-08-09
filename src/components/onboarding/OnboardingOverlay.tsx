import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  steps: OnboardingStep[];
  currentRole: string;
}

export function OnboardingOverlay({ isOpen, onClose, steps, currentRole }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const { user } = useAuth();

  if (!isOpen || steps.length === 0) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleted(true);
    
    // Marcar onboarding como completado en el backend
    if (user) {
      try {
        await supabase
          .from('user_onboarding_progress')
          .upsert({
            user_id: user.id,
            role: currentRole,
            completed: true,
            completed_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving onboarding progress:', error);
      }
    }
    
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleSkip = async () => {
    // Marcar como saltado
    if (user) {
      try {
        await supabase
          .from('user_onboarding_progress')
          .upsert({
            user_id: user.id,
            role: currentRole,
            completed: true,
            skipped: true,
            completed_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving onboarding progress:', error);
      }
    }
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl mx-auto animate-scale-in">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🚀</div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {isCompleted ? '¡Bienvenido a FleetNest!' : step.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isCompleted ? 'Ya estás listo para comenzar' : `Paso ${currentStep + 1} de ${steps.length}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Progress Bar */}
            {!isCompleted && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Progreso</span>
                  <span className="text-sm font-medium">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="mb-8">
              {isCompleted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">¡Onboarding Completado!</h3>
                  <p className="text-muted-foreground">
                    Ya conoces las funciones principales de FleetNest. ¡Comienza a gestionar tu flota!
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground mb-6">{step.description}</p>
                  <div className="bg-secondary/20 rounded-lg p-6">
                    {step.content}
                  </div>
                  
                  {/* Action Button */}
                  {step.action && (
                    <div className="mt-6">
                      <Button
                        onClick={step.action.onClick}
                        className="w-full"
                        variant="outline"
                      >
                        {step.action.label}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            {!isCompleted && (
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Saltar Tour
                  </Button>
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                  )}
                </div>
                
                <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? (
                    'Finalizar'
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step Indicators */}
            {!isCompleted && (
              <div className="flex justify-center gap-2 mt-6">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentStep
                        ? 'bg-primary'
                        : index < currentStep
                        ? 'bg-green-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}