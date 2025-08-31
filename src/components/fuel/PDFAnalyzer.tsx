import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, Info, Loader2, User, Calendar, CreditCard, MapPin, Fuel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';
import { useTranslation } from 'react-i18next';

import { formatDateInUserTimeZone, formatDateSafe } from '@/lib/dateFormatting';

interface AnalysisResult {
  columnsFound: string[];
  hasAuthorizationCode: boolean;
  authorizationCodeField: string | null;
  sampleData: Array<Record<string, any>>;
  analysis: string;
}

interface EnrichedTransaction {
  // Datos originales del PDF
  date: string;
  card: string;
  unit: string;
  invoice: string;
  location_name: string;
  state: string;
  category?: string;
  qty: number;
  gross_ppg: number;
  gross_amt: number;
  disc_amt: number;
  fees: number;
  total_amt: number;
  
  // Datos enriquecidos
  driver_name?: string;
  driver_user_id?: string;
  payment_period_id?: string;
  payment_period_dates?: string;
  vehicle_id?: string;
  vehicle_number?: string; // Para mostrar el número de equipo en la UI
  card_mapping_status: 'found' | 'not_found' | 'multiple';
  period_mapping_status: 'found' | 'not_found' | 'will_create';
  import_status: 'not_imported' | 'already_imported';
  equipment_mapping_method?: 'assigned_to_driver' | 'pdf_unit_validated' | 'unit_not_found';
  needs_attention?: boolean;
  attention_reason?: string;
}

