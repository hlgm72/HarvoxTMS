import jsPDF from "jspdf";

interface PaymentReportData {
  driver: {
    name: string;
    user_id: string;
  };
  period: {
    start_date: string;
    end_date: string;
    gross_earnings: number;
    fuel_expenses: number;
    total_deductions: number;
    other_income: number;
    net_payment: number;
  };
  company: {
    name: string;
  };
  loads?: Array<{
    load_number: string;
    pickup_date: string;
    delivery_date: string;
    client_name: string;
    total_amount: number;
  }>;
  fuelExpenses?: Array<{
    transaction_date: string;
    station_name: string;
    gallons_purchased: number;
    total_amount: number;
  }>;
  deductions?: Array<{
    description: string;
    amount: number;
    expense_date: string;
  }>;
  otherIncome?: Array<{
    description: string;
    amount: number;
    income_date: string;
  }>;
}

export async function generatePaymentReportPDF(data: PaymentReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let currentY = margin;

  // Colores del tema
  const primaryColor = '#1f2937'; // gray-800
  const secondaryColor = '#6b7280'; // gray-500
  const accentColor = '#3b82f6'; // blue-500
  const successColor = '#10b981'; // emerald-500
  const warningColor = '#f59e0b'; // amber-500
  const dangerColor = '#ef4444'; // red-500

  // Helper function para agregar texto
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const {
      fontSize = 12,
      fontStyle = 'normal',
      color = primaryColor,
      align = 'left',
      maxWidth
    } = options;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color);

    if (maxWidth) {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y, { align });
      return y + (lines.length * fontSize * 0.3);
    } else {
      doc.text(text, x, y, { align });
      return y + fontSize * 0.3;
    }
  };

  // Helper function para agregar línea
  const addLine = (x1: number, y1: number, x2: number, y2: number, color = secondaryColor) => {
    doc.setDrawColor(color);
    doc.line(x1, y1, x2, y2);
  };

  // Helper function para agregar rectángulo
  const addRect = (x: number, y: number, width: number, height: number, fillColor?: string) => {
    if (fillColor) {
      doc.setFillColor(fillColor);
      doc.rect(x, y, width, height, 'F');
    } else {
      doc.setDrawColor(secondaryColor);
      doc.rect(x, y, width, height);
    }
  };

  // Header con logo y título
  addRect(margin, currentY, pageWidth - (margin * 2), 30, '#f8fafc');
  currentY += 10;

  // Título principal
  addText('REPORTE DE PAGO', pageWidth / 2, currentY, {
    fontSize: 24,
    fontStyle: 'bold',
    color: primaryColor,
    align: 'center'
  });
  currentY += 20;

  // Información de la empresa
  addText(data.company.name, pageWidth / 2, currentY, {
    fontSize: 14,
    color: secondaryColor,
    align: 'center'
  });
  currentY += 25;

  // Información del período y conductor
  addRect(margin, currentY, pageWidth - (margin * 2), 40, '#eff6ff');
  currentY += 10;

  // Conductor
  addText('CONDUCTOR:', margin + 10, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: primaryColor
  });
  addText(data.driver.name, margin + 80, currentY, {
    fontSize: 12,
    color: primaryColor
  });
  currentY += 15;

  // Período
  addText('PERÍODO:', margin + 10, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: primaryColor
  });
  const periodText = `${new Date(data.period.start_date).toLocaleDateString('es-ES')} - ${new Date(data.period.end_date).toLocaleDateString('es-ES')}`;
  addText(periodText, margin + 80, currentY, {
    fontSize: 12,
    color: primaryColor
  });
  currentY += 25;

  // Resumen financiero
  addText('RESUMEN FINANCIERO', margin, currentY, {
    fontSize: 16,
    fontStyle: 'bold',
    color: primaryColor
  });
  currentY += 20;

  // Tabla de resumen
  const summaryData = [
    { label: 'Ingresos Brutos', amount: data.period.gross_earnings, color: primaryColor },
    { label: 'Otros Ingresos', amount: data.period.other_income, color: successColor },
    { label: 'Gastos de Combustible', amount: -data.period.fuel_expenses, color: warningColor },
    { label: 'Otras Deducciones', amount: -data.period.total_deductions, color: dangerColor },
    { label: 'PAGO NETO', amount: data.period.net_payment, color: primaryColor, isBold: true }
  ];

  const tableStartY = currentY;
  const rowHeight = 20;
  const labelWidth = 120;
  const amountWidth = 80;

  // Header de tabla
  addRect(margin, currentY, labelWidth + amountWidth, rowHeight, '#f1f5f9');
  addText('CONCEPTO', margin + 5, currentY + 12, {
    fontSize: 10,
    fontStyle: 'bold',
    color: primaryColor
  });
  addText('IMPORTE', margin + labelWidth + 5, currentY + 12, {
    fontSize: 10,
    fontStyle: 'bold',
    color: primaryColor,
    align: 'right'
  });
  currentY += rowHeight;

  // Filas de datos
  summaryData.forEach((item, index) => {
    const isLast = index === summaryData.length - 1;
    const bgColor = isLast ? '#f0f9ff' : undefined;
    
    if (bgColor) {
      addRect(margin, currentY, labelWidth + amountWidth, rowHeight, bgColor);
    }

    addText(item.label, margin + 5, currentY + 12, {
      fontSize: isLast ? 12 : 10,
      fontStyle: item.isBold ? 'bold' : 'normal',
      color: item.color
    });

    const amountText = item.amount >= 0 ? 
      `$${item.amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}` :
      `-$${Math.abs(item.amount).toLocaleString('es-US', { minimumFractionDigits: 2 })}`;

    addText(amountText, margin + labelWidth + amountWidth - 5, currentY + 12, {
      fontSize: isLast ? 12 : 10,
      fontStyle: item.isBold ? 'bold' : 'normal',
      color: item.color,
      align: 'right'
    });

    // Línea separadora
    if (!isLast) {
      addLine(margin, currentY + rowHeight, margin + labelWidth + amountWidth, currentY + rowHeight, '#e2e8f0');
    }

    currentY += rowHeight;
  });

  // Línea final más gruesa
  doc.setLineWidth(2);
  addLine(margin, currentY, margin + labelWidth + amountWidth, currentY, primaryColor);
  doc.setLineWidth(0.5);
  currentY += 30;

  // Verificar si necesitamos nueva página
  if (currentY > pageHeight - 100) {
    doc.addPage();
    currentY = margin;
  }

  // Sección de detalles (si hay datos)
  if (data.loads && data.loads.length > 0) {
    addText('DETALLE DE CARGAS', margin, currentY, {
      fontSize: 14,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 20;

    // Header de tabla de cargas
    const loadTableWidth = pageWidth - (margin * 2);
    addRect(margin, currentY, loadTableWidth, 15, '#f8fafc');
    
    addText('LOAD #', margin + 5, currentY + 10, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    addText('FECHA', margin + 40, currentY + 10, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    addText('CLIENTE', margin + 75, currentY + 10, {
      fontSize: 9,
      fontStyle: 'bold'
    });
    addText('IMPORTE', margin + loadTableWidth - 30, currentY + 10, {
      fontSize: 9,
      fontStyle: 'bold',
      align: 'right'
    });
    currentY += 15;

    // Filas de cargas
    data.loads.forEach((load) => {
      addText(load.load_number, margin + 5, currentY + 10, { fontSize: 8 });
      addText(new Date(load.pickup_date).toLocaleDateString('es-ES'), margin + 40, currentY + 10, { fontSize: 8 });
      addText(load.client_name, margin + 75, currentY + 10, { fontSize: 8, maxWidth: 60 });
      addText(`$${load.total_amount.toLocaleString('es-US', { minimumFractionDigits: 2 })}`, 
        margin + loadTableWidth - 5, currentY + 10, { fontSize: 8, align: 'right' });
      
      currentY += 12;
      
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin;
      }
    });
    currentY += 20;
  }

  // Footer
  const footerY = pageHeight - 40;
  addLine(margin, footerY, pageWidth - margin, footerY, secondaryColor);
  
  addText('Reporte generado automáticamente', margin, footerY + 10, {
    fontSize: 8,
    color: secondaryColor
  });
  
  addText(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, footerY + 10, {
    fontSize: 8,
    color: secondaryColor,
    align: 'right'
  });

  addText(`Página 1 de ${doc.getNumberOfPages()}`, pageWidth / 2, footerY + 10, {
    fontSize: 8,
    color: secondaryColor,
    align: 'center'
  });

  // Descargar el PDF
  const fileName = `Reporte_${data.driver.name.replace(/\s+/g, '_')}_${data.period.start_date}_${data.period.end_date}.pdf`;
  doc.save(fileName);
}