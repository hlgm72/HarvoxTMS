import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoForm } from './PersonalInfoForm';
import { PreferencesForm } from './PreferencesForm';
import { SecurityForm } from './SecurityForm';
import { DriverInfoForm } from './DriverInfoForm';
import { IdCard, Settings, Shield, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ProfileFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function ProfileForm({ onCancel, showCancelButton = true, className }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const { isDriver } = useAuth();

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isDriver ? 'grid-cols-4' : 'grid-cols-3'} h-auto`}>
          <TabsTrigger 
            value="profile" 
            className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
          >
            <IdCard className="h-3 w-3 md:h-4 md:w-4" style={{ minHeight: '16px', minWidth: '16px' }} />
            <span className="hidden sm:inline">Información Personal</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
          >
            <Settings className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Preferencias</span>
            <span className="sm:hidden">Pref</span>
          </TabsTrigger>
          {isDriver && (
            <TabsTrigger 
              value="driver" 
              className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
            >
              <Truck className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Conductor</span>
              <span className="sm:hidden">Cond</span>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="security" 
            className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
          >
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Seguridad</span>
            <span className="sm:hidden">Seguridad</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="profile" className="space-y-4 mt-0">
            <PersonalInfoForm onCancel={onCancel} showCancelButton={showCancelButton} />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-0">
            <PreferencesForm onCancel={onCancel} showCancelButton={showCancelButton} />
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