export function PDFAnalyzer() {
  const { t } = useTranslation('fuel');
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [enrichedTransactions, setEnrichedTransactions] = useState<EnrichedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setAnalysisResult(null);
    } else {
      showError(
        t('analyzer.upload.invalid_file'),
        t('analyzer.upload.select_pdf_error')
      );
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzePDF = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const base64Data = await convertFileToBase64(selectedFile);
      
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: { pdfBase64: base64Data }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setAnalysisResult(data.analysis);
        await enrichTransactions(data.analysis.sampleData);
        showSuccess(
          t('analyzer.results.analysis_complete'),
          t('analyzer.results.analysis_success')
        );
      } else {
        throw new Error(data.error || 'Error analyzing PDF');
      }
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      showError(
        t('analyzer.upload.analysis_error'),
        t('analyzer.upload.analysis_retry')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Función para calcular las fechas del período que se crearía
  const calculatePeriodDates = (date: Date, companyId: string) => {
    // Usar configuración semanal por defecto (esto podría mejorarse obteniendo la configuración real de la empresa)
    const frequency = 'weekly';
    const frequencyDays = 7;
    
    // Encontrar el lunes de la semana de la fecha seleccionada
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, etc.
    let daysToMonday;
    
    if (dayOfWeek === 0) { // Domingo
      daysToMonday = 6; // Retroceder 6 días para llegar al lunes anterior
    } else {
      daysToMonday = dayOfWeek - 1; // Retroceder los días necesarios para llegar al lunes
    }
    
    const periodStart = new Date(date);
    periodStart.setDate(date.getDate() - daysToMonday);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + frequencyDays - 1);
    
    return {
      start: formatDateInUserTimeZone(periodStart),
      end: formatDateInUserTimeZone(periodEnd)
    };
  };

  const enrichTransactions = async (transactions: Array<Record<string, any>>) => {
    if (!user) return;
    
    setIsEnriching(true);
    try {
      // Obtener todas las tarjetas de la empresa
      const { data: userCompanies } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userCompanies?.length) return;

      const companyId = userCompanies[0].company_id;

      // Obtener equipos de la empresa (solo camiones para combustible)
      const { data: companyEquipment } = await supabase
        .from('company_equipment')
        .select('id, equipment_number, equipment_type, make, model, year')
        .eq('company_id', companyId)
        .eq('equipment_type', 'truck')
        .eq('status', 'active');

      // Obtener asignaciones de equipos (solo camiones para combustible)
      const { data: equipmentAssignments } = await supabase
        .from('equipment_assignments')
        .select(`
          equipment_id,
          driver_user_id,
          assigned_date,
          unassigned_date,
          is_active,
          company_equipment!inner(
            id,
            equipment_number,
            equipment_type,
            company_id,
            make,
            model,
            year
          )
        `)
        .eq('company_equipment.company_id', companyId)
        .eq('company_equipment.equipment_type', 'truck')
        .eq('is_active', true);

      // Obtener tarjetas de conductores
      // Debug logs removed to prevent Sentry spam
      
      const { data: driverCards, error: cardsError } = await supabase
        .from('driver_fuel_cards')
        .select(`
          card_number_last_five,
          card_identifier,
          driver_user_id
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Debug logs removed to prevent Sentry spam

      // Intentar obtener nombres de perfiles, si no, usar emails como fallback
      const driverIds = driverCards?.map(card => card.driver_user_id) || [];
      
      const { data: driverProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverIds);

      // Obtener emails de los conductores de la tabla user_company_roles
      const { data: driverRoles } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('role', 'driver')
        .eq('is_active', true)
        .in('user_id', driverIds);

      // Obtener períodos de pago de la empresa
      const { data: companyPeriods } = await supabase
        .from('company_payment_periods')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'open');

      // Obtener gastos de combustible existentes para verificar duplicados
      const { data: existingFuelExpenses } = await supabase
        .from('fuel_expenses')
        .select('transaction_date, invoice_number, card_last_five, total_amount, station_name')
        .in('driver_user_id', driverIds);

      // Procesar cada transacción de manera secuencial para manejar async
      const enriched: EnrichedTransaction[] = [];
      
      for (const transaction of transactions) {
        const enrichedTransaction: EnrichedTransaction = {
          date: transaction.date,
          card: transaction.card,
          unit: transaction.unit,
          invoice: transaction.invoice,
          location_name: transaction.location_name,
          state: transaction.state,
          category: transaction.category || 'Diesel',
          qty: parseFloat(transaction.qty) || 0,
          gross_ppg: parseFloat(transaction.gross_ppg) || 0,
          gross_amt: parseFloat(transaction.gross_amt) || 0,
          disc_amt: parseFloat(transaction.disc_amt) || 0,
          fees: parseFloat(transaction.fees) || 0,
          total_amt: parseFloat(transaction.total_amt) || 0,
          card_mapping_status: 'not_found',
          period_mapping_status: 'not_found',
          import_status: 'not_imported'
        };

        // Verificar si la transacción ya existe en la base de datos
        const txnDateStr = transaction.date; // ✅ Usar directamente fecha YYYY-MM-DD del PDF
        const existingTransaction = existingFuelExpenses?.find(existing => {
          const existingDate = existing.transaction_date.split('T')[0]; // ✅ Solo parte de fecha
          const sameDate = existingDate === txnDateStr;
          const sameInvoice = existing.invoice_number === transaction.invoice;
          const sameCard = existing.card_last_five?.includes(transaction.card.slice(-5)) || 
                          existing.card_last_five === transaction.card.slice(-5);
          const sameAmount = Math.abs(parseFloat(existing.total_amount.toString()) - parseFloat(transaction.total_amt.toString())) < 0.01;
          const sameStation = existing.station_name === transaction.location_name;
          
          // Considerar duplicado si coinciden al menos 3 de estos criterios
          const matches = [sameDate, sameInvoice, sameCard, sameAmount, sameStation].filter(Boolean).length;
          return matches >= 3;
        });

        if (existingTransaction) {
          enrichedTransaction.import_status = 'already_imported';
        }

        // Mapear conductor por tarjeta (flexible con 4 o 5 dígitos)
        const cardNumber = transaction.card;
        
        // Debug logs removed to prevent Sentry spam
        
        const matchingCards = driverCards?.filter(card => {
          // Comparar los últimos 5 dígitos almacenados con los últimos 4 o 5 de la transacción
          const cardLast5 = card.card_number_last_five;
          const transactionLast4 = cardNumber.slice(-4);
          const transactionLast5 = cardNumber.slice(-5);
          
          const match1 = cardLast5 === transactionLast5;
          const match2 = cardLast5?.slice(-4) === transactionLast4;
          const match3 = card.card_identifier === transactionLast4;
          const match4 = card.card_identifier === transactionLast5;
          const match5 = card.card_identifier === cardNumber;
          
          const isMatch = match1 || match2 || match3 || match4 || match5;
          
          // Debug logs removed to prevent Sentry spam
          
          return isMatch;
        }) || [];

        // Debug logs removed to prevent Sentry spam

        if (matchingCards.length === 1) {
          const card = matchingCards[0];
          const driverProfile = driverProfiles?.find(profile => profile.user_id === card.driver_user_id);
          enrichedTransaction.driver_user_id = card.driver_user_id;
          
          if (driverProfile && driverProfile.first_name) {
            const firstName = driverProfile.first_name || '';
            const lastName = driverProfile.last_name || '';
            enrichedTransaction.driver_name = `${firstName} ${lastName}`.trim();
          } else {
            // Si no hay perfil, usar un nombre basado en tarjeta o ID genérico
            enrichedTransaction.driver_name = `Conductor Tarjeta ${card.card_number_last_five}`;
          }
          
          // Debug logs removed to prevent Sentry spam
        } else if (matchingCards.length > 1) {
          enrichedTransaction.card_mapping_status = 'multiple';
          // Debug logs removed to prevent Sentry spam
        } else {
          // Debug logs removed to prevent Sentry spam
        }
        const periodTransactionDate = new Date(transaction.date);
        
        let matchingPeriod = companyPeriods?.find(period => {
          const startDate = new Date(period.period_start_date);
          const endDate = new Date(period.period_end_date);
          return periodTransactionDate >= startDate && periodTransactionDate <= endDate;
        });

        if (matchingPeriod && enrichedTransaction.driver_user_id) {
          // Período existente encontrado - buscar el driver_period_calculation correspondiente
          const { data: driverPeriod } = await supabase
            .from('driver_period_calculations')
            .select('id')
            .eq('driver_user_id', enrichedTransaction.driver_user_id)
            .eq('company_payment_period_id', matchingPeriod.id)
            .maybeSingle();

          if (driverPeriod) {
            enrichedTransaction.payment_period_id = driverPeriod.id;
            enrichedTransaction.payment_period_dates = `${matchingPeriod.period_start_date} - ${matchingPeriod.period_end_date}`;
            enrichedTransaction.period_mapping_status = 'found';
          } else {
            // Si existe el company period pero no el driver period, usar las fechas del período existente
            enrichedTransaction.period_mapping_status = 'will_create';
            enrichedTransaction.payment_period_dates = `${matchingPeriod.period_start_date} - ${matchingPeriod.period_end_date}`;
          }
        } else {
          // Calcular qué período se crearía (sin crearlo)
          if (enrichedTransaction.driver_user_id && companyId) {
            const calculatedPeriod = calculatePeriodDates(periodTransactionDate, companyId);
            enrichedTransaction.payment_period_dates = `${calculatedPeriod.start} - ${calculatedPeriod.end} (nuevo período)`;
            enrichedTransaction.period_mapping_status = 'will_create';
          } else {
            enrichedTransaction.period_mapping_status = 'not_found';
          }
        }

        // Mapear vehículo usando lógica robusta
        const equipmentNumber = transaction.unit;
        const transactionDate = new Date(transaction.date);
        
        // Prioridad 1: Buscar equipo asignado al conductor en la fecha de transacción
        let assignedEquipment = null;
        if (enrichedTransaction.driver_user_id) {
          assignedEquipment = equipmentAssignments?.find(assignment => {
            const assignedDate = new Date(assignment.assigned_date);
            const unassignedDate = assignment.unassigned_date ? new Date(assignment.unassigned_date) : null;
            
            return assignment.driver_user_id === enrichedTransaction.driver_user_id &&
                   transactionDate >= assignedDate &&
                   (unassignedDate === null || transactionDate <= unassignedDate);
          });
        }
        
        if (assignedEquipment) {
          // Usar el equipo asignado al conductor
          enrichedTransaction.vehicle_id = assignedEquipment.equipment_id;
          enrichedTransaction.vehicle_number = assignedEquipment.company_equipment.equipment_number;
          enrichedTransaction.equipment_mapping_method = 'assigned_to_driver';
        } else {
          // Prioridad 2: Validar el UNIT del PDF contra equipos de la empresa
          const matchingEquipment = companyEquipment?.find(equipment => 
            equipment.equipment_number === String(equipmentNumber)
          );
          
          if (matchingEquipment) {
            enrichedTransaction.vehicle_id = matchingEquipment.id;
            enrichedTransaction.vehicle_number = matchingEquipment.equipment_number;
            enrichedTransaction.equipment_mapping_method = 'pdf_unit_validated';
          } else {
            // Fallback: UNIT no válido, marcar para atención manual
            enrichedTransaction.vehicle_id = null;
            enrichedTransaction.vehicle_number = equipmentNumber;
            enrichedTransaction.equipment_mapping_method = 'unit_not_found';
            enrichedTransaction.needs_attention = true;
            enrichedTransaction.attention_reason = `UNIT ${equipmentNumber} no encontrado en camiones de la empresa (solo camiones pueden usar combustible)`;
          }
        }

        enriched.push(enrichedTransaction);
      }

      setEnrichedTransactions(enriched);
    } catch (error) {
      console.error('Error enriching transactions:', error);
      showError(
        "Error enriqueciendo datos",
        "No se pudieron mapear todos los datos automáticamente"
      );
    } finally {
      setIsEnriching(false);
    }
  };

  const importTransactions = async () => {
    // Debug logs removed to prevent Sentry spam
    setIsImporting(true);
    try {
      const validTransactions = enrichedTransactions.filter(
        t => t.card_mapping_status === 'found' && 
             (t.period_mapping_status === 'found' || t.period_mapping_status === 'will_create') && 
             t.import_status === 'not_imported'
      );
      
      // Debug logs removed to prevent Sentry spam

      if (validTransactions.length === 0) {
        showError(
          "Sin transacciones válidas",
          "No hay transacciones con mapeo completo para importar"
        );
        return;
      }

      // Crear períodos automáticamente para transacciones que los necesiten
      for (const transaction of validTransactions) {
        if (transaction.period_mapping_status === 'will_create' && transaction.driver_user_id) {
          // ✅ Usar función UTC segura para fechas de base de datos
          const targetDate = transaction.date; // Ya viene en formato YYYY-MM-DD del PDF
          
          // Obtener companyId del usuario
          const { data: userCompanies } = await supabase
            .from('user_company_roles')
            .select('company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);
          
          if (userCompanies?.[0]) {
            const generatedCompanyPeriodId = await ensurePaymentPeriodExists({
              companyId: userCompanies[0].company_id,
              userId: transaction.driver_user_id,
              targetDate
            });
            
            if (generatedCompanyPeriodId) {
              // The ensurePaymentPeriodExists returns a driver_period_calculation ID
              // but we need the company_payment_period_id for the RPC function
              const { data: driverPeriod } = await supabase
                .from('driver_period_calculations')
                .select('company_payment_period_id')
                .eq('id', generatedCompanyPeriodId)
                .single();
              
              if (driverPeriod) {
                transaction.payment_period_id = driverPeriod.company_payment_period_id;
                // Debug logs removed to prevent Sentry spam
              }
            }
          }
        }
      }

      // Insertar transacciones una por una usando la función RPC ACID
      for (const transaction of validTransactions) {
        const fuelExpenseData = {
          driver_user_id: transaction.driver_user_id!,
          payment_period_id: transaction.payment_period_id!,
          transaction_date: transaction.date, // ✅ Usar fecha directamente en formato YYYY-MM-DD
          fuel_type: transaction.category?.toLowerCase() || 'diesel',
          gallons_purchased: Number(transaction.qty),
          price_per_gallon: Number(transaction.gross_ppg),
          gross_amount: Number(transaction.gross_amt),
          discount_amount: Number(transaction.disc_amt) || 0,
          fees: Number(transaction.fees) || 0,
          total_amount: Number(transaction.total_amt),
          station_name: transaction.location_name,
          station_state: transaction.state,
          card_last_five: transaction.card.slice(-5),
          invoice_number: transaction.invoice,
          status: 'pending'
        };

        // Debug logs removed to prevent Sentry spam
        
        const { data, error } = await supabase.rpc('create_or_update_fuel_expense_with_validation', {
          expense_data: fuelExpenseData,
          expense_id: null
        });

        if (error) {
          console.error('❌ Error creating fuel expense:', error);
          throw error;
        }

        // Debug logs removed to prevent Sentry spam
      }

      showSuccess(
        "Importación exitosa",
        `Se importaron ${validTransactions.length} transacciones de combustible`
      );

      // Limpiar datos después de la importación
      setAnalysisResult(null);
      setEnrichedTransactions([]);
      setSelectedFile(null);

    } catch (error) {
      console.error('Error importing transactions:', error);
      showError(
        "Error en la importación",
        "No se pudieron importar las transacciones"
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('analyzer.page.title')}
          </CardTitle>
          <CardDescription>
            {t('analyzer.page.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            <Button 
              onClick={analyzePDF} 
              disabled={!selectedFile || isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isAnalyzing ? t('analyzer.upload.analyzing') : t('analyzer.upload.analyze_pdf')}
            </Button>
          </div>

          {selectedFile && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {analysisResult && (
        <div className="space-y-6">
          {/* Resumen del análisis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {analysisResult.hasAuthorizationCode ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Info className="h-5 w-5 text-blue-500" />
                )}
                Resultado del Análisis
              </CardTitle>
              <CardDescription>
                Se encontraron {enrichedTransactions.length} transacciones de combustible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {enrichedTransactions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Transacciones</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {enrichedTransactions.filter(t => t.import_status === 'already_imported').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Ya importadas</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {enrichedTransactions.filter(t => 
                      t.card_mapping_status === 'found' && 
                      (t.period_mapping_status === 'found' || t.period_mapping_status === 'will_create') && 
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Listas para importar</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {enrichedTransactions.filter(t => 
                      t.card_mapping_status === 'not_found' && 
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sin conductor identificado</div>
                </div>
              </div>

              {enrichedTransactions.filter(t => 
                t.card_mapping_status === 'found' && 
                (t.period_mapping_status === 'found' || t.period_mapping_status === 'will_create') && 
                t.import_status === 'not_imported'
              ).length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    onClick={importTransactions} 
                    disabled={isImporting}
                    className="flex items-center gap-2"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isImporting ? t('analyzer.results.importing') : t('analyzer.results.import_transactions')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transacciones en tarjetas */}
          {isEnriching ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('analyzer.results.enriching_transactions')}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('analyzer.results.enrichment')}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {enrichedTransactions.map((transaction, index) => (
                  <Card key={index} className={`bg-white
                    ${transaction.import_status === 'already_imported' 
                      ? 'border-gray-200 opacity-75' 
                    : transaction.card_mapping_status === 'found' && (transaction.period_mapping_status === 'found' || transaction.period_mapping_status === 'will_create')
                      ? 'border-green-200' 
                      : 'border-orange-200'}
                  `}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Fuel className="h-4 w-4" />
                          Transacción #{index + 1}
                        </CardTitle>
                        <div className="flex gap-1">
                          {transaction.import_status === 'already_imported' ? (
                            <Badge variant="secondary">{t('analyzer.mapping.already_imported')}</Badge>
                          ) : (
                            <>
                              <Badge variant={transaction.card_mapping_status === 'found' ? 'default' : 'destructive'}>
                                {transaction.card_mapping_status === 'found' ? t('analyzer.mapping.driver_found') : 
                                 transaction.card_mapping_status === 'multiple' ? t('analyzer.mapping.multiple_drivers') : t('analyzer.mapping.driver_not_found')}
                              </Badge>
                              {transaction.period_mapping_status === 'found' && (
                                <Badge variant="default">
                                  {t('analyzer.mapping.period_found')}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Información del conductor */}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {transaction.driver_name || t('analyzer.mapping.driver_not_found')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tarjeta: {transaction.card}
                          </div>
                        </div>
                      </div>

                      {/* Información del período */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {transaction.payment_period_dates || 'Período no generado'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Fecha transacción: {transaction.date}
                          </div>
                        </div>
                      </div>

                      {/* Información de la estación */}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{transaction.location_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {transaction.state} • {transaction.category}
                          </div>
                        </div>
                      </div>

                      {/* Detalles financieros */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <div className="text-sm text-muted-foreground">{t('analyzer.table.gallons')}</div>
                          <div className="font-medium">{transaction.qty.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('analyzer.table.price')}</div>
                          <div className="font-medium">${transaction.gross_ppg.toFixed(3)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Monto Bruto</div>
                          <div className="font-medium">${transaction.gross_amt.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Descuento</div>
                          <div className="font-medium text-green-600">-${transaction.disc_amt.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Comisiones</div>
                          <div className="font-medium text-red-600">${transaction.fees.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('analyzer.table.total')}</div>
                          <div className="font-bold text-lg">${transaction.total_amt.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Información del vehículo (camión) */}
                      {transaction.vehicle_id && (
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              🚛 Camión #{transaction.vehicle_number}
                              <Badge variant="outline" className="text-xs">
                                {transaction.equipment_mapping_method === 'assigned_to_driver' ? t('analyzer.mapping.vehicle_assigned') : t('analyzer.mapping.vehicle_validated')}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                            Vehículo verificado para combustible
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Alertas de atención */}
                      {transaction.needs_attention && (
                        <Alert className="border-orange-200 bg-orange-50">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {transaction.attention_reason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Información adicional */}
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <div>Factura: {transaction.invoice}</div>
                        <div>Unidad del PDF: {transaction.unit}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}