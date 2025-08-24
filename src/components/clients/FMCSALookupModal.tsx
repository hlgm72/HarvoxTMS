import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FMCSAData {
  legalName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  physicalAddress: string | null;
  mailingAddress: string | null;
  phone: string | null;
  email: string | null;
  dba: string | null;  // Doing Business As
  entityType: string | null;  // CARRIER, etc.
  usdotStatus: string | null;  // ACTIVE, INACTIVE, etc.
  carrierOperation: string | null;
  stateOfOperation: string | null;
  cargoCarried: string[];
  inspections: {
    inspections: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfService: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
    outOfServiceRate: {
      vehicle: string;
      driver: string;
      hazmat: string;
      iep: string;
    };
  } | null;
  crashes: {
    fatal: string;
    injury: string;
    tow: string;
    total: string;
  } | null;
  safetyRating: {
    ratingDate: string | null;
    reviewDate: string | null;
    rating: string | null;
    type: string | null;
  } | null;
}

interface CompanyOption {
  name: string;
  href: string;
  dotNumber?: string;
  mcNumber?: string;
  city?: string;
  state?: string;
  physicalAddress?: string;
}

interface FMCSALookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataFound: (data: Partial<{
    name: string;
    address: string;
    phone: string;
    dot_number: string;
    mc_number: string;
    email: string;
    alias: string;
  }>) => void;
}

