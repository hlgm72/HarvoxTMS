import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = async (lng: string) => {
    // Solo cambiar el idioma en i18n
    // useLanguageSync se encargará de actualizar la BD automáticamente
    await i18n.changeLanguage(lng);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span className="font-mono text-xs font-medium">
            {i18n.language.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="z-50"
      >
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={`hover:bg-primary/10 cursor-pointer ${i18n.language === 'en' ? 'bg-primary/20 font-medium' : ''}`}
        >
          <span className="mr-3 text-lg">🇺🇸</span>
          <span>English</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('es')}
          className={`hover:bg-primary/10 cursor-pointer ${i18n.language === 'es' ? 'bg-primary/20 font-medium' : ''}`}
        >
          <span className="mr-3 text-lg">🇪🇸</span>
          <span>Español</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};