import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, User, Settings, Building, ArrowRight, ArrowLeft } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { BirthDateInput } from '@/components/ui/BirthDateInput';
import { AddressForm } from '@/components/ui/AddressForm';
import { supabase } from '@/integrations/supabase/client';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userRole: string;
}

export function SetupWizard({ isOpen, onClose, onComplete, userRole }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const steps: SetupStep[] = [
    {
      id: 'profile',
      title: 'Información Personal',
      description: 'Completa tu perfil con información básica',
      icon: User,
      completed: false
    },
    {
      id: 'preferences',
      title: 'Preferencias',
      description: 'Configura idioma y zona horaria',
      icon: Settings,
      completed: false
    },
    ...(userRole === 'company_owner' ? [{
      id: 'company',
      title: 'Datos de Empresa',
      description: 'Información de tu empresa de transporte',
      icon: Building,
      completed: false
    }] : [])
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

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

  const handleComplete = () => {
    setIsCompleting(true);
    
    // Simular guardado de configuración
    setTimeout(() => {
      onComplete();
      setIsCompleting(false);
    }, 1500);
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Configuración Inicial
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Vamos a configurar tu cuenta paso a paso
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso de configuración</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Navigation */}
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 cursor-pointer transition-all ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : isCompleted 
                      ? 'bg-green-100 text-green-600 border-green-600' 
                      : 'border-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden md:block">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(steps[currentStep].icon, { className: "h-5 w-5" })}
                {steps[currentStep].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCompleting ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Guardando configuración...</h3>
                  <p className="text-muted-foreground text-center">
                    Estamos configurando tu cuenta con la información proporcionada
                  </p>
                </div>
              ) : (
                <SetupStepContent step={steps[currentStep]} />
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          {!isCompleting && (
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Saltar configuración
                </Button>
                <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente para el contenido de cada paso
function SetupStepContent({ step }: { step: SetupStep }) {
  switch (step.id) {
    case 'profile':
      return <ProfileSetupStep />;
    case 'preferences':
      return <PreferencesSetupStep />;
    case 'company':
      return <CompanySetupStep />;
    default:
      return <div>Paso no encontrado</div>;
  }
}

// Componente para configuración de perfil
function ProfileSetupStep() {
  const { profile } = useUserProfile();
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    dateOfBirth: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Función para formatear teléfono
  const formatPhoneNumber = (value: string) => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');
    
    // Limitar a 10 dígitos
    const limitedNumbers = numbers.substring(0, 10);
    
    // Aplicar formato (XXX) XXX-XXXX
    if (limitedNumbers.length >= 6) {
      return `(${limitedNumbers.substring(0, 3)}) ${limitedNumbers.substring(3, 6)}-${limitedNumbers.substring(6)}`;
    } else if (limitedNumbers.length >= 3) {
      return `(${limitedNumbers.substring(0, 3)}) ${limitedNumbers.substring(3)}`;
    } else if (limitedNumbers.length > 0) {
      return `(${limitedNumbers}`;
    }
    return limitedNumbers;
  };

  // Actualizar el formulario cuando se carga el perfil
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || ''
      }));
    }
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Información Personal</h3>
        <p className="text-muted-foreground">
          Esta información nos ayuda a personalizar tu experiencia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nombre *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Tu nombre"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Apellido *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Tu apellido"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teléfono</label>
          <input
            type="tel"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="(123) 456-7890"
            value={formData.phone}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setFormData({ ...formData, phone: formatted });
            }}
          />
        </div>

        <div className="space-y-2">
          <BirthDateInput
            value={formData.dateOfBirth}
            onValueChange={(value, isValid, age) => {
              setFormData({ ...formData, dateOfBirth: value });
            }}
            className="w-full"
            minAge={18}
            maxAge={70}
            data-testid="birth-date-input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Contacto de Emergencia</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Nombre del contacto"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teléfono de Emergencia</label>
          <input
            type="tel"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="(123) 456-7890"
            value={formData.emergencyPhone}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              setFormData({ ...formData, emergencyPhone: formatted });
            }}
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Esta información se puede actualizar después desde tu perfil
        </p>
      </div>
    </div>
  );
}

