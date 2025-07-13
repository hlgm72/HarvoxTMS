import { useState } from "react";
import { Search, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogoSearch } from "@/hooks/useLogoSearch";

interface SmartLogoSearchProps {
  companyName: string;
  emailDomain?: string;
  currentLogoUrl?: string;
  onLogoSelect: (logoUrl: string) => void;
  className?: string;
}

export function SmartLogoSearch({ 
  companyName, 
  emailDomain, 
  currentLogoUrl, 
  onLogoSelect,
  className = ""
}: SmartLogoSearchProps) {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [isRejected, setIsRejected] = useState(false);
  const { searchLogo, isSearching } = useLogoSearch();

  const handleSearch = async () => {
    if (!companyName.trim() && !emailDomain?.trim()) {
      setSearchError("Se requiere el nombre de la empresa o dominio de email");
      return;
    }

    setSearchError(null);
    setSearchResults([]);
    setSearchSource(null);
    setCurrentSourceIndex(0);
    setIsRejected(false);

    const result = await searchLogo(companyName, emailDomain);
    
    if (result.success && result.logoUrl) {
      setSearchResults([result.logoUrl]);
      setSearchSource(result.source || 'unknown');
    } else {
      setSearchError(result.error || "No se encontró logo para esta empresa");
    }
  };

  const handleSearchNext = async () => {
    setSearchError(null);
    setSearchResults([]);
    setSearchSource(null);
    setIsRejected(true);

    // Buscar en la siguiente fuente disponible
    const result = await searchLogo(companyName, emailDomain, currentSourceIndex + 1);
    
    if (result.success && result.logoUrl) {
      setSearchResults([result.logoUrl]);
      setSearchSource(result.source || 'unknown');
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      setSearchError("No se encontraron más alternativas");
      setCurrentSourceIndex(prev => prev + 1);
    }
  };

  const handleSelectLogo = (logoUrl: string) => {
    onLogoSelect(logoUrl);
    setSearchResults([]);
    setSearchError(null);
    setIsRejected(false);
    setCurrentSourceIndex(0);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'clearbit': return 'default';
      case 'website': return 'default';
      case 'logosearch': return 'secondary';
      case 'google': return 'secondary';
      case 'iconhorse': return 'destructive';
      default: return 'outline';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'clearbit': return 'Clearbit';
      case 'website': return 'Sitio Web';
      case 'logosearch': return 'LogoSearch';
      case 'google': return 'Google';
      case 'iconhorse': return 'Iconhorse';
      default: return 'Encontrado';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={isSearching || (!companyName.trim() && !emailDomain?.trim())}
          className="flex items-center gap-2"
        >
          <Search className="h-3 w-3" />
          {isSearching ? "Buscando..." : "Buscar Logo"}
        </Button>
        
        {searchSource && (
          <Badge variant={getSourceBadgeColor(searchSource)} className="text-xs">
            {getSourceLabel(searchSource)}
          </Badge>
        )}
      </div>

      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Logo encontrado:</p>
          <div className="flex flex-wrap gap-2">
            {searchResults.map((logoUrl, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={logoUrl} alt="Logo encontrado" />
                  <AvatarFallback className="text-xs">
                    {getInitials(companyName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelectLogo(logoUrl)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Usar este logo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSearchNext}
                      disabled={isSearching}
                      className="flex items-center gap-1"
                    >
                      <Search className="h-3 w-3" />
                      {isSearching ? "Buscando..." : "Buscar alternativa"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ¿No es el logo correcto? Haz clic en "Buscar alternativa"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentLogoUrl && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Logo actual configurado</span>
          <Avatar className="h-8 w-8 ml-auto">
            <AvatarImage src={currentLogoUrl} alt="Logo actual" />
            <AvatarFallback className="text-xs">
              {getInitials(companyName)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}