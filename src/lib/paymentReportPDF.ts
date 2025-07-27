import jsPDF from "jspdf";

interface PaymentReportData {
  driver: {
    name: string;
    user_id: string;
    license?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  period: {
    start_date: string;
    end_date: string;
    gross_earnings: number;
    fuel_expenses: number;
    total_deductions: number;
    other_income: number;
    net_payment: number;
    week_number?: number;
    payment_date?: string;
  };
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  loads?: Array<{
    load_number: string;
    pickup_date: string;
    delivery_date: string;
    pickup_location?: string;
    delivery_location?: string;
    client_name?: string;
    total_amount: number;
    factoring_percentage?: number;
    dispatching_percentage?: number;
    leasing_percentage?: number;
    stops?: number;
  }>;
  fuelExpenses?: Array<{
    transaction_date: string;
    station_name: string;
    gallons_purchased: number;
    price_per_gallon?: number;
    total_amount: number;
  }>;
  deductions?: Array<{
    description: string;
    amount: number;
    expense_date: string;
  }>;
  weeklyExpenses?: Array<{
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

export async function generatePaymentReportPDF(data: PaymentReportData, isPreview: boolean = false) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;
  let currentY = margin;

  // Función para convertir RGB a array para jsPDF
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Colores del diseño mejorados
  const colors = {
    primary: '#1e40af',     // Azul principal
    success: '#16a34a',     // Verde
    warning: '#ea580c',     // Naranja
    danger: '#dc2626',      // Rojo
    lightBlue: '#dbeafe',   
    lightGreen: '#dcfce7',  
    lightOrange: '#fed7aa', 
    lightRed: '#fecaca',    
    gray: '#6b7280',        
    darkGray: '#1f2937',    
    lightGray: '#f9fafb',   
    border: '#e5e7eb',      
    text: '#374151',        
    textLight: '#9ca3af'    
  };

  // Helper functions mejoradas
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const { fontSize = 10, fontStyle = 'normal', color = colors.text, align = 'left' } = options;
    
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const rgbColor = hexToRgb(color);
    doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
    doc.text(text, x, y, { align: align as any });
  };

  const addBorder = (x: number, y: number, width: number, height: number, color: string = colors.border) => {
    const borderRgb = hexToRgb(color);
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height);
  };

