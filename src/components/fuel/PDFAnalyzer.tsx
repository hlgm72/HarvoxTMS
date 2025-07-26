import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, Info, Loader2, User, Calendar, CreditCard, MapPin, Fuel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  period_mapping_status: 'found' | 'not_found';
  import_status: 'not_imported' | 'already_imported';
}

export function PDFAnalyzer() {
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [enrichedTransactions, setEnrichedTransactions] = useState<EnrichedTransaction[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setAnalysisResult(null);
    } else {
      toast({
        title: "Archivo no válido",
        description: "Por favor selecciona un archivo PDF",
        variant: "destructive"
      });
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
        toast({
          title: "Análisis completado",
          description: "El PDF ha sido analizado exitosamente"
        });
      } else {
        throw new Error(data.error || 'Error analyzing PDF');
      }
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      toast({
        title: "Error en el análisis",
        description: "No se pudo analizar el PDF. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
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

      // Obtener equipos de la empresa
      const { data: companyEquipment } = await supabase
        .from('company_equipment')
        .select('id, equipment_number')
        .eq('company_id', companyId)
        .eq('status', 'active');

      // Obtener tarjetas de conductores
      const { data: driverCards } = await supabase
        .from('driver_cards')
        .select(`
          card_number_last_four,
          card_identifier,
          driver_user_id
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

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

      // Obtener cálculos de períodos de conductores para poder asignar el payment_period_id correcto
      const { data: driverPeriodCalculations } = await supabase
        .from('driver_period_calculations')
        .select('id, driver_user_id, company_payment_period_id')
        .in('company_payment_period_id', companyPeriods?.map(p => p.id) || []);

      // Obtener gastos de combustible existentes para verificar duplicados
      const { data: existingFuelExpenses } = await supabase
        .from('fuel_expenses')
        .select('transaction_date, invoice_number, card_last_four, total_amount, station_name')
        .in('driver_user_id', driverIds);

      const enriched: EnrichedTransaction[] = transactions.map(transaction => {
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
        const transactionDateStr = new Date(transaction.date).toISOString().split('T')[0];
        const existingTransaction = existingFuelExpenses?.find(existing => {
          const existingDate = new Date(existing.transaction_date).toISOString().split('T')[0];
          const sameDate = existingDate === transactionDateStr;
          const sameInvoice = existing.invoice_number === transaction.invoice;
          const sameCard = existing.card_last_four?.includes(transaction.card.slice(-4)) || 
                          existing.card_last_four === transaction.card;
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
        const matchingCards = driverCards?.filter(card => {
          // Comparar los últimos 4 dígitos de ambos números
          const cardLast4 = card.card_number_last_four;
          const transactionLast4 = cardNumber.slice(-4);
          const transactionLast5 = cardNumber.slice(-5);
          
          return cardLast4 === transactionLast4 || 
                 card.card_identifier === cardNumber ||
                 card.card_identifier === transactionLast4 ||
                 card.card_identifier === transactionLast5;
        }) || [];

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
            enrichedTransaction.driver_name = `Conductor Tarjeta ${card.card_number_last_four}`;
          }
          
          enrichedTransaction.card_mapping_status = 'found';
        } else if (matchingCards.length > 1) {
          enrichedTransaction.card_mapping_status = 'multiple';
        }

        // Mapear período de pago por fecha (simplificado - directo a company_payment_periods)
        const periodTransactionDate = new Date(transaction.date);
        const matchingPeriod = companyPeriods?.find(period => {
          const startDate = new Date(period.period_start_date);
          const endDate = new Date(period.period_end_date);
          return periodTransactionDate >= startDate && periodTransactionDate <= endDate;
        });

        if (matchingPeriod && enrichedTransaction.driver_user_id) {
          // Buscar el cálculo del conductor para este período y conductor
          let driverPeriodCalc = driverPeriodCalculations?.find(calc => 
            calc.company_payment_period_id === matchingPeriod.id && 
            calc.driver_user_id === enrichedTransaction.driver_user_id
          );
          
          // Si no existe el cálculo del conductor, lo creamos temporalmente en memoria
          // (la inserción real se hará cuando se importen las transacciones)
          if (!driverPeriodCalc) {
            console.log(`No se encontró driver_period_calculation para conductor ${enrichedTransaction.driver_user_id} y período ${matchingPeriod.id}. Se creará automáticamente durante la importación.`);
            // Marca que el período se encontró pero necesita crearse el calculation
            enrichedTransaction.payment_period_id = `CREATE_FOR_${matchingPeriod.id}_${enrichedTransaction.driver_user_id}`;
            enrichedTransaction.payment_period_dates = `${matchingPeriod.period_start_date} - ${matchingPeriod.period_end_date}`;
            enrichedTransaction.period_mapping_status = 'found';
          } else {
            enrichedTransaction.payment_period_id = driverPeriodCalc.id;
            enrichedTransaction.payment_period_dates = `${matchingPeriod.period_start_date} - ${matchingPeriod.period_end_date}`;
            enrichedTransaction.period_mapping_status = 'found';
          }
        }

        // Mapear vehículo por número de equipo al UUID correspondiente
        const equipmentNumber = transaction.unit;
        const matchingEquipment = companyEquipment?.find(equipment => 
          equipment.equipment_number === equipmentNumber
        );
        
        if (matchingEquipment) {
          enrichedTransaction.vehicle_id = matchingEquipment.id;
          enrichedTransaction.vehicle_number = matchingEquipment.equipment_number;
        } else {
          enrichedTransaction.vehicle_id = null;
          enrichedTransaction.vehicle_number = equipmentNumber; // Mostrar el número original aunque no se haya mapeado
        }

        return enrichedTransaction;
      });

      setEnrichedTransactions(enriched);
    } catch (error) {
      console.error('Error enriching transactions:', error);
      toast({
        title: "Error enriqueciendo datos",
        description: "No se pudieron mapear todos los datos automáticamente",
        variant: "destructive"
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const importTransactions = async () => {
    setIsImporting(true);
    try {
      const validTransactions = enrichedTransactions.filter(
        t => t.card_mapping_status === 'found' && 
             t.period_mapping_status === 'found' && 
             t.import_status === 'not_imported'
      );

      if (validTransactions.length === 0) {
        toast({
          title: "Sin transacciones válidas",
          description: "No hay transacciones con mapeo completo para importar",
          variant: "destructive"
        });
        return;
      }

      // Procesar transacciones que necesitan crear driver_period_calculations
      const transactionsToProcess = [];
      
      for (const transaction of validTransactions) {
        let finalPaymentPeriodId = transaction.payment_period_id;
        
        // Si el payment_period_id tiene el formato especial, necesitamos crear el driver_period_calculation
        if (finalPaymentPeriodId?.startsWith('CREATE_FOR_')) {
          const parts = finalPaymentPeriodId.split('_');
          const companyPaymentPeriodId = parts[2];
          const driverUserId = parts[3];
          
          // Crear el driver_period_calculation
          const { data: newCalculation, error: calculationError } = await supabase
            .from('driver_period_calculations')
            .insert({
              company_payment_period_id: companyPaymentPeriodId,
              driver_user_id: driverUserId,
              gross_earnings: 0,
              total_deductions: 0,
              other_income: 0,
              total_income: 0,
              net_payment: 0,
              has_negative_balance: false
            })
            .select()
            .single();
          
          if (calculationError) {
            console.error('Error creating driver_period_calculation:', calculationError);
            // Intentar obtener uno existente en caso de que ya se haya creado
            const { data: existingCalculation } = await supabase
              .from('driver_period_calculations')
              .select('id')
              .eq('company_payment_period_id', companyPaymentPeriodId)
              .eq('driver_user_id', driverUserId)
              .single();
            
            if (existingCalculation) {
              finalPaymentPeriodId = existingCalculation.id;
            } else {
              throw calculationError;
            }
          } else {
            finalPaymentPeriodId = newCalculation.id;
          }
        }
        
        transactionsToProcess.push({
          ...transaction,
          payment_period_id: finalPaymentPeriodId
        });
      }

      const fuelExpenses = transactionsToProcess.map(transaction => ({
        driver_user_id: transaction.driver_user_id!,
        payment_period_id: transaction.payment_period_id!,
        transaction_date: new Date(transaction.date).toISOString(),
        fuel_type: transaction.category?.toLowerCase() || 'diesel',
        gallons_purchased: transaction.qty,
        price_per_gallon: transaction.gross_ppg,
        gross_amount: transaction.gross_amt,
        discount_amount: transaction.disc_amt,
        fees: transaction.fees,
        total_amount: transaction.total_amt,
        station_name: transaction.location_name,
        station_state: transaction.state,
        card_last_four: transaction.card,
        invoice_number: transaction.invoice,
        vehicle_id: transaction.vehicle_id,
        status: 'pending',
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('fuel_expenses')
        .insert(fuelExpenses);

      if (error) throw error;

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${validTransactions.length} transacciones de combustible`
      });

      // Limpiar datos después de la importación
      setAnalysisResult(null);
      setEnrichedTransactions([]);
      setSelectedFile(null);

    } catch (error) {
      console.error('Error importing transactions:', error);
      toast({
        title: "Error en la importación",
        description: "No se pudieron importar las transacciones",
        variant: "destructive"
      });
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
            Analizador de PDF
          </CardTitle>
          <CardDescription>
            Sube un PDF de gastos de combustible para verificar si contiene la columna "authorization_code"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept=".pdf"
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
              {isAnalyzing ? 'Analizando...' : 'Analizar PDF'}
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
                  <div className="text-2xl font-bold text-green-600">
                    {enrichedTransactions.filter(t => t.card_mapping_status === 'found').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Conductores identificados</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {enrichedTransactions.filter(t => t.period_mapping_status === 'found').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Períodos asignados</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {enrichedTransactions.filter(t => 
                      t.card_mapping_status === 'found' && 
                      t.period_mapping_status === 'found' && 
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Listas para importar</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {enrichedTransactions.filter(t => t.import_status === 'already_imported').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Ya importadas</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {enrichedTransactions.filter(t => 
                      (t.card_mapping_status === 'not_found' || t.period_mapping_status === 'not_found') &&
                      t.import_status === 'not_imported'
                    ).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Requieren atención</div>
                </div>
              </div>

              {enrichedTransactions.filter(t => 
                t.card_mapping_status === 'found' && 
                t.period_mapping_status === 'found' && 
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
                    {isImporting ? 'Importando...' : 'Importar Transacciones Válidas'}
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
                  <span>Mapeando conductores y períodos...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transacciones de Combustible</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {enrichedTransactions.map((transaction, index) => (
                  <Card key={index} className={`bg-white
                    ${transaction.import_status === 'already_imported' 
                      ? 'border-gray-200 opacity-75' 
                      : transaction.card_mapping_status === 'found' && transaction.period_mapping_status === 'found' 
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
                            <Badge variant="secondary">Ya Importada</Badge>
                          ) : (
                            <>
                              <Badge variant={transaction.card_mapping_status === 'found' ? 'default' : 'destructive'}>
                                {transaction.card_mapping_status === 'found' ? 'Conductor OK' : 
                                 transaction.card_mapping_status === 'multiple' ? 'Múltiples' : 'Sin Conductor'}
                              </Badge>
                              <Badge variant={transaction.period_mapping_status === 'found' ? 'default' : 'destructive'}>
                                {transaction.period_mapping_status === 'found' ? 'Período OK' : 'Sin Período'}
                              </Badge>
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
                            {transaction.driver_name || 'Conductor no identificado'}
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
                            {transaction.payment_period_dates || 'Período no encontrado'}
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
                          <div className="text-sm text-muted-foreground">Galones</div>
                          <div className="font-medium">{transaction.qty.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Precio/Galón</div>
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
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="font-bold text-lg">${transaction.total_amt.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Información adicional */}
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <div>Factura: {transaction.invoice}</div>
                        {transaction.vehicle_number && <div>Unidad: {transaction.vehicle_number}</div>}
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