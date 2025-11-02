import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, Info, Loader2, User, Calendar, CreditCard, MapPin, Fuel } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useFleetNotifications } from '@/components/notifications';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';
import { formatPeriodLabel } from '@/utils/periodUtils';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { pdfjs } from 'react-pdf';
import { pdfService } from '@/lib/pdfService';

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
  city?: string; // ✅ Agregar campo para ciudad
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
  import_status: 'not_imported' | 'already_imported' | 'period_paid';
  equipment_mapping_method?: 'assigned_to_driver' | 'pdf_unit_validated' | 'unit_not_found';
  needs_attention?: boolean;
  attention_reason?: string;
  period_status?: string; // Estado del período (open, calculated, paid)
}

export function PDFAnalyzer() {
  const { t } = useTranslation('fuel');
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useFleetNotifications();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  const queryClient = useQueryClient();
  
  // Configure PDF.js worker on component mount
  useEffect(() => {
    pdfService.ensureWorker();
  }, []);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'extracting' | 'analyzing' | 'enriching' | ''>('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [enrichedTransactions, setEnrichedTransactions] = useState<EnrichedTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());

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

  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Ensure worker is configured before using PDF.js
          pdfService.ensureWorker();
          
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;

          let fullText = '';
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            fullText += `\n=== PÁGINA ${pageNum} ===\n${pageText}\n`;
          }

          resolve(fullText);
        } catch (error) {
          console.error('Error extrayendo texto del PDF:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const analyzePDF = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setCurrentStep('extracting');
    setAnalysisStep(t('analyzer.upload.extracting_text'));
    
    try {
      const pdfText = await extractTextFromPDF(selectedFile);
      
      setCurrentStep('analyzing');
      setAnalysisStep(t('analyzer.upload.analyzing_with_ai'));
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: { pdfText }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        const transactionCount = data.analysis.sampleData?.length || 0;
        
        setAnalysisResult(data.analysis);
        setCurrentStep('enriching');
        setAnalysisStep(t('analyzer.upload.enriching_count', { count: transactionCount }));
        await enrichTransactions(data.analysis.sampleData);
        setSelectedTransactions(new Set()); // Reset selection
        
        showSuccess(
          t('analyzer.results.analysis_complete'),
          `${t('analyzer.results.analysis_success')} (${transactionCount} ${t('analyzer.results.transactions_unit')})`
        );
        
        // Advertir si se acerca al límite de procesamiento
        if (transactionCount >= 90) {
          showWarning(
            t('analyzer.upload.limit_reached_title'),
            t('analyzer.upload.limit_reached_message')
          );
        }
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
      setAnalysisStep('');
      setCurrentStep('');
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
      // Obtener company_id
      const { data: userCompanies } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userCompanies?.length) return;

      const companyId = userCompanies[0].company_id;

      // ⚡ OPTIMIZACIÓN: Paralelizar todas las queries
      const [
        { data: companyEquipment },
        { data: equipmentAssignments },
        { data: driverCards },
        { data: companyPeriods },
      ] = await Promise.all([
        // Equipos de la empresa
        supabase
          .from('company_equipment')
          .select('id, equipment_number, equipment_type, make, model, year')
          .eq('company_id', companyId)
          .eq('equipment_type', 'truck')
          .eq('status', 'active'),
        
        // Asignaciones de equipos
        supabase
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
          .eq('is_active', true),
        
        // Tarjetas de conductores
        supabase
          .from('driver_fuel_cards')
          .select(`
            card_number_last_five,
            card_identifier,
            driver_user_id
          `)
          .eq('company_id', companyId)
          .eq('is_active', true),
        
        // Períodos de pago
        supabase
          .from('company_payment_periods')
          .select('id, period_start_date, period_end_date')
          .eq('company_id', companyId)
      ]);

      // Segunda ronda de queries que dependen de driverIds
      const driverIds = driverCards?.map(card => card.driver_user_id) || [];
      
      const [
        { data: driverProfiles },
        { data: userPayrolls },
        { data: existingFuelExpenses }
      ] = await Promise.all([
        // Perfiles de conductores
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', driverIds),
        
        // User payrolls
        supabase
          .from('user_payrolls')
          .select('id, user_id, company_payment_period_id, payment_status')
          .eq('company_id', companyId)
          .in('user_id', driverIds),
        
        // Gastos existentes para detectar duplicados
        supabase
          .from('fuel_expenses')
          .select('transaction_date, invoice_number, card_last_five, total_amount, station_name')
          .in('driver_user_id', driverIds)
      ]);
      
      // Define type for enriched payroll data
      type PayrollWithPeriod = {
        id: string;
        user_id: string;
        company_payment_period_id: string;
        payment_status?: string;
        period?: {
          id: string;
          period_start_date: string;
          period_end_date: string;
        };
      } & Record<string, any>;
      
      // Crear estructura combinada: cada conductor con todos los períodos de la empresa
      const userPeriods: PayrollWithPeriod[] = [];
      
      if (companyPeriods) {
        for (const driverId of driverIds) {
          for (const period of companyPeriods) {
            const existingPayroll = userPayrolls?.find(
              p => p.user_id === driverId && p.company_payment_period_id === period.id
            );
            
            userPeriods.push({
              id: existingPayroll?.id || `virtual-${driverId}-${period.id}`,
              user_id: driverId,
              company_payment_period_id: period.id,
              payment_status: existingPayroll?.payment_status,
              period: {
                id: period.id,
                period_start_date: period.period_start_date,
                period_end_date: period.period_end_date
              }
            });
          }
        }
      }

      // Procesar cada transacción de manera secuencial para manejar async
      const enriched: EnrichedTransaction[] = [];
      
      for (const transaction of transactions) {
        // Calcular el total correcto: gross_amt + fees - disc_amt
        const grossAmt = parseFloat(transaction.gross_amt) || 0;
        const fees = parseFloat(transaction.fees) || 0;
        const discAmt = parseFloat(transaction.disc_amt) || 0;
        const calculatedTotal = grossAmt + fees - discAmt;

        const enrichedTransaction: EnrichedTransaction = {
          date: transaction.date,
          card: transaction.card,
          unit: transaction.unit,
          invoice: transaction.invoice,
          location_name: transaction.location_name,
          city: transaction.city, // ✅ Capturar ciudad desde el análisis del PDF
          state: transaction.state,
          category: transaction.category || 'Diesel',
          qty: parseFloat(transaction.qty) || 0,
          gross_ppg: parseFloat(transaction.gross_ppg) || 0,
          gross_amt: grossAmt,
          disc_amt: discAmt,
          fees: fees,
          total_amt: calculatedTotal, // ✅ Usar el total calculado correctamente
          card_mapping_status: 'not_found',
          period_mapping_status: 'not_found',
          import_status: 'not_imported'
        };

        // Verificar si la transacción ya existe en la base de datos (solo fecha + factura)
        const txnDateStr = transaction.date;
        const existingTransaction = existingFuelExpenses?.find(existing => {
          const existingDate = existing.transaction_date.split('T')[0];
          const sameDate = existingDate === txnDateStr;
          const sameInvoice = existing.invoice_number === transaction.invoice;
          
          // Solo considerar duplicado si fecha Y factura coinciden
          return sameDate && sameInvoice;
        });

        if (existingTransaction) {
          enrichedTransaction.import_status = 'already_imported';
          enrichedTransaction.attention_reason = 'Duplicado detectado en el sistema';
        }

        // Mapear conductor por tarjeta (flexible con 4 o 5 dígitos)
        const cardNumber = transaction.card;
        
        const matchingCards = driverCards?.filter(card => {
          const cardLast5 = card.card_number_last_five;
          const transactionLast4 = cardNumber.slice(-4);
          const transactionLast5 = cardNumber.slice(-5);
          
          return cardLast5 === transactionLast5 ||
                 cardLast5?.slice(-4) === transactionLast4 ||
                 card.card_identifier === transactionLast4 ||
                 card.card_identifier === transactionLast5 ||
                 card.card_identifier === cardNumber;
        }) || [];

        if (matchingCards.length === 1) {
          const card = matchingCards[0];
          const driverProfile = driverProfiles?.find(profile => profile.user_id === card.driver_user_id);
          enrichedTransaction.driver_user_id = card.driver_user_id;
          enrichedTransaction.card_mapping_status = 'found';
          
          if (driverProfile && driverProfile.first_name) {
            const firstName = driverProfile.first_name || '';
            const lastName = driverProfile.last_name || '';
            enrichedTransaction.driver_name = `${firstName} ${lastName}`.trim();
          } else {
            enrichedTransaction.driver_name = `Conductor Tarjeta ${card.card_number_last_five}`;
          }
        } else if (matchingCards.length > 1) {
          enrichedTransaction.card_mapping_status = 'multiple';
        }
        const periodTransactionDate = new Date(transaction.date);
        
        // Find matching period for this driver
        let matchingPeriod = userPeriods?.find(period => {
          if (!period.period?.period_start_date || !period.period?.period_end_date) return false;
          const startDate = new Date(period.period.period_start_date);
          const endDate = new Date(period.period.period_end_date);
          return periodTransactionDate >= startDate && 
                 periodTransactionDate <= endDate &&
                 period.user_id === enrichedTransaction.driver_user_id;
        });

        if (matchingPeriod && matchingPeriod.period) {
          enrichedTransaction.payment_period_id = matchingPeriod.id;
          const startDate = matchingPeriod.period.period_start_date;
          const endDate = matchingPeriod.period.period_end_date;
          const formattedLabel = formatPeriodLabel(startDate, endDate);
          const shortStart = startDate.substring(5); // MM-DD
          const shortEnd = endDate.substring(5); // MM-DD
          enrichedTransaction.payment_period_dates = `${formattedLabel} (${shortStart} - ${shortEnd})`;
          enrichedTransaction.period_mapping_status = 'found';
          enrichedTransaction.period_status = matchingPeriod.payment_status;
          
          // Bloquear importación si el período está pagado (solo si NO está ya importada)
          if (matchingPeriod.payment_status === 'paid' && enrichedTransaction.import_status !== 'already_imported') {
            enrichedTransaction.import_status = 'period_paid';
          }
        } else {
          // Calcular qué período se crearía (sin crearlo)
          if (enrichedTransaction.driver_user_id && companyId) {
            const calculatedPeriod = calculatePeriodDates(periodTransactionDate, companyId);
            const formattedLabel = formatPeriodLabel(calculatedPeriod.start, calculatedPeriod.end);
            const shortStart = calculatedPeriod.start.substring(5); // MM-DD
            const shortEnd = calculatedPeriod.end.substring(5); // MM-DD
            enrichedTransaction.payment_period_dates = `${formattedLabel} (${shortStart} - ${shortEnd}) - nuevo período`;
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
        t('analyzer.upload.enrichment_error'),
        t('analyzer.upload.enrichment_failed')
      );
    } finally {
      setIsEnriching(false);
    }
  };

  const importTransactions = async () => {
    console.log('📦 [PDF Analyzer] Iniciando importación de transacciones');
    setIsImporting(true);
    try {
      const transactionsToImport = enrichedTransactions.filter(
        (t, index) => selectedTransactions.has(index) &&
                     t.card_mapping_status === 'found' && 
                     t.import_status === 'not_imported' &&
                     t.period_status !== 'paid'
      );
      
      console.log('📦 [PDF Analyzer] Transacciones seleccionadas para importar:', transactionsToImport.length);

      if (transactionsToImport.length === 0) {
        showError(
          t('analyzer.results.no_transactions_selected'),
          t('analyzer.results.select_transactions_to_import')
        );
        return;
      }

      // Crear períodos automáticamente para transacciones que los necesiten
      console.log('📦 [PDF Analyzer] Verificando períodos de pago...');
      
      for (const transaction of transactionsToImport) {
        console.log('📦 [PDF Analyzer] Procesando transacción:', {
          date: transaction.date,
          driver: transaction.driver_name,
          period_status: transaction.period_mapping_status,
          payment_period_id: transaction.payment_period_id
        });
        
        if (transaction.period_mapping_status === 'will_create' && transaction.driver_user_id) {
          console.log('🔄 [PDF Analyzer] Creando período para transacción del', transaction.date);
          
          const targetDate = transaction.date; // Ya viene en formato YYYY-MM-DD del PDF
          
          // Obtener companyId del usuario
          const { data: userCompanies } = await supabase
            .from('user_company_roles')
            .select('company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);
          
          if (userCompanies?.[0]) {
            const userPayrollId = await ensurePaymentPeriodExists({
              companyId: userCompanies[0].company_id,
              userId: transaction.driver_user_id,
              targetDate
            });
            
            console.log('📦 [PDF Analyzer] Período creado/encontrado:', userPayrollId);
            
            if (userPayrollId) {
              transaction.payment_period_id = userPayrollId;
              transaction.period_mapping_status = 'found';
            } else {
              console.error('❌ [PDF Analyzer] No se pudo crear el período para', transaction.date);
            }
          }
        }
      }
      
      // Validar que todas las transacciones seleccionadas tengan payment_period_id
      const transactionsWithoutPeriod = transactionsToImport.filter(t => !t.payment_period_id);
      if (transactionsWithoutPeriod.length > 0) {
        console.error('❌ [PDF Analyzer] Transacciones sin período:', transactionsWithoutPeriod);
        showError(
          "Error en períodos de pago",
          `${transactionsWithoutPeriod.length} transacciones no tienen período de pago asignado. Verifica la configuración de períodos.`
        );
        return;
      }

      // Insertar transacciones una por una usando la función RPC ACID
      console.log('📦 [PDF Analyzer] Importando', transactionsToImport.length, 'transacciones...');
      let importedCount = 0;
      
      for (const transaction of transactionsToImport) {
        const fuelExpenseData = {
          driver_user_id: transaction.driver_user_id!,
          payment_period_id: transaction.payment_period_id!,
          transaction_date: transaction.date,
          fuel_type: transaction.category?.toLowerCase() || 'diesel',
          gallons_purchased: Number(transaction.qty),
          price_per_gallon: Number(transaction.gross_ppg),
          gross_amount: Number(transaction.gross_amt),
          discount_amount: Number(transaction.disc_amt) || 0,
          fees: Number(transaction.fees) || 0,
          total_amount: Number(transaction.total_amt),
          station_name: transaction.location_name,
          station_city: transaction.city,
          station_state: transaction.state,
          card_last_five: transaction.card.slice(-5),
          invoice_number: transaction.invoice,
          status: 'pending'
        };

        console.log('📦 [PDF Analyzer] Importando transacción:', {
          date: transaction.date,
          driver: transaction.driver_name,
          amount: transaction.total_amt,
          payment_period_id: transaction.payment_period_id
        });
        
        const { data, error } = await supabase.rpc('create_or_update_fuel_expense_with_validation', {
          expense_data: fuelExpenseData,
          expense_id: null
        });

        if (error) {
          console.error('❌ [PDF Analyzer] Error creando gasto:', error);
          throw error;
        }

        console.log('✅ [PDF Analyzer] Transacción importada exitosamente:', data);
        importedCount++;
      }
      
      console.log('✅ [PDF Analyzer] Importación completada:', importedCount, 'transacciones');

      showSuccess(
        t('analyzer.results.import_success'),
        t('analyzer.results.transactions_imported', { count: transactionsToImport.length })
      );

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats'] });
      queryClient.invalidateQueries({ queryKey: ['payment-periods'] });
      queryClient.invalidateQueries({ queryKey: ['available-weeks'] });
      queryClient.invalidateQueries({ queryKey: ['user-period-calculations'] });
      queryClient.invalidateQueries({ queryKey: ['payment-period-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-payment-periods-summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculation-detail'] });
      queryClient.invalidateQueries({ queryKey: ['payment-calculations-reports'] });
      queryClient.invalidateQueries({ queryKey: ['period-fuel-expenses'] });

      // Reset selection and reload
      setSelectedTransactions(new Set());
      setSelectedFile(null);
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

  const importableTransactions = enrichedTransactions.filter(
    t => t.card_mapping_status === 'found' && 
         t.import_status === 'not_imported'
  );

  const toggleTransactionSelection = (index: number) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTransactions(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === importableTransactions.length) {
      // Deselect all
      setSelectedTransactions(new Set());
    } else {
      // Select all importable
      const allImportableIndices = new Set(
        enrichedTransactions
          .map((t, index) => ({ t, index }))
          .filter(({ t }) => t.card_mapping_status === 'found' && t.import_status === 'not_imported')
          .map(({ index }) => index)
      );
      setSelectedTransactions(allImportableIndices);
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
          {/* Advertencia sobre el límite */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              {t('analyzer.upload.processing_limit_warning')}
            </AlertDescription>
          </Alert>

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
              {isAnalyzing ? analysisStep || t('analyzer.upload.analyzing') : t('analyzer.upload.analyze_pdf')}
            </Button>
          </div>

          {selectedFile && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                {t('analyzer.results.file_selected')} {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{analysisStep || t('analyzer.upload.analyzing')}</h3>
              <p className="text-sm text-muted-foreground">
                {currentStep === 'extracting' && t('analyzer.upload.reading_pdf')}
                {currentStep === 'analyzing' && t('analyzer.upload.ai_identifying')}
                {currentStep === 'enriching' && t('analyzer.upload.validating_data')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisResult && !isEnriching && (
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
                {t('analyzer.results.title')}
              </CardTitle>
              <CardDescription>
                {t('analyzer.results.transactions_found', { count: enrichedTransactions.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {enrichedTransactions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('analyzer.stats.transactions')}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {enrichedTransactions.filter(t => t.import_status === 'already_imported').length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('analyzer.stats.already_imported')}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {enrichedTransactions.filter(t => t.import_status === 'period_paid').length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('analyzer.stats.period_paid')}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {enrichedTransactions.filter(t => 
                      t.card_mapping_status === 'found' && 
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('analyzer.stats.ready_to_import')}</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {enrichedTransactions.filter(t => 
                      t.card_mapping_status === 'not_found' && 
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('analyzer.stats.no_driver_identified')}</div>
                </div>
              </div>

              {importableTransactions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTransactions.size === importableTransactions.length && importableTransactions.length > 0}
                        onCheckedChange={toggleSelectAll}
                        id="select-all"
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        {t('analyzer.selection.select_all')} ({importableTransactions.length})
                      </label>
                    </div>
                    {selectedTransactions.size > 0 && (
                      <Badge variant="secondary">
                        {t('analyzer.selection.selected', { count: selectedTransactions.size })}
                      </Badge>
                    )}
                  </div>
                  <Button 
                    onClick={importTransactions} 
                    disabled={isImporting || selectedTransactions.size === 0}
                    className="flex items-center gap-2 w-full"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isImporting 
                      ? t('analyzer.results.importing') 
                      : `${t('analyzer.results.import_transactions')} (${selectedTransactions.size})`
                    }
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
                  <Card key={index} className={`
                    ${transaction.import_status === 'already_imported' 
                      ? 'border-2 border-orange-400 bg-orange-50/50' 
                    : transaction.card_mapping_status === 'found'
                      ? 'border-green-200 bg-white' 
                      : 'border-orange-200 bg-white'}
                  `}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {transaction.card_mapping_status === 'found' && transaction.import_status === 'not_imported' && (
                            <Checkbox
                              checked={selectedTransactions.has(index)}
                              onCheckedChange={() => toggleTransactionSelection(index)}
                              id={`transaction-${index}`}
                            />
                          )}
                          <CardTitle className="text-base flex items-center gap-2">
                            <Fuel className="h-4 w-4" />
                            {t('analyzer.transaction.number', { number: index + 1 })}
                          </CardTitle>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {transaction.import_status === 'already_imported' ? (
                            <Badge variant="secondary" className="bg-orange-500 text-white">
                              {t('analyzer.mapping.already_imported')}
                            </Badge>
                          ) : transaction.import_status === 'period_paid' ? (
                            <Badge variant="destructive">{t('analyzer.mapping.period_paid')}</Badge>
                          ) : (
                            <Badge variant={transaction.card_mapping_status === 'found' ? 'default' : 'destructive'}>
                              {transaction.card_mapping_status === 'found' ? t('analyzer.mapping.driver_found') : 
                               transaction.card_mapping_status === 'multiple' ? t('analyzer.mapping.multiple_drivers') : t('analyzer.mapping.driver_not_found')}
                            </Badge>
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
                            {t('analyzer.transaction.card')} {transaction.card}
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
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {t('analyzer.transaction.transaction_date')} {transaction.date}
                            <Badge variant="secondary" className="text-xs">
                              {transaction.category}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Información de la estación */}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{transaction.location_name}</div>
                          {(transaction.city || transaction.state) && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.city && transaction.state 
                                ? `${transaction.city}, ${transaction.state}`
                                : transaction.city || transaction.state
                              }
                            </div>
                          )}
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
                          <div className="text-sm text-muted-foreground">{t('analyzer.transaction.gross_amount')}</div>
                          <div className="font-medium">${transaction.gross_amt.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('analyzer.transaction.discount')}</div>
                          <div className="font-medium text-green-600">-${transaction.disc_amt.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('analyzer.transaction.fees')}</div>
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
                              🚛 {t('analyzer.transaction.truck', { number: transaction.vehicle_number })}
                              <Badge variant="outline" className="text-xs">
                                {transaction.equipment_mapping_method === 'assigned_to_driver' ? t('analyzer.mapping.vehicle_assigned') : t('analyzer.mapping.vehicle_validated')}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                            {t('analyzer.transaction.vehicle_verified')}
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
                        <div>{t('analyzer.transaction.invoice')} {transaction.invoice}</div>
                        <div>{t('analyzer.transaction.pdf_unit')} {transaction.unit}</div>
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