// ===============================================
// 🚨 SISTEMA GENERACIÓN PDF DE REPORTES - CRÍTICO v1.0
// ===============================================
// Este archivo contiene la lógica fundamental para la generación
// de PDFs de reportes de pago de conductores. Cualquier modificación
// puede afectar la exactitud de los reportes financieros críticos.
// NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA.
// ===============================================

import jsPDF from "jspdf";
import { formatDateSafe, formatDateOnly, formatDateAuto, formatDateTimeShort, formatCurrency as formatCurrencyLib } from './dateFormatting';

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
    pickup_company?: string;
    delivery_company?: string;
    client_name?: string;
    total_amount: number;
    factoring_percentage?: number;
    dispatching_percentage?: number;
    leasing_percentage?: number;
    stops?: number;
    load_stops?: Array<{
      stop_type: string;
      company_name: string;
      city: string;
      state: string;
      stop_number?: number;
      scheduled_date?: string;
    }>;
  }>;
  fuelExpenses?: Array<{
    transaction_date: string;
    station_name: string;
    station_city?: string;
    station_state?: string;
    gallons_purchased: number;
    price_per_gallon?: number;
    total_amount: number;
  }>;
  deductions?: Array<{
    name: string;
    notes?: string;
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

// 🚨 FUNCIÓN CRÍTICA - NO MODIFICAR SIN AUTORIZACIÓN
// Esta función es responsable de generar los PDFs de reportes de pago
// Cualquier cambio puede afectar reportes financieros críticos del negocio
export async function generatePaymentReportPDF(data: PaymentReportData, isPreview?: boolean, targetWindow?: Window | null): Promise<jsPDF | void> {
  console.log('🔍 PDF Generation - Starting function');
  console.log('🔍 PDF Generation - Data received:', data);
  console.log('🔍 PDF Generation - isPreview parameter:', isPreview);
  console.log('🔍 PDF Generation - targetWindow:', !!targetWindow);
  console.log('🔍 PDF Generation - typeof isPreview:', typeof isPreview);
  
  const doc = new jsPDF('p', 'mm', 'letter');
  
  // Configurar fuente Helvetica como base (que es similar a Inter y está disponible en jsPDF)
  doc.setFont('helvetica');
  
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

  // Colores del diseño mejorados - Tonos más suaves y pasteles
  const colors = {
    primary: '#3b82f6',     // Azul principal más suave
    success: '#22c55e',     // Verde más suave
    warning: '#f59e0b',     // Naranja más suave
    danger: '#ef4444',      // Rojo más suave
    lightBlue: '#eff6ff',   // Azul pastel más suave
    lightGreen: '#f0fdf4',  // Verde pastel más suave
    lightOrange: '#fef3e2', // Naranja pastel más suave
    lightRed: '#fef2f2',    // Rojo pastel más suave
    gray: '#6b7280',        
    darkGray: '#1f2937',    
    lightGray: '#e8e8e8',   // Gris más intenso para cabecera, pie y Net Pay
    border: '#d1d5db',      // Borde más intenso para cabecera, pie y Period Summary
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
    doc.setLineWidth(0.2); // Línea más fina para bordes más suaves
    doc.rect(x, y, width, height);
  };

  const addColoredBox = (x: number, y: number, width: number, height: number, bgColor: string, textColor: string, title: string, value: string, borderColor?: string) => {
    // Fondo de color con esquinas redondeadas
    const bgRgb = hexToRgb(bgColor);
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Borde con color específico o más suave
    const border = borderColor || colors.border;
    const borderRgb = hexToRgb(border);
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.setLineWidth(0.1); // Línea aún más fina para bordes de cajas
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
      fontSize: 12,
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
      doc.setLineWidth(0.1); // Línea más fina para bordes suaves
      doc.roundedRect(x, y, width, height, radius, radius, 'S');
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyLib(amount, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'decimal'
    });
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
        `Payment Date: ${formatDateAuto(data.period.payment_date)}` :
        'Payment Date: Not Set'
    };
  };

  // Función para generar la cabecera (reutilizable en cada página)
  const addPageHeader = async () => {
    currentY = 14;
    
    // Agregar fondo gris claro con esquinas redondeadas y borde para la cabecera
    const headerHeight = 26;
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
          // Agregar imagen del logo centrado verticalmente
          const logoSize = 15; // Tamaño del logo en mm
          const headerHeight = 26;
          const logoY = currentY - 7 + (headerHeight - logoSize) / 2; // Centrar verticalmente en el header
          doc.addImage(logoData, 'PNG', col1X, logoY, logoSize, logoSize);
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
      fontSize: 10,
      fontStyle: 'bold',
      color: '#003366'
    });
    
    // Posicionar toda la información debajo del nombre de la compañía
    let companyInfoY = currentY + 4;
    
    if (data.company.address) {
      const addressLines = data.company.address.split('\n');
      
      addressLines.forEach((line, index) => {
        addText(line.trim(), col1X + logoWidth, companyInfoY + (index * 4), {
          fontSize: 9,
          color: '#003366'
        });
      });
      
      companyInfoY += (addressLines.length * 4);
    }
    
    if (data.company.phone) {
      addText(data.company.phone, col1X + logoWidth, companyInfoY, {
        fontSize: 9,
        color: '#003366'
      });
      companyInfoY += 4;
    }
    
    if (data.company.email) {
      addText(data.company.email, col1X + logoWidth, companyInfoY, {
        fontSize: 9,
        color: '#003366'
      });
    }

    // === COLUMNA 2: INFORMACIÓN DEL PERIODO ===
    const weekInfo = formatWeekInfo();
    addText('Driver Pay Report', col2X + colWidth/2, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
      color: '#003366',
      align: 'center'
    });
    
    addText(weekInfo.week, col2X + colWidth/2, currentY + 4, {
      fontSize: 11,
      fontStyle: 'bold',
      color: '#003366',
      align: 'center'
    });
    
    addText(weekInfo.dateRange, col2X + colWidth/2, currentY + 8, {
      fontSize: 9,
      color: '#003366',
      align: 'center'
    });
    
    addText(weekInfo.paymentDate, col2X + colWidth/2, currentY + 12, {
      fontSize: 9,
      color: '#003366',
      align: 'center'
    });

    // === COLUMNA 3: INFORMACIÓN DEL CONDUCTOR ===
    addText(data.driver.name, col3X + colWidth, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: '#003366',
      align: 'right'
    });
    
    // Posicionar toda la información debajo del nombre del conductor
    let driverInfoY = currentY + 4;
    
    if (data.driver.license) {
      const licenseText = data.driver.license_state 
        ? `Driver License: ${data.driver.license} (${data.driver.license_state})`
        : `Driver License: ${data.driver.license}`;
      
      addText(licenseText, col3X + colWidth, driverInfoY, {
        fontSize: 9,
        color: '#003366',
        align: 'right'
      });
      driverInfoY += 4;
    }
    
    if (data.driver.address) {
      const addressLines = data.driver.address.split('\n');
      
      addressLines.forEach((line, index) => {
        addText(line.trim(), col3X + colWidth, driverInfoY + (index * 4), {
          fontSize: 9,
          color: '#003366',
          align: 'right'
        });
      });
      
      driverInfoY += (addressLines.length * 4);
    }
    
    if (data.driver.phone) {
      addText(data.driver.phone, col3X + colWidth, driverInfoY, {
        fontSize: 9,
        color: '#003366',
        align: 'right'
      });
      driverInfoY += 4;
    }
    

    currentY += 25; // Reducido de 30 a 25 para menos espaciado
  };

  // === HEADER EN TRES COLUMNAS ===
  await addPageHeader();

  // === CAJAS DE RESUMEN SUPERIOR ===
  const totalBoxesWidth = pageWidth - margin*2 + 10; // Mismo ancho que la cabecera
  const boxesStartX = margin - 5; // Misma posición X que la cabecera
  const boxWidth = (totalBoxesWidth - 9) / 4; // 4 cajas con espacios reducidos
  const boxHeight = 11;
  
  // Gross Earnings (Azul #003366)
  addColoredBox(boxesStartX, currentY, boxWidth, boxHeight, '#003366', '#ffffff',
    'Gross Earnings', formatCurrency(data.period.gross_earnings), '#003366');
  
  // Other Earnings (Azul #003366)
  addColoredBox(boxesStartX + boxWidth + 3, currentY, boxWidth, boxHeight, '#003366', '#ffffff',
    'Other Earnings', formatCurrency(data.period.other_income), '#003366');
  
  // Period Deductions (Naranja #ff7a00)
  addColoredBox(boxesStartX + (boxWidth + 3) * 2, currentY, boxWidth, boxHeight, '#ff7a00', '#ffffff',
    'Period Deductions', formatCurrency(-data.period.total_deductions), '#ff7a00');
  
  // Fuel Expenses (Naranja #ff7a00)
  addColoredBox(boxesStartX + (boxWidth + 3) * 3, currentY, boxWidth, boxHeight, '#ff7a00', '#ffffff',
    'Fuel Expenses', formatCurrency(-data.period.fuel_expenses), '#ff7a00');

  currentY += boxHeight + 3;

  // Net Pay (Gris como la cabecera con texto azul #003366)
  const netPayWidth = totalBoxesWidth; // Mismo ancho que la cabecera
  addColoredBox(boxesStartX, currentY, netPayWidth, 11, colors.lightGray, '#003366',
    'Net Pay', formatCurrency(data.period.net_payment), colors.border);

  currentY += 23; // Reducido de 25 a 23 para menos espaciado

  // === LOADS COMPLETED ===
  // Calcular el conteo y suma total de las cargas
  const loadCount = data.loads?.length || 0;
  const totalAmount = data.loads?.reduce((sum, load) => sum + (load.total_amount || 0), 0) || 0;
  const formattedTotal = formatCurrency(totalAmount);
  
  // Usar mismo estilo que la sección Other Earnings (fondo azul #003366 con texto blanco)
  const loadsRgb = hexToRgb('#003366');
  doc.setFillColor(loadsRgb[0], loadsRgb[1], loadsRgb[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'F');
  
  // Agregar borde fino con el mismo color
  doc.setDrawColor(loadsRgb[0], loadsRgb[1], loadsRgb[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'S');
  
  addText(`Completed Loads (Count: ${loadCount}, Total: ${formattedTotal})`, margin + 2, currentY, {
    fontSize: 11,
    fontStyle: 'bold',
    color: '#ffffff' // Texto blanco para contraste con fondo azul
  });
  currentY += 10;

  if (data.loads && data.loads.length > 0) {
    data.loads.forEach((load, index) => {
      // Calcular el ancho necesario para alinear los dos puntos
      const loadPrefix = 'Load#';
      const pupPrefix = 'PUP';
      const delPrefix = 'DEL';
      
      // Encontrar el ancho máximo para alinear los dos puntos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const loadPrefixWidth = doc.getTextWidth(loadPrefix);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const pupPrefixWidth = doc.getTextWidth(pupPrefix);
      const delPrefixWidth = doc.getTextWidth(delPrefix);
      
      // Usar el ancho máximo entre PUP y DEL para alinearlas correctamente
      const maxPickupDeliveryWidth = Math.max(pupPrefixWidth, delPrefixWidth);
      const maxPrefixWidth = Math.max(loadPrefixWidth, maxPickupDeliveryWidth);
      const colonPosition = margin + maxPrefixWidth;
      
      // Load number (en negrita) con alineación
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      addText('Load', margin, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: '#003366'
      });
      addText(`#${load.load_number}`, colonPosition, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: '#003366'
      });
      
      // PO number (sin negrita, al lado del load number)
      if (load.po_number) {
        // Configurar la fuente para calcular el ancho correctamente
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const loadTextWidth = doc.getTextWidth(`${loadPrefix}: ${load.load_number}`);
        
        addText(` (PO: ${load.po_number})`, margin + loadTextWidth, currentY, {
          fontSize: 10,
          fontStyle: 'normal',
          color: '#003366'
        });
      }
      

      // Porcentajes y monto (derecha) - en la misma línea con estilos diferentes
      const percentages = [];
      if (load.factoring_percentage) percentages.push(`F.${load.factoring_percentage}%: (-$${(load.total_amount * load.factoring_percentage / 100).toFixed(2)})`);
      if (load.dispatching_percentage) percentages.push(`D.${load.dispatching_percentage}%: (-$${(load.total_amount * load.dispatching_percentage / 100).toFixed(2)})`);
      if (load.leasing_percentage) percentages.push(`L.${load.leasing_percentage}%: (-$${(load.total_amount * load.leasing_percentage / 100).toFixed(2)})`);
      
      // Primero mostrar el monto total (alineado a la derecha)
      addText(formatCurrency(load.total_amount), pageWidth - margin, currentY, {
        fontSize: 11,
        fontStyle: 'bold',
        color: '#003366',
        align: 'right'
      });
      
      // Si hay porcentajes, mostrarlos delante del monto con su estilo propio
      if (percentages.length > 0) {
        const percentageText = percentages.join(' ');
        
        // Calcular el ancho del monto para posicionar los porcentajes delante
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const amountWidth = doc.getTextWidth(formatCurrency(load.total_amount));
        
        addText(percentageText, pageWidth - margin - amountWidth - 5, currentY, {
          fontSize: 8, // Fuente pequeña para porcentajes
          fontStyle: 'normal',
          color: '#ff7a00', // Color naranja para los porcentajes
          align: 'right'
        });
      }

      // Todas las paradas ordenadas por stop_number
      const allStops = load.load_stops ? [...load.load_stops].sort((a, b) => (a.stop_number || 0) - (b.stop_number || 0)) : [];
      
      let stopOffset = 4; // Inicio del offset para las paradas
      
      // Si no hay paradas específicas en load_stops, usar las fechas principales de pickup y delivery
      if (allStops.length === 0) {
        // Mostrar PUP con fecha
        if (load.pickup_date) {
          const pupDate = formatDateAuto(load.pickup_date);
          const pupLocation = load.pickup_location || load.pickup_company || '';
          
          const stopPosition = colonPosition - maxPickupDeliveryWidth;
          addText('PUP', stopPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(':', colonPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(` ${pupDate} ${pupLocation}`, colonPosition + 3, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'normal',
            color: '#003366'
          });
          
          stopOffset += 4;
        }
        
        // Mostrar DEL con fecha
        if (load.delivery_date) {
          const delDate = formatDateAuto(load.delivery_date);
          const delLocation = load.delivery_location || load.delivery_company || '';
          
          const stopPosition = colonPosition - maxPickupDeliveryWidth;
          addText('DEL', stopPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(':', colonPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(` ${delDate} ${delLocation}`, colonPosition + 3, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'normal',
            color: '#003366'
          });
          
          stopOffset += 4;
        }
      } else {
        // Mostrar todas las paradas si hay datos en load_stops
        allStops.forEach((stop, index) => {
          // Usar la fecha principal de pickup o delivery si está disponible, sino usar scheduled_date
          let stopDate = 'N/A';
          if (stop.stop_type === 'pickup' && load.pickup_date) {
            stopDate = formatDateAuto(load.pickup_date);
          } else if (stop.stop_type === 'delivery' && load.delivery_date) {
            stopDate = formatDateAuto(load.delivery_date);
          } else if (stop.scheduled_date) {
            stopDate = formatDateAuto(stop.scheduled_date);
          }
          
          const stopCompany = stop.company_name || '';
          const stopLocation = `${stop.city}, ${stop.state}`;
          
          // Determinar el prefijo según el tipo de parada
          const stopPrefix = stop.stop_type === 'pickup' ? 'PUP' : 'DEL';
          
          // Mostrar la parada con alineación
          const stopPosition = colonPosition - maxPickupDeliveryWidth;
          addText(stopPrefix, stopPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(':', colonPosition, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'bold',
            color: '#003366'
          });
          addText(` ${stopDate} ${stopCompany} (${stopLocation})`, colonPosition + 3, currentY + stopOffset, {
            fontSize: 9,
            fontStyle: 'normal',
            color: '#003366'
          });
          
          stopOffset += 4; // Incrementar offset para la siguiente parada
        });
      }

      currentY += stopOffset + 3; // Reducido de 4 a 3 para menos separación entre cargas
    });
  }

  currentY += 6;

  // === OTHER EARNINGS ===
  // Calcular el conteo y total de other earnings
  const otherIncomeCount = data.otherIncome?.length || 0;
  const totalOtherIncome = data.period.other_income || 0;
  
  // Verificar si toda la sección de other earnings cabe en la página actual
  const otherIncomeSectionHeight = 8 + 10 + (otherIncomeCount * 6); // Header + spacing + items
  
  // Verificar si toda la sección cabe en la página actual
  if (currentY + otherIncomeSectionHeight > pageHeight - footerSpace) {
    doc.addPage();
    await addPageHeader();
    currentY += 5; // Agregar espaciado consistente con la primera página
  }
  
  // Usar mismo color que la tarjeta del contador "Other Earnings" (azul #003366)
  const otherEarningsRgb = hexToRgb('#003366');
  doc.setFillColor(otherEarningsRgb[0], otherEarningsRgb[1], otherEarningsRgb[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'F');
  
  // Agregar borde fino con el mismo color
  doc.setDrawColor(otherEarningsRgb[0], otherEarningsRgb[1], otherEarningsRgb[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'S');
  
  addText(`Other Earnings (Count: ${otherIncomeCount}, Total: ${formatCurrency(totalOtherIncome)})`, margin + 2, currentY, {
    fontSize: 11,
    fontStyle: 'bold',
    color: '#ffffff' // Texto blanco para contraste con fondo azul
  });
  
  currentY += 10;

  if (data.otherIncome && data.otherIncome.length > 0) {
    data.otherIncome.forEach(income => {
      addText(income.description, margin + 2, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      addText(formatCurrency(income.amount), pageWidth - margin - 2, currentY, {
        fontSize: 9,
        color: '#003366',
        align: 'right'
      });
      
      currentY += 4;
    });
  } else {
    addText('No other earnings for this period', margin + 2, currentY, {
      fontSize: 9,
      fontStyle: 'italic',
      color: '#003366' // Color de fuente #003366
    });
    currentY += 4;
  }

  currentY += 6;

  // Sección única de deducciones
  // Calcular el espacio necesario para toda la sección de deducciones
  const deductionsCount = data.deductions?.length || 0;
  const deductionsSectionHeight = 8 + 10 + (deductionsCount * 6); // Header + spacing + items
  
  // Verificar si toda la sección de deducciones cabe en la página actual
  if (currentY + deductionsSectionHeight > pageHeight - footerSpace) {
    doc.addPage();
    await addPageHeader();
  }
  
  // Agregar espaciado consistente con la primera página
  currentY += 5;
  
  // Usar mismo color que la tarjeta del contador "Period Deductions" (naranja #ff7a00)
  const deductionsRgb = hexToRgb('#ff7a00');
  doc.setFillColor(deductionsRgb[0], deductionsRgb[1], deductionsRgb[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'F');
  
  // Agregar borde fino con el mismo color
  doc.setDrawColor(deductionsRgb[0], deductionsRgb[1], deductionsRgb[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'S');
  
  const totalDeductions = data.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
  addText(`Period Deductions (Count: ${deductionsCount}, Total: ${formatCurrency(totalDeductions)})`, margin + 2, currentY, {
    fontSize: 11,
    fontStyle: 'bold',
    color: '#ffffff' // Texto blanco para contraste con fondo naranja
  });
  
  currentY += 10;
  
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach(deduction => {
      // Construir el texto de la deducción con notas entre paréntesis si existe
      let deductionText = deduction.name;
      if (deduction.notes && deduction.notes.trim()) {
        deductionText += ` (${deduction.notes})`;
      }
      
      addText(deductionText, margin + 2, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      addText(formatCurrency(-deduction.amount), pageWidth - margin - 2, currentY, {
        fontSize: 9,
        color: '#ff7a00', // Color naranja #ff7a00 para los montos
        align: 'right'
      });
      
      currentY += 4;
    });
  } else {
    addText('No deductions for this period', margin + 2, currentY, {
      fontSize: 9,
      fontStyle: 'italic',
      color: '#003366' // Color de fuente #003366
    });
    currentY += 4;
  }

  currentY += 6;

  // === FUEL PURCHASES ===
  // Calcular el espacio necesario para toda la sección de combustible
  const fuelCount = data.fuelExpenses?.length || 0;
  const fuelSectionHeight = 8 + 10 + (fuelCount * 4); // Header + spacing + items (actualizado a 4 puntos)
  
  // Verificar si toda la sección de combustible cabe en la página actual
  if (currentY + fuelSectionHeight > pageHeight - footerSpace) {
    doc.addPage();
    await addPageHeader();
  }
  
  // Agregar espaciado consistente con la primera página
  currentY += 5;
  
  // Usar mismo color que la tarjeta del contador "Fuel Expenses" (naranja #ff7a00)
  const fuelRgb = hexToRgb('#ff7a00');
  doc.setFillColor(fuelRgb[0], fuelRgb[1], fuelRgb[2]);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'F');
  
  // Agregar borde fino con el mismo color
  doc.setDrawColor(fuelRgb[0], fuelRgb[1], fuelRgb[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY - 5, pageWidth - margin*2, 8, 2, 2, 'S');
  
  addText(`Fuel Expenses (Count: ${fuelCount}, Total: ${formatCurrency(data.period.fuel_expenses)})`, margin + 2, currentY, {
    fontSize: 11,
    fontStyle: 'bold',
    color: '#ffffff' // Texto blanco para contraste con fondo naranja
  });
  
  currentY += 10;

  if (data.fuelExpenses && data.fuelExpenses.length > 0) {
    data.fuelExpenses.forEach(fuel => {
      // ✅ CORREGIDO: Usar formatDateAuto para internacionalización
      const dateStr = formatDateAuto(fuel.transaction_date);
      
      addText(dateStr, margin + 2, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      // Formatear estación con ciudad y estado entre paréntesis
      let stationText = fuel.station_name || 'N/A';
      if (fuel.station_city && fuel.station_state) {
        stationText += ` (${fuel.station_city}, ${fuel.station_state})`;
      } else if (fuel.station_city) {
        stationText += ` (${fuel.station_city})`;
      } else if (fuel.station_state) {
        stationText += ` (${fuel.station_state})`;
      }
      
      addText(stationText, margin + 30, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      addText(`${(fuel.gallons_purchased || 0).toFixed(2)} gal`, margin + 130, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      addText(`$${(fuel.price_per_gallon || 0).toFixed(3)}`, margin + 155, currentY, {
        fontSize: 9,
        color: '#003366' // Color de fuente #003366
      });
      
      addText(formatCurrency(-fuel.total_amount), pageWidth - margin - 2, currentY, {
        fontSize: 9,
        color: '#ff7a00', // Color naranja #ff7a00 para los montos
        align: 'right'
      });
      
      currentY += 4;
    });
  } else {
    addText('No fuel expenses for this period', margin + 2, currentY, {
      fontSize: 9,
      fontStyle: 'italic',
      color: '#003366' // Color de fuente #003366
    });
    currentY += 4;
  }

  // Calcular el espacio necesario para toda la sección de dos columnas
  const twoColumnSectionHeight = 15 + 12 + 60 + 20; // Espaciado inicial + títulos + contenido + margen extra
  
  // Verificar si toda la sección de dos columnas cabe en la página actual
  if (currentY + twoColumnSectionHeight > pageHeight - footerSpace) {
    doc.addPage();
    await addPageHeader();
    currentY += 5; // Agregar espaciado consistente con otras páginas
  }

  currentY += 15;

  // === TWO COLUMN LAYOUT ===
  const columnWidth = (pageWidth - margin*3) / 2; // Ancho de cada columna
  const leftColumnX = margin;
  const rightColumnX = margin + columnWidth + 15; // Columna derecha con espacio
  
  // === COLUMNA IZQUIERDA: INFORMACIÓN DEL CONDUCTOR ===
  addText('Driver Information', leftColumnX, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: '#003366' // Color de fuente #003366
  });
  
  let leftY = currentY + 8;
  
  // Información del conductor
  addText(`Driver Name: ${data.driver.name}`, leftColumnX, leftY, {
    fontSize: 9,
    fontStyle: 'bold',
    color: '#003366' // Color de fuente #003366
  });
  leftY += 4;
  
  if (data.driver.email) {
    addText(`Email: ${data.driver.email}`, leftColumnX, leftY, {
      fontSize: 9,
      color: '#003366' // Color de fuente #003366
    });
    leftY += 4;
  }
  
  // Área de firma
  leftY += 6;
  addText('Signature:', leftColumnX, leftY, {
    fontSize: 10,
    fontStyle: 'bold',
    color: '#003366' // Color de fuente #003366
  });
  
  leftY += 6;
  // Línea para firma
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(leftColumnX, leftY, leftColumnX + columnWidth - 20, leftY);
  
  leftY += 6;
  const signDate = new Date();
  addText(`Date: ${formatDateAuto(signDate)}`, leftColumnX, leftY, {
    fontSize: 9,
    color: '#003366' // Color de fuente #003366
  });
  
  // Mensaje de agradecimiento
  leftY += 8;
  addText('If you have any questions, please contact us by phone', leftColumnX, leftY, {
    fontSize: 8,
    color: '#003366' // Color de fuente #003366
  });
  
  leftY += 4;
  addText(`or email at ${data.company.email || 'hgtransport16@gmail.com'}`, leftColumnX, leftY, {
    fontSize: 8,
    color: '#003366' // Color de fuente #003366
  });
  
  leftY += 6;
  addText('Thank you for your business - We really appreciate it.', leftColumnX, leftY, {
    fontSize: 8,
    fontStyle: 'bold',
    color: '#003366' // Color de fuente #003366
  });
  
  // === COLUMNA DERECHA: RESUMEN ===
  // Agregar contenedor con bordes redondeados para la sección de resumen
  const summaryHeight = 60; // Altura aproximada del contenedor
  addRoundedBox(rightColumnX - 5, currentY - 8, 95, summaryHeight, colors.lightGray, 2, colors.border);
  
  addText('Period Summary', rightColumnX, currentY, {
    fontSize: 12,
    fontStyle: 'bold',
    color: '#003366' // Color de fuente #003366
  });
  
  let rightY = currentY + 12;
  
  const summaryData = [
    { label: 'Gross Earnings', amount: data.period.gross_earnings },
    { label: 'Other Earnings', amount: data.period.other_income },
    { label: 'Period Deductions', amount: -data.period.total_deductions },
    { label: 'Fuel Expenses', amount: -data.period.fuel_expenses }
  ];

  summaryData.forEach(item => {
    addText(item.label, rightColumnX, rightY, {
      fontSize: 10,
      color: '#003366' // Color de fuente #003366
    });
    
    // Color específico para deducción y combustible (#ff7a00), normal para otros
    let amountColor = '#003366'; // Color por defecto
    if (item.label === 'Period Deductions' || item.label === 'Fuel Expenses') {
      amountColor = '#ff7a00'; // Color naranja para deducción y combustible
    }
    
    addText(formatCurrency(item.amount), rightColumnX + 80, rightY, {
      fontSize: 10,
      color: amountColor,
      align: 'right'
    });
    
    rightY += 8;
  });

  // Usar mismo estilo que la sección Completed Loads (fondo azul #003366 con texto blanco)
  const netPayRgb = hexToRgb('#003366');
  doc.setFillColor(netPayRgb[0], netPayRgb[1], netPayRgb[2]);
  doc.roundedRect(rightColumnX, rightY, 85, 10, 2, 2, 'F');
  
  // Agregar borde fino con el mismo color
  doc.setDrawColor(netPayRgb[0], netPayRgb[1], netPayRgb[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(rightColumnX, rightY, 85, 10, 2, 2, 'S');
  
  addText('Net Pay', rightColumnX + 2, rightY + 6, {
    fontSize: 12,
    fontStyle: 'bold',
    color: '#ffffff' // Texto blanco para contraste con fondo azul
  });
  
  addText(formatCurrency(data.period.net_payment), rightColumnX + 80, rightY + 6, {
    fontSize: 12,
    fontStyle: 'bold',
    color: '#ffffff', // Texto blanco para contraste con fondo azul
    align: 'right'
  });


  // === PIE DE PÁGINA ===
  const addFooter = async (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 12; // Mismo margen que la cabecera (12)
    const footerHeight = 12;
    
    // Contenedor del pie de página con mismo estilo que la cabecera
    addRoundedBox(margin - 5, footerY - 7, pageWidth - margin*2 + 10, footerHeight, colors.lightGray, 2, colors.border);
    
    // Logo y textos de Harvox TMS (izquierda)
    // Logo de la app Harvox TMS
    const logoSize = 8; // Tamaño pequeño para el pie de página
    let logoWidth = 0;
    
    try {
      // URL del logo de Harvox TMS (puedes cambiar esta URL por la del logo real de la app)
      const harvoxLogoUrl = '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png'; // Logo real de Harvox TMS
      const logoData = await loadImageFromUrl(harvoxLogoUrl);
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, footerY - 5, logoSize, logoSize);
        logoWidth = logoSize + 2;
      }
    } catch (error) {
      console.error('Error loading Harvox TMS logo in footer:', error);
    }
    
    // Si no hay logo, usar iniciales "HT" para Harvox TMS
    if (logoWidth === 0) {
      addText('HT', margin, footerY - 1, {
        fontSize: 10,
        fontStyle: 'bold',
        color: colors.primary
      });
      logoWidth = 12;
    }
    
    addText('Powered by Harvox TMS', margin + logoWidth, footerY - 2, {
      fontSize: 8,
      color: '#003366' // Color de fuente #003366
    });
    addText('Unauthorized sharing prohibited', margin + logoWidth, footerY + 2, {
      fontSize: 8,
      color: '#003366' // Color de fuente #003366
    });
    
    // Fecha de generación (centro)
    const reportDate = new Date();
    addText(`Generated on ${formatDateAuto(reportDate)} at ${formatDateTimeShort(reportDate)}`,
      pageWidth / 2, footerY, {
        fontSize: 8,
        color: '#003366', // Color de fuente #003366
        align: 'center'
      });
    
    // Número de página (derecha)
    if (totalPages > 1) {
      addText(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY, {
        fontSize: 8,
        color: '#003366', // Color de fuente #003366
        align: 'right'
      });
    }
  };

  // Contar páginas totales del documento
  const totalPages = doc.getNumberOfPages();
  
  // Agregar pie de página a todas las páginas
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    await addFooter(i, totalPages);
  }

  // Descargar o ver el PDF
  console.log('📝 Generando nombre de archivo...');
  const weekInfo = formatWeekInfo();
  const driverName = data.driver.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const year = new Date(data.period.start_date + 'T12:00:00').getFullYear();
  const weekNumber = weekInfo.week.replace('Week ', 'W').replace(` / ${year}`, '');
  const fileName = `PayReport_${year}_${weekNumber}_${driverName}.pdf`;
  console.log('📁 Nombre de archivo generado:', fileName);
  
  try {
    if (isPreview) {
      console.log('👁️ Modo preview activado');
      // Crear PDF como data URI (base64) que puede cruzar ventanas
      const pdfBase64 = doc.output('datauristring'); // Incluye el data:application/pdf;base64,
      
      console.log('🔗 PDF generado como base64 data URI');
      
      // Crear documento HTML wrapper con título personalizado  
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fileName.replace('.pdf', '')}</title>
          <style>
            body, html { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              overflow: hidden; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            .header {
              background: #f8f9fa;
              border-bottom: 1px solid #e9ecef;
              padding: 8px 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              z-index: 1000;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .document-name {
              font-size: 14px;
              font-weight: 600;
              color: #495057;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .download-btn {
              background: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              border: none;
              padding: 8px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              transition: all 0.2s ease-in-out;
              white-space: nowrap;
              height: 36px;
              min-width: 120px;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            }
            .download-btn:hover {
              background: hsl(var(--primary));
              opacity: 0.9;
              box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
            }
            .download-btn:active {
              scale: 0.98;
            }
            .download-icon {
              width: 16px;
              height: 16px;
              stroke-width: 2;
            }
            .pdf-container {
              height: 100vh;
              padding-top: 50px;
            }
            iframe { 
              width: 100%; 
              height: 100%; 
              border: none; 
            }
            .fallback {
              display: none;
              padding: 20px;
              text-align: center;
            }
          </style>
          <script>
            // Variables globales para el PDF
            let pdfBlobUrl = null;
            const pdfFileName = '${fileName}';
            
            // Inicializar título
            document.title = '${fileName.replace('.pdf', '')}';
            
            // Función para convertir data URI a Blob
            function dataURItoBlob(dataURI) {
              const byteString = atob(dataURI.split(',')[1]);
              const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              return new Blob([ab], { type: mimeString });
            }
            
            // Crear Blob URL local al cargar la página
            window.addEventListener('DOMContentLoaded', function() {
              try {
                console.log('🔄 Creando Blob URL local para el PDF...');
                const pdfDataUri = '${pdfBase64}';
                const pdfBlob = dataURItoBlob(pdfDataUri);
                pdfBlobUrl = URL.createObjectURL(pdfBlob);
                
                // Actualizar el iframe con el Blob URL local
                const iframe = document.querySelector('iframe');
                if (iframe) {
                  iframe.src = pdfBlobUrl;
                  console.log('✅ Blob URL local creado y asignado al iframe');
                }
              } catch (error) {
                console.error('❌ Error creando Blob URL local:', error);
                // Fallback: usar data URI directamente
                const iframe = document.querySelector('iframe');
                if (iframe) {
                  iframe.src = '${pdfBase64}';
                }
              }
            });
            
            function downloadPDF() {
              console.log('💾 Iniciando descarga desde preview...');
              
              // Método principal: usar el Blob URL local
              try {
                if (!pdfBlobUrl) {
                  console.log('⚠️ Blob URL no disponible, creando nuevo...');
                  const pdfDataUri = '${pdfBase64}';
                  const pdfBlob = dataURItoBlob(pdfDataUri);
                  pdfBlobUrl = URL.createObjectURL(pdfBlob);
                }
                
                const link = document.createElement('a');
                link.href = pdfBlobUrl;
                link.download = pdfFileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                  if (document.body.contains(link)) {
                    document.body.removeChild(link);
                  }
                }, 100);
                
                console.log('✅ Descarga iniciada exitosamente');
                
              } catch (error) {
                console.error('❌ Error en descarga:', error);
                
                // Fallback: usar data URI directamente
                try {
                  console.log('🔄 Intentando fallback con data URI...');
                  const link = document.createElement('a');
                  link.href = '${pdfBase64}';
                  link.download = pdfFileName;
                  link.style.display = 'none';
                  document.body.appendChild(link);
                  link.click();
                  
                  setTimeout(() => {
                    if (document.body.contains(link)) {
                      document.body.removeChild(link);
                    }
                  }, 100);
                  
                  console.log('✅ Descarga iniciada con fallback');
                  
                } catch (fallbackError) {
                  console.error('❌ Error en fallback:', fallbackError);
                  alert('Error descargando el PDF. Haz click derecho en el PDF y selecciona "Guardar como".');
                }
              }
            }
            
            // Mantener el título
            setInterval(() => {
              if (document.title !== '${fileName.replace('.pdf', '')}') {
                document.title = '${fileName.replace('.pdf', '')}';
              }
            }, 1000);
            
            // Limpiar Blob URL al cerrar la ventana
            window.addEventListener('beforeunload', function() {
              if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
              }
            });
          </script>
        </head>
        <body>
          <div class="header">
            <div class="document-name">
              <span>📄</span>
              <span>${fileName.replace('.pdf', '')}</span>
            </div>
            <button class="download-btn" onclick="downloadPDF()" title="Descargar PDF">
              <svg class="download-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Descargar PDF</span>
            </button>
          </div>
          <div class="pdf-container">
            <iframe type="application/pdf" title="${fileName}"></iframe>
          </div>
          <div class="fallback">
            <p>Si no puedes ver el PDF, intenta descargar usando el botón de arriba.</p>
          </div>
        </body>
        </html>
      `;
      
      // ✅ SECURITY: Use Blob URLs instead of deprecated document.write()
      // This is CSP-compatible and avoids injection risks
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      
      // Abrir la nueva ventana
      try {
        if (targetWindow && !targetWindow.closed) {
          targetWindow.location.href = htmlUrl;
          console.log('✅ PDF wrapper abierto en ventana existente');
        } else {
          const newWindow = window.open(htmlUrl, '_blank');
          if (newWindow) {
            console.log('✅ PDF wrapper abierto en nueva ventana');
          } else {
            console.log('⚠️ Popup bloqueado, abriendo PDF directamente...');
            // Fallback: abrir PDF directamente con data URI
            window.open(pdfBase64, '_blank');
          }
        }
      } catch (error) {
        console.error('❌ Error abriendo ventana:', error);
        // Último fallback: descargar directamente
        const link = document.createElement('a');
        link.href = pdfBase64;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Limpiar HTML URL después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(htmlUrl);
      }, 5000);
    } else if (isPreview === false) {
      console.log('📄 Modo retorno de documento activado');
      // Si isPreview es explícitamente false, retornar el documento
      return doc;
  } else {
      console.log('💾 Modo descarga activado');
      
      // Sanitizar el nombre del archivo
      const sanitizedFileName = fileName.replace(/[^\w\s.-]/gi, '_').replace(/\s+/g, '_');
      console.log('📝 Archivo:', sanitizedFileName);
      
      try {
        // Método 1: doc.save() - El más simple y confiable
        console.log('🔄 Usando doc.save() (método nativo jsPDF)...');
        doc.save(sanitizedFileName);
        console.log('✅ Descarga iniciada con doc.save()');
        
      } catch (error) {
        console.error('❌ Error con doc.save(), intentando fallback:', error);
        
        try {
          // Método 2: Fallback con Blob + createElement
          console.log('🔄 Intentando fallback con Blob URL...');
          
          const pdfBlob = doc.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = sanitizedFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          
          console.log('✅ Descarga iniciada con fallback');
          
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError);
          throw new Error('No se pudo descargar el PDF. Intenta de nuevo.');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error general en descarga/preview:', error);
    throw error;
  }
  
  console.log('🏁 Función PDF completada');
}