import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SetupData {
  // Personal Info (Step 1)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Preferences (Step 2)
  language: string;
  theme: string;
  timezone: string;
  
  // Driver Info (Step 3)
  driverId: string;
  licenseNumber: string;
  licenseState: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  cdlClass: string;
  cdlEndorsements: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface SetupContextType {
  setupData: SetupData;
  updateSetupData: <K extends keyof SetupData>(field: K, value: SetupData[K]) => void;
  updateMultipleFields: (updates: Partial<SetupData>) => void;
  saveAllData: () => Promise<boolean>;
  isLoading: boolean;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

const initialSetupData: SetupData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  language: 'es',
  theme: 'system',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  driverId: '',
  licenseNumber: '',
  licenseState: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  cdlClass: '',
  cdlEndorsements: '',
  dateOfBirth: '',
  emergencyContactName: '',
  emergencyContactPhone: ''
};

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [setupData, setSetupData] = useState<SetupData>(initialSetupData);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const updateSetupData = useCallback(<K extends keyof SetupData>(field: K, value: SetupData[K]) => {
    console.log(`🔧 Updating setup field: ${String(field)} = ${value}`);
    setSetupData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateMultipleFields = useCallback((updates: Partial<SetupData>) => {
    console.log('🔧 Updating multiple setup fields:', updates);
    setSetupData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const saveAllData = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.error('❌ No user found for setup save');
      return false;
    }

    setIsLoading(true);
    console.log('💾 Starting setup data save with data:', setupData);

    try {
      // 1. Update user preferences
      const preferencesData = {
        user_id: user.id,
        language: setupData.language,
        theme: setupData.theme as 'light' | 'dark' | 'system',
        timezone: setupData.timezone,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Saving preferences:', preferencesData);
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .upsert(preferencesData);

      if (prefsError) {
        console.error('❌ Error saving preferences:', prefsError);
        throw prefsError;
      }

      // 2. Update driver profile if driver info provided
      if (setupData.driverId || setupData.licenseNumber) {
        const driverData = {
          user_id: user.id,
          driver_id: setupData.driverId || null,
          license_number: setupData.licenseNumber || null,
          license_state: setupData.licenseState || null,
          license_issue_date: setupData.licenseIssueDate || null,
          license_expiry_date: setupData.licenseExpiryDate || null,
          cdl_class: setupData.cdlClass || null,
          cdl_endorsements: setupData.cdlEndorsements || null,
          date_of_birth: setupData.dateOfBirth || null,
          emergency_contact_name: setupData.emergencyContactName || null,
          emergency_contact_phone: setupData.emergencyContactPhone || null,
          is_active: true,
          updated_at: new Date().toISOString()
        };

        console.log('💾 Saving driver profile:', driverData);
        const { error: driverError } = await supabase
          .from('driver_profiles')
          .upsert(driverData);

        if (driverError) {
          console.error('❌ Error saving driver profile:', driverError);
          throw driverError;
        }
      }

      console.log('✅ Setup data saved successfully');
      toast.success('Configuración guardada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error saving setup data:', error);
      toast.error('Error al guardar la configuración');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, setupData]);

  return (
    <SetupContext.Provider value={{
      setupData,
      updateSetupData,
      updateMultipleFields,
      saveAllData,
      isLoading,
      currentStep,
      setCurrentStep
    }}>
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
}