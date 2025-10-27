import { useState } from "react";
import { Search, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogoSearch } from "@/hooks/useLogoSearch";
import { useTranslation } from "react-i18next";

interface SmartLogoSearchProps {
  companyName: string;
  emailDomain?: string;
  currentLogoUrl?: string;
  clientId?: string;
  onLogoSelect: (logoUrl: string) => void;
  className?: string;
}

export function SmartLogoSearch({ 
  companyName, 
  emailDomain, 
  currentLogoUrl, 
  clientId,
  onLogoSelect,
  className = ""
}: SmartLogoSearchProps) {
  const { t } = useTranslation();
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [isRejected, setIsRejected] = useState(false);
  const { searchLogo, downloadLogo, isSearching, isDownloading } = useLogoSearch();

  const handleSearch = async () => {
    if (!companyName.trim() && !emailDomain?.trim()) {
      setSearchError(t('clients.logoSearch.errorRequired'));
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
      setSearchError(result.error || t('clients.logoSearch.errorNotFound'));
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
      setSearchError(t('clients.logoSearch.errorNoAlternatives'));
      setCurrentSourceIndex(prev => prev + 1);
    }
  };

  const handleSelectLogo = async (logoUrl: string) => {
    if (!companyName.trim()) {
      setSearchError(t('clients.logoSearch.errorRequiredDownload'));
      return;
    }

    // Descargar el logo al Storage de Supabase
    const result = await downloadLogo(logoUrl, clientId, companyName);
    
    if (result.success && result.logoUrl) {
      // Pasar la URL del Storage (no la URL externa)
      onLogoSelect(result.logoUrl);
      setSearchResults([]);
      setSearchError(null);
      setIsRejected(false);
      setCurrentSourceIndex(0);
    } else {
      setSearchError(result.error || t('clients.logoSearch.errorDownloadFailed'));
    }
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
      case 'clearbit': return t('clients.logoSearch.sourceClearbit');
      case 'website': return t('clients.logoSearch.sourceWebsite');
      case 'logosearch': return t('clients.logoSearch.sourceLogosearch');
      case 'google': return t('clients.logoSearch.sourceGoogle');
      case 'iconhorse': return t('clients.logoSearch.sourceIconhorse');
      default: return t('clients.logoSearch.sourceDefault');
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
          {isSearching ? t('clients.logoSearch.searching') : t('clients.logoSearch.searchButton')}
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
          <p className="text-sm text-muted-foreground">{t('clients.logoSearch.logoFound')}</p>
          <div className="space-y-2">
            {searchResults.map((logoUrl, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={logoUrl} alt={t('clients.logoSearch.altLogoFound')} />
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
                      disabled={isDownloading}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      {isDownloading ? t('clients.logoSearch.downloading') : t('clients.logoSearch.useThisLogo')}
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
                      {isSearching ? t('clients.logoSearch.searching') : t('clients.logoSearch.searchAlternative')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('clients.logoSearch.notCorrectLogo')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentLogoUrl && (
        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-muted-foreground">{t('clients.logoSearch.currentLogoSet')}</span>
          <Avatar key={currentLogoUrl} className="h-12 w-12 ml-auto flex-shrink-0 bg-white border border-border">
            <AvatarImage 
              src={`${currentLogoUrl}${currentLogoUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
              alt={t('clients.logoSearch.altCurrentLogo')}
              className="object-contain p-1.5"
              loading="eager"
            />
            <AvatarFallback className="text-xs">
              {getInitials(companyName)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}