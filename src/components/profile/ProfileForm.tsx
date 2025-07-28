import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoForm } from './PersonalInfoForm';
import { PreferencesForm } from './PreferencesForm';
import { SecurityForm } from './SecurityForm';
import { IdCard, Settings, Shield } from 'lucide-react';

interface ProfileFormProps {
  onCancel?: () => void;
  showCancelButton?: boolean;
  className?: string;
}

export function ProfileForm({ onCancel, showCancelButton = true, className }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger 
            value="profile" 
            className="flex items-center gap-2 text-xs md:text-sm py-2 px-2 md:px-4 transition-all duration-200 hover:bg-secondary/20 hover:text-secondary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"
          >
            <IdCard className="h-5 w-5 md:h-5 md:w-5" />
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

          <TabsContent value="security" className="space-y-4 mt-0">
            <SecurityForm onCancel={onCancel} showCancelButton={showCancelButton} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}