  const addColoredBox = (x: number, y: number, width: number, height: number, bgColor: string, textColor: string, title: string, value: string) => {
    // Fondo de color
    const bgRgb = hexToRgb(bgColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.rect(x, y, width, height, 'F');
    
    // Borde sutil
    addBorder(x, y, width, height, colors.border);
    
    // Título
    addText(title, x + width/2, y + height/3, {
      fontSize: 10,
      fontStyle: 'normal',
      color: textColor,
      align: 'center'
    });
    
    // Valor
    addText(value, x + width/2, y + height*0.7, {
      fontSize: 16,
      fontStyle: 'bold',
      color: textColor,
      align: 'center'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount >= 0 ? 
      `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` :
      `-$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatWeekInfo = () => {
    const startDate = new Date(data.period.start_date);
    const endDate = new Date(data.period.end_date);
    const year = startDate.getFullYear();
    
    // Calcular semana del año
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((startDate.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    
    return {
      week: `Week ${week} / ${year}`,
      dateRange: `${startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`,
      paymentDate: data.period.payment_date ? 
        `Payment Date: ${new Date(data.period.payment_date).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})}` :
        `Payment Date: ${new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'})}`
    };
  };

  // === HEADER LIMPIO COMO LA IMAGEN ===
  currentY = 30;
  
  // Logo/Nombre de la empresa (izquierda)
  addText('HG', margin, currentY, {
    fontSize: 28,
    fontStyle: 'bold',
    color: colors.primary
  });
  
  addText(data.company.name || 'HG Transport LLC', margin + 20, currentY, {
    fontSize: 16,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  // Información de la empresa
  addText(data.company.address || '10402 Sun River Falls Dr', margin, currentY + 10, {
    fontSize: 9,
    color: colors.text
  });
  
  addText('Humble, TX, 77396', margin, currentY + 18, {
    fontSize: 9,
    color: colors.text
  });
  
  addText(data.company.phone || '(281) 713-3044', margin, currentY + 26, {
    fontSize: 9,
    color: colors.text
  });
  
  addText(data.company.email || 'hgtransport16@gmail.com', margin, currentY + 34, {
    fontSize: 9,
    color: colors.text
  });

  // Título central exacto como la imagen
  const weekInfo = formatWeekInfo();
  addText('Driver Pay Report', pageWidth/2, currentY, {
    fontSize: 18,
    fontStyle: 'bold',
    color: colors.darkGray,
    align: 'center'
  });
  
  addText(weekInfo.week, pageWidth/2, currentY + 12, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.text,
    align: 'center'
  });
  
  addText(weekInfo.dateRange, pageWidth/2, currentY + 22, {
    fontSize: 11,
    color: colors.text,
    align: 'center'
  });
  
  addText(weekInfo.paymentDate, pageWidth/2, currentY + 32, {
    fontSize: 10,
    color: colors.text,
    align: 'center'
  });

  // Información del conductor (derecha) exacta como la imagen
  const rightX = pageWidth - margin - 80;
  addText(data.driver.name, rightX, currentY, {
    fontSize: 14,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  if (data.driver.license) {
    addText(`Driver License: ${data.driver.license}`, rightX, currentY + 10, {
      fontSize: 9,
      color: colors.text
    });
  }
  
  if (data.driver.address) {
    // Dividir la dirección en líneas si es muy larga
    const addressParts = data.driver.address.split(',');
    addText(addressParts[0] || data.driver.address, rightX, currentY + 18, {
      fontSize: 9,
      color: colors.text
    });
    
    if (addressParts.length > 1) {
      addText(addressParts.slice(1).join(',').trim(), rightX, currentY + 26, {
        fontSize: 9,
        color: colors.text
      });
    }
  }
  
  if (data.driver.phone && data.driver.email) {
    addText(`${data.driver.phone} | ${data.driver.email}`, rightX, currentY + 34, {
      fontSize: 8,
      color: colors.text
    });
  } else if (data.driver.phone || data.driver.email) {
    addText(data.driver.phone || data.driver.email, rightX, currentY + 34, {
      fontSize: 8,
      color: colors.text
    });
  }

  currentY += 55;

  // === CAJAS DE RESUMEN SUPERIOR ===
  const boxWidth = (pageWidth - margin*2 - 15) / 4; // 4 cajas con espacios
  const boxHeight = 20;
  
  // Gross Earnings (Verde)
  addColoredBox(margin, currentY, boxWidth, boxHeight, colors.lightGreen, colors.darkGray, 
    'Gross Earnings', formatCurrency(data.period.gross_earnings));
  
  // Other Earnings (Azul)
  addColoredBox(margin + boxWidth + 5, currentY, boxWidth, boxHeight, colors.lightBlue, colors.darkGray,
    'Other Earnings', formatCurrency(data.period.other_income));
  
  // Total Deductions (Rojo)
  addColoredBox(margin + (boxWidth + 5) * 2, currentY, boxWidth, boxHeight, colors.lightRed, colors.darkGray,
    'Total Deductions', formatCurrency(-data.period.total_deductions));
  
  // Fuel Expenses (Naranja)
  addColoredBox(margin + (boxWidth + 5) * 3, currentY, boxWidth, boxHeight, colors.lightOrange, colors.darkGray,
    'Fuel Expenses', formatCurrency(-data.period.fuel_expenses));

  currentY += boxHeight + 10;

  // Net Pay (Caja grande azul)
  const netPayWidth = pageWidth - margin*2;
  addColoredBox(margin, currentY, netPayWidth, 15, colors.lightBlue, colors.primary,
    'Net Pay', formatCurrency(data.period.net_payment));

  currentY += 25;

  // === LOADS COMPLETED ===
  addText('Loads completed', margin, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  currentY += 10;

  if (data.loads && data.loads.length > 0) {
    data.loads.forEach((load, index) => {
      // Load number y stops
      addText(`Load#: ${load.load_number}`, margin, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: colors.darkGray
      });
      
      addText(`Stops: ${load.stops || 2} Total`, margin, currentY + 6, {
        fontSize: 9,
        color: colors.gray
      });

      // Porcentajes y monto (derecha)
      const percentages = [];
      if (load.factoring_percentage) percentages.push(`F.3%: (-$${(load.total_amount * load.factoring_percentage / 100).toFixed(2)})`);
      if (load.dispatching_percentage) percentages.push(`D.5%: (-$${(load.total_amount * load.dispatching_percentage / 100).toFixed(2)})`);
      if (load.leasing_percentage) percentages.push(`L.5%: (-$${(load.total_amount * load.leasing_percentage / 100).toFixed(2)})`);
      
      const rightText = percentages.join(' ') + ` ${formatCurrency(load.total_amount)}`;
      addText(rightText, pageWidth - margin, currentY, {
        fontSize: 9,
        color: colors.gray,
        align: 'right'
      });

      // Pickup y Delivery
      const pickupText = `PU: ${new Date(load.pickup_date).toLocaleDateString('en-US')} ${load.pickup_location || ''}`;
      const deliveryText = `DEL: ${new Date(load.delivery_date).toLocaleDateString('en-US')} ${load.delivery_location || ''}`;
      
      addText(`${pickupText} | ${deliveryText}`, margin + 50, currentY + 6, {
        fontSize: 8,
        color: colors.gray
      });

      currentY += 20;
    });
  }

  currentY += 10;

  // === OTHER EARNINGS ===
  addText('Other Earnings', margin, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  currentY += 10;

  if (data.otherIncome && data.otherIncome.length > 0) {
    data.otherIncome.forEach(income => {
      addText(`• ${income.description}`, margin, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(income.amount), pageWidth - margin, currentY, {
        fontSize: 9,
        color: colors.gray,
        align: 'right'
      });
      
      currentY += 8;
    });
  } else {
    addText('No other earnings for this period', margin, currentY, {
      fontSize: 9,
      fontStyle: 'italic',
      color: colors.gray
    });
    currentY += 8;
  }

  currentY += 15;

  // === TOTAL EXPENSES ===
  addText('Total Expenses', margin, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  currentY += 15;

  // Dos columnas de gastos
  const colWidth = (pageWidth - margin*2 - 10) / 2;
  
  // Columna 1: Deductions
  const col1X = margin;
  const col1Y = currentY;
  
  const redRgb = hexToRgb(colors.lightRed);
  doc.setFillColor(redRgb[0], redRgb[1], redRgb[2]);
  doc.rect(col1X, col1Y - 5, colWidth, 8, 'F');
  
  const totalDeductions = data.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
  addText(`Deductions ($${totalDeductions.toFixed(2)})`, col1X + 2, col1Y, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  currentY += 10;
  
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach(deduction => {
      addText(deduction.description, col1X + 2, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(-deduction.amount), col1X + colWidth - 2, currentY, {
        fontSize: 9,
        color: colors.danger,
        align: 'right'
      });
      
      currentY += 6;
    });
  }

  // Columna 2: Weekly Expenses
  const col2X = margin + colWidth + 10;
  let col2Y = col1Y;
  
  const redRgb2 = hexToRgb(colors.lightRed);
  doc.setFillColor(redRgb2[0], redRgb2[1], redRgb2[2]);
  doc.rect(col2X, col2Y - 5, colWidth, 8, 'F');
  
  const totalWeekly = data.weeklyExpenses?.reduce((sum, w) => sum + w.amount, 0) || 0;
  addText(`Weekly Expenses ($${totalWeekly.toFixed(2)})`, col2X + 2, col2Y, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  col2Y += 10;
  
  if (data.weeklyExpenses && data.weeklyExpenses.length > 0) {
    data.weeklyExpenses.forEach(expense => {
      addText(expense.description, col2X + 2, col2Y, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(-expense.amount), col2X + colWidth - 2, col2Y, {
        fontSize: 9,
        color: colors.danger,
        align: 'right'
      });
      
      col2Y += 6;
    });
  }

  currentY = Math.max(currentY, col2Y) + 15;

  // === FUEL PURCHASES ===
  const grayRgb = hexToRgb(colors.lightGray);
  doc.setFillColor(grayRgb[0], grayRgb[1], grayRgb[2]);
  doc.rect(margin, currentY - 5, pageWidth - margin*2, 8, 'F');
  
  addText(`Fuel Purchases ($${data.period.fuel_expenses.toFixed(2)})`, margin + 2, currentY, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  currentY += 10;

  if (data.fuelExpenses && data.fuelExpenses.length > 0) {
    data.fuelExpenses.forEach(fuel => {
      const dateStr = new Date(fuel.transaction_date).toLocaleDateString('en-US');
      
      addText(dateStr, margin + 2, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(fuel.station_name, margin + 30, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(`${(fuel.gallons_purchased || 0).toFixed(2)} gal`, margin + 100, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(`$${(fuel.price_per_gallon || 0).toFixed(3)}`, margin + 140, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(-fuel.total_amount), pageWidth - margin - 2, currentY, {
        fontSize: 9,
        color: colors.danger,
        align: 'right'
      });
      
      currentY += 8;
    });
  }

  // Verificar si necesitamos una nueva página antes del Summary
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 20;

  // === SUMMARY ===
  addText('Summary', margin, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  currentY += 15;

  const summaryData = [
    { label: 'Gross Earnings', amount: data.period.gross_earnings },
    { label: 'Other Earnings', amount: data.period.other_income },
    { label: 'Total Deductions', amount: -data.period.total_deductions },
    { label: 'Fuel Expenses', amount: -data.period.fuel_expenses }
  ];

  summaryData.forEach(item => {
    addText(item.label, margin, currentY, {
      fontSize: 10,
      color: colors.gray
    });
    
    addText(formatCurrency(item.amount), margin + 80, currentY, {
      fontSize: 10,
      color: colors.gray,
      align: 'right'
    });
    
    currentY += 8;
  });

  // Net Pay destacado
  const blueRgb = hexToRgb(colors.lightBlue);
  doc.setFillColor(blueRgb[0], blueRgb[1], blueRgb[2]);
  doc.rect(margin, currentY, 85, 10, 'F');
  
  addText('Net Pay', margin + 2, currentY + 6, {
    fontSize: 11,
    fontStyle: 'bold',
    color: colors.primary
  });
  
  addText(formatCurrency(data.period.net_payment), margin + 78, currentY + 6, {
    fontSize: 11,
    fontStyle: 'bold',
    color: colors.primary,
    align: 'right'
  });

  // === FIRMA DIGITAL ===
  const signatureX = margin + 100;
  currentY += 25;
  
  addText('✓ Firmado digitalmente y aprobado por el conductor', signatureX, currentY, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  addText(`Conductor: ${data.driver.name}`, signatureX, currentY + 8, {
    fontSize: 9,
    color: colors.gray
  });
  
  const signDate = new Date();
  addText(`Firmado el: ${signDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric', 
    year: 'numeric'
  })} at ${signDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`, signatureX, currentY + 16, {
    fontSize: 9,
    color: colors.gray
  });

  // Información de contacto final
  currentY += 35;
  addText('If you have any questions, please contact us by phone', signatureX, currentY, {
    fontSize: 8,
    color: colors.gray
  });
  
  addText(`or email at ${data.company.email || 'hgtransport16@gmail.com'}`, signatureX, currentY + 6, {
    fontSize: 8,
    color: colors.gray
  });
  
  addText('Thank you for your business - We really appreciate it.', signatureX, currentY + 12, {
    fontSize: 8,
    color: colors.gray
  });

  // Descargar o ver el PDF
  const fileName = `Driver_Pay_Report_${data.driver.name.replace(/\s+/g, '_')}_${weekInfo.week.replace(/\s+/g, '_')}.pdf`;
  
  if (isPreview) {
    // Abrir PDF en nueva pestaña para vista previa
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
    const newWindow = window.open('', '_blank');
    
    if (newWindow) {
      newWindow.location.href = pdfUrl;
      // Limpiar URL después de un tiempo para liberar memoria
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 10000);
    } else {
      console.warn('Popup bloqueado. Intentando download fallback.');
      doc.save(fileName);
    }
  } else {
    // Descargar PDF
    doc.save(fileName);
  }
}