export function FMCSALookupModal({ isOpen, onClose, onDataFound }: FMCSALookupModalProps) {
  const { t } = useTranslation('clients');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"DOT" | "MC" | "NAME">("MC");
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const [data, setData] = useState<FMCSAData | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [showCompanies, setShowCompanies] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showError(t('fmcsa_lookup_modal.messages.no_search_term'));
      return;
    }

    setLoading(true);
    setData(null);
    setCompanies([]);
    setShowCompanies(false);
    
    try {
      const { data: responseData, error } = await supabase.functions.invoke('fmcsa-lookup', {
        body: {
          searchQuery: searchQuery.trim(),
          searchType
        }
      });

      if (error) {
        console.error('FMCSA lookup error:', error);
        showError(t('fmcsa_lookup_modal.messages.search_error'));
        setLoading(false);
        return;
      }

      if (!responseData || !responseData.success) {
        const errorMessage = responseData?.error || t('fmcsa_lookup_modal.messages.no_info_found');
        showError(errorMessage);
        console.log('FMCSA search failed:', errorMessage);
        setLoading(false);
        return;
      }

      // Check if we have multiple companies to choose from
      if (responseData.multipleResults && responseData.companies) {
        setCompanies(responseData.companies);
        setShowCompanies(true);
        showSuccess(`Se encontraron ${responseData.companies.length} empresas. Selecciona la correcta.`);
        setLoading(false);
        return;
      }

      // Single company result
      const fmcsaData = responseData.data as FMCSAData;
      setData(fmcsaData);
      showSuccess(t('fmcsa_lookup_modal.messages.info_found'));
      setLoading(false);

    } catch (error) {
      console.error('Error calling FMCSA function:', error);
      showError(t('fmcsa_lookup_modal.messages.search_error'));
      setLoading(false);
    }
  };

  const handleSelectCompany = async (company: CompanyOption) => {
    setLoading(true);
    setShowCompanies(false);
    
    try {
      const { data: responseData, error } = await supabase.functions.invoke('fmcsa-lookup', {
        body: {
          companyUrl: company.href
        }
      });

      if (error) {
        console.error('FMCSA company details error:', error);
        showError(t('fmcsa_lookup_modal.messages.search_error'));
        setLoading(false);
        return;
      }

      if (!responseData || !responseData.success) {
        const errorMessage = responseData?.error || t('fmcsa_lookup_modal.messages.no_info_found');
        showError(errorMessage);
        setLoading(false);
        return;
      }

      const fmcsaData = responseData.data as FMCSAData;
      setData(fmcsaData);
      showSuccess(t('fmcsa_lookup_modal.messages.info_found'));
      setLoading(false);

    } catch (error) {
      console.error('Error getting company details:', error);
      showError(t('fmcsa_lookup_modal.messages.search_error'));
      setLoading(false);
    }
  };

  const handleApplyData = () => {
    if (data && onDataFound) {
      const mappedData: any = {
        name: data.legalName || "",
        address: data.physicalAddress || data.mailingAddress || "",
        phone: data.phone || "",
        dot_number: data.dotNumber || "",
        mc_number: data.mcNumber || "",
        email: data.email || "",
      };
      
      // Solo agregar alias si DBA tiene información válida
      if (data.dba && data.dba.trim() && !data.dba.toLowerCase().includes('no aplica') && !data.dba.toLowerCase().includes('vacío')) {
        mappedData.alias = data.dba;
      }
      
      onDataFound(mappedData);
      showSuccess(t('fmcsa_lookup_modal.messages.data_applied'));
      
      // Limpiar datos y cerrar modal
      setData(null);
      setSearchQuery("");
      onClose();
    }
  };

  const handleClose = () => {
    setData(null);
    setSearchQuery("");
    setCompanies([]);
    setShowCompanies(false);
    onClose();
  };

  const handleBackToSearch = () => {
    setShowCompanies(false);
    setCompanies([]);
  };

  const getLabelForSearchType = () => {
    switch (searchType) {
      case "DOT":
        return t('fmcsa_lookup_modal.form.labels.dot_number');
      case "MC":
        return t('fmcsa_lookup_modal.form.labels.mc_number');
      case "NAME":
        return t('fmcsa_lookup_modal.form.labels.company_name');
      default:
        return t('fmcsa_lookup_modal.form.labels.mc_number');
    }
  };

  const getPlaceholderForSearchType = () => {
    switch (searchType) {
      case "DOT":
        return t('fmcsa_lookup_modal.form.placeholders.dot');
      case "MC":
        return t('fmcsa_lookup_modal.form.placeholders.mc');
      case "NAME":
        return t('fmcsa_lookup_modal.form.placeholders.name');
      default:
        return t('fmcsa_lookup_modal.form.placeholders.mc');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('fmcsa_lookup_modal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('fmcsa_lookup_modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={searchType === "MC" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("MC")}
              >
                {t('fmcsa_lookup_modal.search_types.mc')}
              </Button>
              <Button
                type="button"
                variant={searchType === "DOT" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("DOT")}
              >
                {t('fmcsa_lookup_modal.search_types.dot')}
              </Button>
              <Button
                type="button"
                variant={searchType === "NAME" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchType("NAME")}
              >
                {t('fmcsa_lookup_modal.search_types.name')}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="fmcsa-search">
                  {getLabelForSearchType()}
                </Label>
                <Input
                  id="fmcsa-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={getPlaceholderForSearchType()}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                type="button"
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="mt-6"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Multiple Companies Selection */}
          {showCompanies && companies.length > 0 && (
            <div className="p-6 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Empresas Encontradas</h3>
                <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                  Volver
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Se encontraron {companies.length} empresas. Selecciona la que corresponde:
              </p>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {companies.map((company, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCompany(company)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{company.name}</h4>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {company.dotNumber && (
                            <span>DOT: {company.dotNumber}</span>
                          )}
                          {company.mcNumber && (
                            <span>MC: {company.mcNumber}</span>
                          )}
                        </div>
                        {company.physicalAddress && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {company.physicalAddress}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {data && (
            <div className="p-6 bg-muted rounded-lg">
              <h3 className="font-semibold mb-4 text-lg">{t('fmcsa_lookup_modal.results.title')}</h3>
              
              {/* Información Básica */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">{t('fmcsa_lookup_modal.results.sections.company')}</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.legal_name')}</span> {data.legalName || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.mc_number')}</span> {data.mcNumber || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.dot_number')}</span> {data.dotNumber || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.entity')}</span> {data.entityType || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.dba')}</span> {data.dba || t('fmcsa_lookup_modal.results.no_dba')}
                  </div>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">{t('fmcsa_lookup_modal.results.sections.address')}</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.physical_address')}</span>
                    <br />
                    {data.physicalAddress || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.phone')}</span> {data.phone || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                </div>
              </div>

              {/* Estado de Operación */}
              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-primary">{t('fmcsa_lookup_modal.results.sections.operation_status')}</h4>
                <div className="grid grid-cols-1 gap-3 text-sm pl-4">
                  <div>
                    <span className="font-medium">{t('fmcsa_lookup_modal.results.fields.usdot_status')}</span> {data.usdotStatus || t('fmcsa_lookup_modal.results.no_data')}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleApplyData} 
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('fmcsa_lookup_modal.buttons.apply_data')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                >
                  {t('fmcsa_lookup_modal.buttons.cancel')}
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              {t('fmcsa_lookup_modal.disclaimer')}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}