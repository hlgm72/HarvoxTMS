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
        <TabsList className={`grid w-full ${isDriver ? 'grid-cols-4' : 'grid-cols-3'} h-auto p-1 min-h-[60px] bg-muted/30`}>
          <TabsTrigger 
            value="profile" 
            className="flex items-center gap-2 text-sm py-3 px-5 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground min-w-0 flex-1"
          >
            <IdCard className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Datos Personales</span>
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="flex items-center gap-2 text-sm py-3 px-5 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground min-w-0 flex-1"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Preferencias</span>
          </TabsTrigger>
          {isDriver && (
            <TabsTrigger 
              value="driver" 
              className="flex items-center gap-2 text-sm py-3 px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground min-w-0 flex-1"
            >
              <Truck className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Conductor</span>
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="security" 
            className="flex items-center gap-2 text-sm py-3 px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground min-w-0 flex-1"
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Seguridad</span>
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