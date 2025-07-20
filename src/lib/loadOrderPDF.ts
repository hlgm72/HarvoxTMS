import jsPDF from 'jspdf';
import greenPinSvg from '../assets/pin_green.svg';
import redPinSvg from '../assets/pin_red.svg';

interface LoadOrderData {
  load_number: string;
  total_amount: number;
  customAmount: number;
  commodity: string;
  weight_lbs?: number;
  broker_name?: string;
  driver_name?: string;
  loadStops: any[];
  company_name?: string;
  company_phone?: string;
  company_email?: string;
}

export async function generateLoadOrderPDF(data: LoadOrderData): Promise<string> {
  console.log('📄 generateLoadOrderPDF - Starting with data:', data);
  
  // Función para agregar imágenes de drop pins con calidad optimizada
  const addDropPinImage = async (doc: any, x: number, y: number, svgSrc: string) => {
    try {
      // Crear imagen desde SVG
      const img = new Image();
      img.src = svgSrc;
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          // Crear canvas con alta resolución para calidad
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const scale = 4; // Factor de escala para calidad
          canvas.width = 20 * scale; // Resolución consistente
          canvas.height = 24 * scale; // Resolución consistente
          
          if (ctx) {
            // Configurar calidad máxima
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Dibujar con escala alta
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Tamaño final más pequeño pero consistente
            doc.addImage(imgData, 'PNG', x - 4, y - 3, 8, 10);
          }
          resolve();
        };
        img.onerror = () => resolve();
      });
    } catch (error) {
      console.warn('Error loading pin image:', error);
    }
  };
  
  try {
    const doc = new jsPDF();
    
    // Configuración del documento
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    let yPosition = 15;

    // ============ HEADER SECTION ============
    
    // Top header con bordes
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 25);
    
    // Page info (izquierda)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Page 1", margin + 5, yPosition + 8);
    doc.text(new Date().toLocaleDateString('es-ES'), margin + 5, yPosition + 16);
    
    // Título central
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Load Order", pageWidth / 2, yPosition + 12, { align: "center" });
    
    // Load Number (derecha)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Load ID", pageWidth - margin - 35, yPosition + 8);
    doc.setFont("helvetica", "bold");
    doc.text(data.load_number, pageWidth - margin - 35, yPosition + 16);
    
    yPosition += 35;

    // ============ COMPANY SECTION ============
    
    // Nombre de la empresa (centrado y prominente)
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(data.company_name || "", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;
    
    // Información de contacto (centrado)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const contactInfo = [];
    if (data.company_phone) contactInfo.push(`P: ${data.company_phone}`);
    if (data.company_email) contactInfo.push(`E: ${data.company_email}`);
    if (contactInfo.length > 0) {
      doc.text(contactInfo.join(' • '), pageWidth / 2, yPosition, { align: "center" });
    }
    yPosition += 20;

    // ============ ROUTE SECTION ============
    
    // Route header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Route", margin, yPosition);
    yPosition += 15;

    // Separar pickup y delivery
    const pickupStops = data.loadStops?.filter(stop => stop.stop_type === 'pickup') || [];
    const deliveryStops = data.loadStops?.filter(stop => stop.stop_type === 'delivery') || [];

    // Variables para almacenar posiciones de drop pins para la línea conectora
    let pickupPinY = 0;
    let deliveryPinY = 0;

    // ============ PICKUP SECTION ============
    if (pickupStops.length > 0) {
      const pickup = pickupStops[0];
      
      // Pickup header con indicador visual
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Pickup", margin + 60, yPosition);
      
      // Guardar posición Y del drop pin verde y agregarlo
      pickupPinY = yPosition - 2;
      await addDropPinImage(doc, margin + 90, pickupPinY, greenPinSvg);
      
      // Información de pickup en columna derecha
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Fecha y hora
      if (pickup.scheduled_date) {
        const date = new Date(pickup.scheduled_date);
        doc.text(date.toLocaleDateString('es-ES'), margin + 60, yPosition + 10);
        if (pickup.scheduled_time) {
          doc.text(pickup.scheduled_time, margin + 60, yPosition + 18);
        }
      }
      
      // Información de la empresa en la derecha
      const rightColumnX = margin + 105;
      doc.setFont("helvetica", "bold");
      if (pickup.company_name) {
        doc.text(pickup.company_name, rightColumnX, yPosition);
      }
      
      doc.setFont("helvetica", "normal");
      // Dirección completa
      const address = `${pickup.address}, ${pickup.city}, ${pickup.state} ${pickup.zip_code || ''}`;
      const addressLines = doc.splitTextToSize(address, pageWidth - rightColumnX - margin);
      doc.text(addressLines, rightColumnX, yPosition + 8);
      
      // Información adicional
      if (pickup.contact_name || pickup.contact_phone) {
        const contact = [];
        if (pickup.contact_name) contact.push(pickup.contact_name);
        if (pickup.contact_phone) contact.push(pickup.contact_phone);
        doc.text(contact.join(' - '), rightColumnX, yPosition + 24);
      }
      
      // Instrucciones especiales
      if (pickup.special_instructions) {
        doc.setFont("helvetica", "bold");
        doc.text(`*${pickup.special_instructions}*`, rightColumnX, yPosition + 32);
      }
      
      yPosition += 50;
    }

    // ============ DELIVERY SECTION ============
    if (deliveryStops.length > 0) {
      const delivery = deliveryStops[0];
      
      // Delivery header con indicador visual
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Delivery", margin + 60, yPosition);
      
      // Guardar posición Y del drop pin rojo y agregarlo
      deliveryPinY = yPosition - 2;
      await addDropPinImage(doc, margin + 90, deliveryPinY, redPinSvg);
      
      // Información de delivery en columna derecha
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Fecha y hora
      if (delivery.scheduled_date) {
        const date = new Date(delivery.scheduled_date);
        doc.text(date.toLocaleDateString('es-ES'), margin + 60, yPosition + 10);
        if (delivery.scheduled_time) {
          doc.text(delivery.scheduled_time, margin + 60, yPosition + 18);
        }
      }
      
      // Información de la empresa en la derecha
      const rightColumnX = margin + 105;
      doc.setFont("helvetica", "bold");
      if (delivery.company_name) {
        doc.text(delivery.company_name, rightColumnX, yPosition);
      }
      
      doc.setFont("helvetica", "normal");
      // Dirección completa
      const address = `${delivery.address}, ${delivery.city}, ${delivery.state} ${delivery.zip_code || ''}`;
      const addressLines = doc.splitTextToSize(address, pageWidth - rightColumnX - margin);
      doc.text(addressLines, rightColumnX, yPosition + 8);
      
      // Información adicional
      if (delivery.contact_name || delivery.contact_phone) {
        const contact = [];
        if (delivery.contact_name) contact.push(delivery.contact_name);
        if (delivery.contact_phone) contact.push(delivery.contact_phone);
        doc.text(contact.join(' - '), rightColumnX, yPosition + 24);
      }
      
      // Instrucciones especiales
      if (delivery.special_instructions) {
        doc.setFont("helvetica", "bold");
        doc.text(`*${delivery.special_instructions}*`, rightColumnX, yPosition + 32);
      }
      
      yPosition += 50;
    }

    // ============ LÍNEA CONECTORA ENTRE DROP PINS ============
    // Dibujar línea conectora entre pickup y delivery pins si ambos existen
    if (pickupPinY > 0 && deliveryPinY > 0) {
      doc.setDrawColor(100, 100, 100); // Color gris
      doc.setLineWidth(0.3);
      // Línea con separación de los pins
      doc.line(margin + 90, pickupPinY + 8, margin + 90, deliveryPinY - 5);
    }

    // ============ ACTION BUTTONS SECTION ============
    
    // Simular botones de acción
    doc.setFillColor(240, 240, 240); // Gris claro
    doc.rect(margin, yPosition, 40, 8, 'F');
    doc.rect(margin + 45, yPosition, 35, 8, 'F');
    doc.rect(margin + 85, yPosition, 25, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Notify before arrival", margin + 2, yPosition + 5);
    doc.text("GPS tracking", margin + 47, yPosition + 5);
    doc.text("Straps", margin + 87, yPosition + 5);
    
    yPosition += 20;

    // ============ EQUIPMENT SECTION ============
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Equipment", margin, yPosition);
    yPosition += 12;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Flatbed or Step Deck", margin + 40, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (data.weight_lbs) {
      doc.text(`48 ft• ${data.weight_lbs.toLocaleString()}.00lbs`, margin + 40, yPosition);
    }
    yPosition += 20;

    // ============ ITEMS SECTION ============
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Items", margin, yPosition);
    yPosition += 12;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    // Extraer commodity principal
    const commodityText = data.commodity || "Load Items";
    doc.text(commodityText, margin + 40, yPosition);
    yPosition += 10;
    
    // Descripción de ruta
    if (pickupStops.length > 0 && deliveryStops.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const routeDescription = `${pickupStops[0].city}, ${pickupStops[0].state} > ${deliveryStops[0].city}, ${deliveryStops[0].state}`;
      doc.text(routeDescription, margin + 40, yPosition);
      yPosition += 8;
    }
    
    // Información de peso y dimensiones
    if (data.weight_lbs) {
      doc.text(`${data.weight_lbs.toLocaleString()}lb• 48.0ft• 8.0ft• 6.0ft•`, margin + 40, yPosition);
      yPosition += 8;
      doc.text("1 Truckload", margin + 40, yPosition);
      yPosition += 20;
    }

    // ============ DETAILS SECTION ============
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Details", margin, yPosition);
    yPosition += 12;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Customers", margin + 40, yPosition);
    yPosition += 10;
    
    doc.setFont("helvetica", "normal");
    if (data.broker_name) {
      doc.text(`Broker: ${data.broker_name}`, margin + 40, yPosition);
      yPosition += 8;
    }
    
    // Amount
    doc.text(`Amount: $${data.customAmount.toFixed(2)}`, margin + 40, yPosition);
    yPosition += 20;

    // ============ TERMS SECTION ============
    
    // Verificar si hay espacio suficiente para los términos
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Terms and 3rd Party Bill to: Jones Transport", margin, yPosition);
    yPosition += 12;
    
    doc.setFont("helvetica", "normal");
    const termsText = "Accessorial charges will not be approved or paid without prior approval from Jones Transport";
    const termsLines = doc.splitTextToSize(termsText, pageWidth - 2 * margin);
    doc.text(termsLines, margin, yPosition);
    yPosition += 20;

    // ============ DRIVER INFO SECTION ============
    
    if (data.driver_name) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Driver Information", margin, yPosition);
      yPosition += 12;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Driver: ${data.driver_name}`, margin, yPosition);
      yPosition += 20;
    }

    // ============ FOOTER ============
    
    // Línea separadora antes del footer
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
    
    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`,
      pageWidth / 2,
      pageHeight - 25,
      { align: "center" }
    );
    
    // Información adicional del footer
    doc.text(
      "This document is electronically generated and requires no signature",
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );

  // Convertir a blob y crear URL
  console.log('🔗 generateLoadOrderPDF - Creating blob and URL...');
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  
  console.log('✅ generateLoadOrderPDF - PDF generated successfully, URL:', url);
  return url;
  } catch (error) {
    console.error('❌ generateLoadOrderPDF - Error generating PDF:', error);
    throw error;
  }
}