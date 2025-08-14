import jsPDF from "jspdf";
import { formatDateSafe, createDateInUserTimeZone } from './dateFormatting';

interface PaymentReportData {
  driver: {
    name: string;
    user_id: string;
    license?: string;
    license_state?: string;
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
    logo_url?: string;
  };
  loads?: Array<{
    load_number: string;
    po_number?: string;
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
  const footerSpace = 25; // Espacio reservado para el pie de página
  let currentY = margin;

  // Función para cargar imagen desde URL
  const loadImageFromUrl = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading image:', error);
      return null;
    }
  };

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
    // Fondo de color con esquinas redondeadas
    const bgRgb = hexToRgb(bgColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Borde sutil con esquinas redondeadas
    const borderRgb = hexToRgb(colors.border);
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');
    
    // Título
    addText(title, x + width/2, y + height/3, {
      fontSize: 9,
      fontStyle: 'normal',
      color: textColor,
      align: 'center'
    });
    
    // Valor
    addText(value, x + width/2, y + height*0.72, {
      fontSize: 14,
      fontStyle: 'bold',
      color: textColor,
      align: 'center'
    });
  };

  const addRoundedBox = (x: number, y: number, width: number, height: number, bgColor: string, radius: number = 3, borderColor?: string) => {
    const bgRgb = hexToRgb(bgColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    
    // Dibujar rectángulo con esquinas redondeadas con relleno
    doc.roundedRect(x, y, width, height, radius, radius, 'F');
    
    // Agregar borde si se especifica
    if (borderColor) {
      const borderRgb = hexToRgb(borderColor);
      doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, width, height, radius, radius, 'S');
    }
  };

  const formatCurrency = (amount: number) => {
    return amount >= 0 ? 
      `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` :
      `-$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatWeekInfo = () => {
    // Parsear fechas de manera segura para evitar problemas de zona horaria
    const startDate = new Date(data.period.start_date + 'T12:00:00');
    const endDate = new Date(data.period.end_date + 'T12:00:00');
    const year = startDate.getFullYear();
    
    // Calcular semana del año usando fechas correctas
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((startDate.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    
    // Formatear fechas usando las funciones seguras
    const startFormatted = formatDateSafe(data.period.start_date, 'MMM d');
    const endFormatted = formatDateSafe(data.period.end_date, 'MMM d');
    
    return {
      week: `Week ${week} / ${year}`,
      dateRange: `${startFormatted} - ${endFormatted}`,
      paymentDate: data.period.payment_date ? 
        `Payment Date: ${formatDateSafe(data.period.payment_date, 'MM/dd/yyyy')}` :
        `Payment Date: ${formatDateSafe(new Date().toISOString(), 'MM/dd/yyyy')}`
    };
  };

  // === HEADER EN TRES COLUMNAS ===
  currentY = 12;
  
  // Agregar fondo gris claro con esquinas redondeadas y borde para la cabecera
  const headerHeight = 28;
  addRoundedBox(margin - 5, currentY - 7, pageWidth - margin*2 + 10, headerHeight, colors.lightGray, 2, colors.border);
  
  // Definir columnas
  const colWidth = (pageWidth - margin*2) / 3;
  const col1X = margin;
  const col2X = margin + colWidth;
  const col3X = margin + colWidth * 2;
  
  // === COLUMNA 1: INFORMACIÓN DE LA COMPAÑÍA ===
  
  // Intentar cargar logo de la compañía
  let logoWidth = 0;
  if (data.company.logo_url) {
    try {
      const logoData = await loadImageFromUrl(data.company.logo_url);
      if (logoData) {
        // Agregar imagen del logo
        const logoSize = 15; // Tamaño del logo en mm
        doc.addImage(logoData, 'PNG', col1X, currentY - 5, logoSize, logoSize);
        logoWidth = logoSize + 3; // Espacio para el logo + margen reducido
      }
    } catch (error) {
      console.error('Error loading company logo:', error);
      // Fallback a iniciales si falla cargar la imagen
      logoWidth = 0;
    }
  }
  
  // Si no hay logo o fallo al cargar, usar iniciales como fallback
  if (logoWidth === 0) {
    const companyLogo = data.company.name ? 
      data.company.name.split(' ').map(word => word.charAt(0)).join('').substring(0, 3).toUpperCase() :
      'CO';
      
    addText(companyLogo, col1X, currentY, {
      fontSize: 28,
      fontStyle: 'bold',
      color: colors.primary
    });
    logoWidth = 16; // Espacio para las iniciales reducido
  }
  
  addText(data.company.name || 'Transport LLC', col1X + logoWidth, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  // Posicionar toda la información debajo del nombre de la compañía
  let companyInfoY = currentY + 6;
  
  if (data.company.address) {
    const addressLines = data.company.address.split('\n');
    
    addressLines.forEach((line, index) => {
      addText(line.trim(), col1X + logoWidth, companyInfoY + (index * 4), {
        fontSize: 9,
        color: colors.text
      });
    });
    
    companyInfoY += (addressLines.length * 4);
  }
  
  if (data.company.phone) {
    addText(data.company.phone, col1X + logoWidth, companyInfoY, {
      fontSize: 9,
      color: colors.text
    });
    companyInfoY += 4;
  }
  
  if (data.company.email) {
    addText(data.company.email, col1X + logoWidth, companyInfoY, {
      fontSize: 9,
      color: colors.text
    });
  }

  // === COLUMNA 2: INFORMACIÓN DEL PERIODO ===
  const weekInfo = formatWeekInfo();
  addText('Driver Pay Report', col2X + colWidth/2, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray,
    align: 'center'
  });
  
  addText(weekInfo.week, col2X + colWidth/2, currentY + 4, {
    fontSize: 11,
    fontStyle: 'bold',
    color: colors.text,
    align: 'center'
  });
  
  addText(weekInfo.dateRange, col2X + colWidth/2, currentY + 8, {
    fontSize: 9,
    color: colors.text,
    align: 'center'
  });
  
  addText(weekInfo.paymentDate, col2X + colWidth/2, currentY + 12, {
    fontSize: 9,
    color: colors.text,
    align: 'center'
  });

  // === COLUMNA 3: INFORMACIÓN DEL CONDUCTOR ===
  addText(data.driver.name, col3X + colWidth, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray,
    align: 'right'
  });
  
  // Posicionar toda la información debajo del nombre del conductor
  let driverInfoY = currentY + 6;
  
  if (data.driver.license) {
    const licenseText = data.driver.license_state 
      ? `Driver License: ${data.driver.license} (${data.driver.license_state})`
      : `Driver License: ${data.driver.license}`;
    
    addText(licenseText, col3X + colWidth, driverInfoY, {
      fontSize: 9,
      color: colors.text,
      align: 'right'
    });
    driverInfoY += 4;
  }
  
  if (data.driver.address) {
    const addressLines = data.driver.address.split('\n');
    
    addressLines.forEach((line, index) => {
      addText(line.trim(), col3X + colWidth, driverInfoY + (index * 4), {
        fontSize: 9,
        color: colors.text,
        align: 'right'
      });
    });
    
    driverInfoY += (addressLines.length * 4);
  }
  
  if (data.driver.phone) {
    addText(data.driver.phone, col3X + colWidth, driverInfoY, {
      fontSize: 9,
      color: colors.text,
      align: 'right'
    });
    driverInfoY += 4;
  }
  
  if (data.driver.email) {
    addText(data.driver.email, col3X + colWidth, driverInfoY, {
      fontSize: 9,
      color: colors.text,
      align: 'right'
    });
  }

  currentY += 25;

  // === CAJAS DE RESUMEN SUPERIOR ===
  const totalBoxesWidth = pageWidth - margin*2 + 10; // Mismo ancho que la cabecera
  const boxesStartX = margin - 5; // Misma posición X que la cabecera
  const boxWidth = (totalBoxesWidth - 15) / 4; // 4 cajas con espacios
  const boxHeight = 13;
  
  // Gross Earnings (Verde)
  addColoredBox(boxesStartX, currentY, boxWidth, boxHeight, colors.lightGreen, colors.darkGray, 
    'Gross Earnings', formatCurrency(data.period.gross_earnings));
  
  // Other Earnings (Azul)
  addColoredBox(boxesStartX + boxWidth + 5, currentY, boxWidth, boxHeight, colors.lightBlue, colors.darkGray,
    'Other Earnings', formatCurrency(data.period.other_income));
  
  // Total Deductions (Rojo)
  addColoredBox(boxesStartX + (boxWidth + 5) * 2, currentY, boxWidth, boxHeight, colors.lightRed, colors.darkGray,
    'Total Deductions', formatCurrency(-data.period.total_deductions));
  
  // Fuel Expenses (Naranja)
  addColoredBox(boxesStartX + (boxWidth + 5) * 3, currentY, boxWidth, boxHeight, colors.lightOrange, colors.darkGray,
    'Fuel Expenses', formatCurrency(-data.period.fuel_expenses));

  currentY += boxHeight + 4;

  // Net Pay (Caja grande azul)
  const netPayWidth = totalBoxesWidth; // Mismo ancho que la cabecera
  addColoredBox(boxesStartX, currentY, netPayWidth, 13, colors.lightBlue, colors.primary,
    'Net Pay', formatCurrency(data.period.net_payment));

  currentY += 20;

  // === LOADS COMPLETED ===
  addText('Loads completed', margin, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  currentY += 10;

  if (data.loads && data.loads.length > 0) {
    data.loads.forEach((load, index) => {
      // Load number (en negrita)
      const loadText = `Load#: ${load.load_number}`;
      addText(loadText, margin, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: colors.darkGray
      });
      
      // PO number (sin negrita, al lado del load number)
      if (load.po_number) {
        // Configurar la fuente para calcular el ancho correctamente
        doc.setFont(doc.getFont().fontName, 'bold');
        doc.setFontSize(10);
        const textWidth = doc.getTextWidth(loadText);
        
        addText(` (PO: ${load.po_number})`, margin + textWidth, currentY, {
          fontSize: 10,
          fontStyle: 'normal',
          color: colors.darkGray
        });
      }
      
      addText(`(Stops: ${load.stops || 2} Total)`, margin, currentY + 5, {
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
        fontSize: 10,
        fontStyle: 'bold',
        color: colors.darkGray,
        align: 'right'
      });

      // Pickup y Delivery
      const pickupText = `PU: ${new Date(load.pickup_date).toLocaleDateString('en-US')} ${load.pickup_location || ''}`;
      const deliveryText = `DEL: ${new Date(load.delivery_date).toLocaleDateString('en-US')} ${load.delivery_location || ''}`;
      
      addText(`${pickupText} | ${deliveryText}`, margin + 50, currentY + 5, {
        fontSize: 8,
        color: colors.gray
      });

      currentY += 15; // Reducido de 20 a 15
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
  const expenseColWidth = (pageWidth - margin*2 - 10) / 2;
  
  // Columna 1: Deductions
  const expense1X = margin;
  const expense1Y = currentY;
  
  const redRgb = hexToRgb(colors.lightRed);
  doc.setFillColor(redRgb[0], redRgb[1], redRgb[2]);
  doc.rect(expense1X, expense1Y - 5, expenseColWidth, 8, 'F');
  
  const totalDeductions = data.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
  addText(`Deductions ($${totalDeductions.toFixed(2)})`, expense1X + 2, expense1Y, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  currentY += 10;
  
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach(deduction => {
      addText(deduction.description, expense1X + 2, currentY, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(-deduction.amount), expense1X + expenseColWidth - 2, currentY, {
        fontSize: 9,
        color: colors.danger,
        align: 'right'
      });
      
      currentY += 6;
    });
  }

  // Columna 2: Weekly Expenses
  const expense2X = margin + expenseColWidth + 10;
  let expense2Y = expense1Y;
  
  const redRgb2 = hexToRgb(colors.lightRed);
  doc.setFillColor(redRgb2[0], redRgb2[1], redRgb2[2]);
  doc.rect(expense2X, expense2Y - 5, expenseColWidth, 8, 'F');
  
  const totalWeekly = data.weeklyExpenses?.reduce((sum, w) => sum + w.amount, 0) || 0;
  addText(`Weekly Expenses ($${totalWeekly.toFixed(2)})`, expense2X + 2, expense2Y, {
    fontSize: 10,
    fontStyle: 'bold',
    color: colors.darkGray
  });
  
  expense2Y += 10;
  
  if (data.weeklyExpenses && data.weeklyExpenses.length > 0) {
    data.weeklyExpenses.forEach(expense => {
      addText(expense.description, expense2X + 2, expense2Y, {
        fontSize: 9,
        color: colors.gray
      });
      
      addText(formatCurrency(-expense.amount), expense2X + expenseColWidth - 2, expense2Y, {
        fontSize: 9,
        color: colors.danger,
        align: 'right'
      });
      
      expense2Y += 6;
    });
  }

  currentY = Math.max(currentY, expense2Y) + 15;

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
      // Verificar si necesitamos nueva página antes de agregar cada línea de combustible
      if (currentY > pageHeight - footerSpace) {
        doc.addPage();
        currentY = margin;
      }
      
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
  if (currentY > pageHeight - footerSpace) {
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

  // === PIE DE PÁGINA ===
  const addFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 12; // Mismo margen que la cabecera (12)
    const footerHeight = 12;
    
    // Contenedor del pie de página con mismo estilo que la cabecera
    addRoundedBox(margin - 5, footerY - 7, pageWidth - margin*2 + 10, footerHeight, colors.lightGray, 2, colors.border);
    
    // Número de página (izquierda)
    if (totalPages > 1) {
      addText(`Page ${pageNumber} of ${totalPages}`, margin, footerY - 1, {
        fontSize: 8,
        color: colors.gray
      });
    }
    
    // Fecha de generación (centro)
    const reportDate = new Date();
    addText(`Generated on ${reportDate.toLocaleDateString('en-US')} at ${reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 
      pageWidth / 2, footerY - 1, {
        fontSize: 8,
        color: colors.gray,
        align: 'center'
      });
    
    // Información de contacto (derecha)
    addText(`${data.company.phone || 'Contact: ' + (data.company.email || 'N/A')}`, pageWidth - margin, footerY - 1, {
      fontSize: 8,
      color: colors.gray,
      align: 'right'
    });
  };

  // Contar páginas totales del documento
  const totalPages = doc.getNumberOfPages();
  
  // Agregar pie de página a todas las páginas
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

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