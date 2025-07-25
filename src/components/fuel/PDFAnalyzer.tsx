import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AnalysisResult {
  columnsFound: string[];
  hasAuthorizationCode: boolean;
  authorizationCodeField: string | null;
  sampleData: Array<Record<string, string>>;
  analysis: string;
}

export function PDFAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {analysisResult.hasAuthorizationCode ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado del Análisis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Authorization Code Status */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Authorization Code:</span>
              {analysisResult.hasAuthorizationCode ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  ✓ Encontrado: {analysisResult.authorizationCodeField}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  ✗ No encontrado
                </Badge>
              )}
            </div>

            {/* Columns Found */}
            <div>
              <h4 className="font-medium mb-2">Columnas encontradas ({analysisResult.columnsFound.length}):</h4>
              <div className="flex flex-wrap gap-1">
                {analysisResult.columnsFound.map((column, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {column}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Transactions Table */}
            {analysisResult.sampleData.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Transacciones encontradas ({analysisResult.sampleData.length}):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border rounded-md">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-2 text-left text-sm font-medium">DATE</th>
                        <th className="border border-border p-2 text-left text-sm font-medium">CARD</th>
                        <th className="border border-border p-2 text-left text-sm font-medium">UNIT</th>
                        <th className="border border-border p-2 text-left text-sm font-medium">INVOICE #</th>
                        <th className="border border-border p-2 text-left text-sm font-medium">LOCATION NAME</th>
                        <th className="border border-border p-2 text-left text-sm font-medium">ST</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">QTY</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">GROSS PPG</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">GROSS AMT</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">DISC AMT</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">FEES</th>
                        <th className="border border-border p-2 text-right text-sm font-medium">TOTAL AMT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.sampleData.map((transaction, index) => (
                        <tr key={index} className="hover:bg-muted/50">
                          <td className="border border-border p-2 text-sm">{transaction.date || '-'}</td>
                          <td className="border border-border p-2 text-sm">{transaction.card || '-'}</td>
                          <td className="border border-border p-2 text-sm">{transaction.unit || '-'}</td>
                          <td className="border border-border p-2 text-sm">{transaction.invoice || '-'}</td>
                          <td className="border border-border p-2 text-sm">{transaction.location_name || '-'}</td>
                          <td className="border border-border p-2 text-sm">{transaction.state || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right">{transaction.qty || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right">${transaction.gross_ppg || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right">${transaction.gross_amt || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right">${transaction.disc_amt || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right">${transaction.fees || '-'}</td>
                          <td className="border border-border p-2 text-sm text-right font-medium">${transaction.total_amt || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analysis */}
            <div>
              <h4 className="font-medium mb-2">Análisis detallado:</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {analysisResult.analysis}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}