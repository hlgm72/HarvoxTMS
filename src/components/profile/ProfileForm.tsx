import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoForm } from './PersonalInfoForm';
import { PreferencesForm } from './PreferencesForm';
import { SecurityForm } from './SecurityForm';
import { DriverInfoForm } from './DriverInfoForm';
import { IdCard, Settings, Shield, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface ProfileFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function ProfileForm({ onCancel, showCancelButton = true, className }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const { isDriver } = useAuth();
  const { t } = useTranslation('settings');

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isDriver ? 'grid-cols-4' : 'grid-cols-3'} gap-1 p-1 min-h-[60px] bg-muted/30`}>
          <TabsTrigger 
            value="profile" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary"
          >
            <IdCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('profile.tabs.personal_info')}</span>
            <span className="sm:hidden">{t('profile.tabs.personal_info_short')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('profile.tabs.preferences')}</span>
            <span className="sm:hidden">{t('profile.tabs.preferences_short')}</span>
          </TabsTrigger>
          {isDriver && (
            <TabsTrigger 
              value="driver" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary"
            >
              <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('profile.tabs.driver')}</span>
              <span className="sm:hidden">{t('profile.tabs.driver_short')}</span>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="security" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3 bg-white/90 text-muted-foreground hover:bg-white border border-gray-200/50 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=active]:border-secondary"
          >
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('profile.tabs.security')}</span>
            <span className="sm:hidden">{t('profile.tabs.security_short')}</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="profile" className="space-y-4 mt-0">
            <PersonalInfoForm onCancel={onCancel} showCancelButton={showCancelButton} />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-0">
            <PreferencesForm onCancel={onCancel} showCancelButton={showCancelButton} showOnboardingSection={true} />
          </TabsContent>

          {isDriver && (
            <TabsContent value="driver" className="space-y-4 mt-0">
              <DriverInfoForm onCancel={onCancel} showCancelButton={showCancelButton} />
            </TabsContent>
          )}

          <TabsContent value="security" className="space-y-4 mt-0">
            <SecurityForm onCancel={onCancel} showCancelButton={showCancelButton} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}