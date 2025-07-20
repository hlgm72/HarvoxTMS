import jsPDF from 'jspdf';

interface LoadOrderData {
  load_number: string;
  total_amount: number;
  customAmount: number;
  commodity: string;
  weight_lbs?: number;
  broker_name?: string;
  driver_name?: string;
  loadStops: any[];
}

export async function generateLoadOrderPDF(data: LoadOrderData): Promise<string> {
  console.log('📄 generateLoadOrderPDF - Starting with data:', data);
  
  try {
    const doc = new jsPDF();
    
    // Configuración del documento
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;

  // Header - Company Logo y Título
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("LOAD ORDER", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 20;
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Información básica del Load Order
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Load Number y Fecha
  doc.setFont("helvetica", "bold");
  doc.text("Load Order #:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(data.load_number, margin + 40, yPosition);
  
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", pageWidth - margin - 60, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), pageWidth - margin - 30, yPosition);
  
  yPosition += 20;

  // Información del Conductor
  if (data.driver_name) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DEL CONDUCTOR", margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Conductor: ${data.driver_name}`, margin, yPosition);
    yPosition += 10;
  }

  yPosition += 10;

  // Detalles de la Carga
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLES DE LA CARGA", margin, yPosition);
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Monto
  doc.setFont("helvetica", "bold");
  doc.text("Monto Total:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(`$${data.customAmount.toFixed(2)}`, margin + 40, yPosition);
  yPosition += 10;

  // Commodity
  doc.setFont("helvetica", "bold");
  doc.text("Commodity:", margin, yPosition);
  doc.setFont("helvetica", "normal");
  doc.text(data.commodity, margin + 40, yPosition);
  yPosition += 10;

  // Peso
  if (data.weight_lbs) {
    doc.setFont("helvetica", "bold");
    doc.text("Peso:", margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.weight_lbs} lbs`, margin + 40, yPosition);
    yPosition += 10;
  }

  yPosition += 15;

  // Paradas (Pickup y Delivery)
  if (data.loadStops && data.loadStops.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PARADAS", margin, yPosition);
    yPosition += 15;

    data.loadStops.forEach((stop, index) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      
      const stopTitle = stop.stop_type === 'pickup' ? 'PICKUP' : 'DELIVERY';
      doc.text(`${index + 1}. ${stopTitle}`, margin, yPosition);
      yPosition += 10;

      doc.setFont("helvetica", "normal");
      
      // Dirección
      const address = `${stop.address}, ${stop.city}, ${stop.state} ${stop.zip_code || ''}`;
      doc.text(`Dirección: ${address}`, margin + 10, yPosition);
      yPosition += 8;

      // Compañía
      if (stop.company_name) {
        doc.text(`Compañía: ${stop.company_name}`, margin + 10, yPosition);
        yPosition += 8;
      }

      // Fecha programada
      if (stop.scheduled_date) {
        doc.text(`Fecha: ${new Date(stop.scheduled_date).toLocaleDateString()}`, margin + 10, yPosition);
        yPosition += 8;
      }

      // Contacto
      if (stop.contact_name || stop.contact_phone) {
        const contact = [];
        if (stop.contact_name) contact.push(stop.contact_name);
        if (stop.contact_phone) contact.push(stop.contact_phone);
        doc.text(`Contacto: ${contact.join(' - ')}`, margin + 10, yPosition);
        yPosition += 8;
      }

      // Instrucciones especiales
      if (stop.special_instructions) {
        doc.text(`Instrucciones: ${stop.special_instructions}`, margin + 10, yPosition);
        yPosition += 8;
      }

      yPosition += 10;

      // Verificar si necesitamos una nueva página
      if (yPosition > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPosition = 30;
      }
    });
  }

  // Footer
  yPosition = doc.internal.pageSize.height - 30;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    yPosition,
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