// Componente para configuración de preferencias
function PreferencesSetupStep() {
  // Función para detectar la zona horaria del usuario
  const detectUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Error detecting timezone:', error);
      return 'America/New_York'; // Fallback
    }
  };

  // Lista de zonas horarias de Estados Unidos
  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Mountain Time - Arizona (sin cambio horario)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' }
  ];

  const [preferences, setPreferences] = useState({
    language: 'es',
    timezone: detectUserTimezone(), // Detectar automáticamente
    notifications: true,
    darkMode: false
  });

  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);

  // Efecto para mostrar información sobre la detección automática
  useEffect(() => {
    const detected = detectUserTimezone();
    setDetectedTimezone(detected);
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Preferencias</h3>
        <p className="text-muted-foreground">
          Personaliza tu experiencia en FleetNest
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Idioma</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Zona Horaria</label>
            {detectedTimezone && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  🌍 <strong>Zona horaria detectada automáticamente:</strong> {detectedTimezone}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Puedes cambiarla si es necesario en la lista de abajo
                </p>
              </div>
            )}
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.value === detectedTimezone ? ' (Detectada)' : ''}
                </option>
              ))}
              {/* Mostrar la zona horaria detectada si no está en la lista */}
              {detectedTimezone && !timezoneOptions.find(opt => opt.value === detectedTimezone) && (
                <option value={detectedTimezone}>
                  {detectedTimezone} (Detectada automáticamente)
                </option>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Notificaciones</h4>
              <p className="text-sm text-muted-foreground">
                Recibir notificaciones sobre cargas, pagos y actualizaciones
              </p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={preferences.notifications}
              onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Modo Oscuro</h4>
              <p className="text-sm text-muted-foreground">
                Usar tema oscuro para reducir la fatiga visual
              </p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={preferences.darkMode}
              onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para configuración de empresa
function CompanySetupStep() {
  const { userCompany } = useCompanyCache();
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    dotNumber: '',
    mcNumber: '',
    address: '',
    cityId: '',
    stateId: '',
    zipCode: '',
    phone: '',
    email: ''
  });

  // Cargar datos existentes de la empresa
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!userCompany?.company_id) return;
      
      try {
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userCompany.company_id)
          .single();

        if (error) {
          console.error('Error loading company data:', error);
          return;
        }

        if (company) {
          setCompanyData({
            name: company.name || '',
            dotNumber: company.dot_number || '',
            mcNumber: company.mc_number || '',
            address: company.street_address || '',
            cityId: company.city_id || '',
            stateId: company.state_id || '',
            zipCode: company.zip_code || '',
            phone: company.phone || '',
            email: company.email || ''
          });
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };

    loadCompanyData();
  }, [userCompany]);

  // Función para guardar datos de la empresa
  const handleSaveCompany = async () => {
    if (!userCompany?.company_id) {
      console.error('No company ID available');
      return false;
    }

    // Validar campos requeridos
    if (!companyData.name.trim() || !companyData.address.trim() || !companyData.stateId || !companyData.zipCode.trim()) {
      alert('Por favor completa todos los campos requeridos (*)');
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name.trim(),
          dot_number: companyData.dotNumber.trim() || null,
          mc_number: companyData.mcNumber.trim() || null,
          street_address: companyData.address.trim(),
          city_id: companyData.cityId || null,
          state_id: companyData.stateId,
          zip_code: companyData.zipCode.trim(),
          phone: companyData.phone.trim() || null,
          email: companyData.email.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userCompany.company_id);

      if (error) {
        console.error('Error updating company:', error);
        alert('Error al guardar los datos de la empresa');
        return false;
      }

      console.log('✅ Company data saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving company data:', error);
      alert('Error al guardar los datos de la empresa');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Información de la Empresa</h3>
        <p className="text-muted-foreground">
          Configura los datos básicos de tu empresa de transporte
        </p>
      </div>

      <div className="space-y-4 px-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Nombre de la Empresa *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Transportes ABC LLC"
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Número DOT</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="1234567"
              value={companyData.dotNumber}
              onChange={(e) => setCompanyData({ ...companyData, dotNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Número MC</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="MC-123456"
              value={companyData.mcNumber}
              onChange={(e) => setCompanyData({ ...companyData, mcNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Componente de dirección reutilizable */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Dirección de la Empresa</h4>
          <AddressForm
            streetAddress={companyData.address}
            onStreetAddressChange={(value) => setCompanyData({ ...companyData, address: value })}
            stateId={companyData.stateId}
            onStateChange={(value) => setCompanyData({ ...companyData, stateId: value || '' })}
            cityId={companyData.cityId}
            onCityChange={(value) => setCompanyData({ ...companyData, cityId: value || '' })}
            zipCode={companyData.zipCode}
            onZipCodeChange={(value) => setCompanyData({ ...companyData, zipCode: value })}
            required={true}
            streetAddressLabel="Dirección"
            stateLabel="Estado"
            cityLabel="Ciudad"
            zipCodeLabel="Código Postal"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono</label>
            <input
              type="tel"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="+1 (555) 123-4567"
              value={companyData.phone}
              onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email de la Empresa</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="info@transportesabc.com"
              value={companyData.email}
              onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm text-amber-800">
            ⚠️ <strong>Importante:</strong> Los números DOT y MC son requeridos para operaciones comerciales en Estados Unidos
          </p>
        </div>

        {/* Botón para guardar datos */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSaveCompany}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              'Guardar Datos de Empresa'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}