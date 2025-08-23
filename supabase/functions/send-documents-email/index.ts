import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendDocumentsRequest {
  recipients: string;
  subject: string;
  message: string;
  documentIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== FUNCTION START ===");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("CORS preflight - returning headers");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== PROCESSING POST REQUEST ===");
  
  try {
    console.log("=== STEP 1: CHECKING ENVIRONMENT ===");
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasResendKey: !!resendApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error("Configuración incompleta: faltan variables de entorno requeridas");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log("=== STEP 2: PARSING REQUEST ===");
    // Get request data
    const { recipients, subject, message, documentIds }: SendDocumentsRequest = await req.json();

    console.log("=== STEP 3: REQUEST PARSED ===");
    console.log("Sending documents email:", { recipients, subject, documentIds });

    console.log("=== STEP 4: CHECKING AUTH ===");
    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      throw new Error("No se encontró la cabecera de autorización");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token directly with the service role client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("Error de autenticación:", authError);
      throw new Error(`Autenticación falló: ${authError.message}`);
    }

    if (!user) {
      console.error("Usuario no encontrado");
      throw new Error("Autenticación falló: usuario no encontrado");
    }

    console.log(`Authenticated user: ${user.id}`);

    // Get user's company information using service role client
    console.log("Querying user company roles...");
    const { data: userRole, error: roleError } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    console.log("Resultado de consulta de rol de usuario:", { userRole, roleError });

    if (roleError) {
      console.error("Detalles del error de rol:", roleError);
      throw new Error(`Error al consultar roles de usuario: ${roleError.message}`);
    }

    if (!userRole || !userRole.company_id) {
      console.error("No se encontró rol de usuario para:", user.id);
      
      // Try to get more info about available roles for debugging
      const { data: allRoles, error: allRolesError } = await supabase
        .from("user_company_roles")
        .select("*")
        .eq("user_id", user.id);
      
      console.log("Todos los roles del usuario:", { allRoles, allRolesError });
      throw new Error("No se pudo obtener información de la compañía");
    }

    console.log("Consultando información de la empresa...");
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", userRole.company_id)
      .single();

    if (companyError) {
      console.error("Detalles del error de empresa:", companyError);
      throw new Error(`Error al consultar información de la empresa: ${companyError.message}`);
    }

    const companyName = company.name || "FleetNest";
    const senderName = `${companyName} (via FleetNest)`;
    const companyEmail = company.email;
    
    // Always use verified FleetNest email as sender for deliverability
    const senderEmail = "noreply@fleetnest.app";

    // Get documents information
    const { data: documents, error: docsError } = await supabase
      .from("company_documents")
      .select("*")
      .in("id", documentIds)
      .eq("company_id", userRole.company_id);

    if (docsError) {
      throw new Error("Error al obtener los documentos");
    }

    // Enhanced validation rules
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total
    const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB individual
    const MAX_DOCUMENTS = 10; // max documents per email

    if (!documents || documents.length === 0) {
      throw new Error("No se encontraron documentos válidos");
    }

    if (documents.length > MAX_DOCUMENTS) {
      throw new Error(`Demasiados documentos. Máximo ${MAX_DOCUMENTS} por email.`);
    }

    console.log(`Found ${documents.length} documents to send (max ${MAX_DOCUMENTS})`);
    
    // Download and prepare attachments
    const attachments = [];
    const failedDocuments = [];
    let totalSize = 0;

    for (const doc of documents) {
      try {
        console.log(`Downloading document: ${doc.file_name}`);
        
        // Extract file path from URL
        const urlParts = doc.file_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'company-documents');
        if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
          console.error(`Formato de URL de archivo inválido: ${doc.file_url}`);
          failedDocuments.push({
            name: doc.file_name,
            reason: "Formato de URL inválido"
          });
          continue;
        }
        
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        console.log(`File path: ${filePath}`);

        // Download file from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("company-documents")
          .download(filePath);

        if (downloadError) {
          console.error(`Error descargando ${doc.file_name}:`, downloadError);
          failedDocuments.push({
            name: doc.file_name,
            reason: `Error de descarga: ${downloadError.message}`
          });
          continue;
        }

        // Convert blob to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check individual file size limit
        if (uint8Array.length > MAX_FILE_SIZE) {
          const sizeMB = (uint8Array.length / (1024 * 1024)).toFixed(1);
          console.warn(`Skipping ${doc.file_name} - file too large (${sizeMB}MB > 10MB)`);
          failedDocuments.push({
            name: doc.file_name,
            reason: `Archivo muy grande (${sizeMB}MB, máximo 10MB)`
          });
          continue;
        }
        
        // Check total size limit
        if (totalSize + uint8Array.length > MAX_TOTAL_SIZE) {
          console.warn(`Skipping ${doc.file_name} - would exceed total size limit`);
          failedDocuments.push({
            name: doc.file_name,
            reason: "Excedería el límite de tamaño total (20MB)"
          });
          continue;
        }

        totalSize += uint8Array.length;

        // Convert to base64 properly - use TextDecoder for binary data
        const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

        attachments.push({
          filename: doc.file_name,
          content: base64,
          type: doc.content_type || "application/octet-stream",
          disposition: "attachment"
        });

        console.log(`Adjunto preparado exitosamente: ${doc.file_name} (${uint8Array.length} bytes)`);
      } catch (error) {
        console.error(`Error procesando documento ${doc.file_name}:`, error);
        failedDocuments.push({
          name: doc.file_name,
          reason: `Error de procesamiento: ${error.message}`
        });
      }
    }

    if (attachments.length === 0) {
      throw new Error("No se pudieron preparar los documentos para envío");
    }

    console.log(`Preparados ${attachments.length} adjuntos, tamaño total: ${totalSize} bytes`);

    // Prepare email recipients
    const recipientList = recipients.split(',').map(email => email.trim()).filter(email => email.length > 0);

    if (recipientList.length === 0) {
      throw new Error("No se especificaron destinatarios válidos");
    }

    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${companyName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Attached Documents</p>
        </div>
        
        ${companyEmail ? `
          <div style="background: #e8f4fd; border: 2px solid #4f9cf9; border-radius: 8px; padding: 15px; margin: 20px; text-align: center;">
            <p style="margin: 0; color: #1e40af; font-weight: bold; font-size: 16px;">
              📧 To reply to this message, write to:
            </p>
            <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 18px; font-weight: bold;">
              <a href="mailto:${companyEmail}" style="color: #1e40af; text-decoration: none;">${companyEmail}</a>
            </p>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">
              (Do not reply to the sender of this email)
            </p>
          </div>
        ` : ''}
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Documents from ${companyName}</h2>
          
          ${message ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #666; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            Attached are ${attachments.length} requested document(s):
          </p>
          
          <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
            ${attachments.map(att => `<li>${att.filename}</li>`).join('')}
          </ul>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              This email was sent by <strong>${companyName}</strong> through FleetNest.
            </p>
          </div>
        </div>
      </div>
    `;

    console.log(`Enviando email a: ${recipientList.join(', ')}`);
    
    // Always use FleetNest verified email for guaranteed delivery
    console.log(`Enviando email desde: ${senderName} <${senderEmail}>`);
    
    const emailData: any = {
      from: `${senderName} <${senderEmail}>`,
      to: recipientList,
      subject: subject,
      html: emailHtml,
      attachments: attachments
    };
    
    // Add company email as reply-to if available
    if (companyEmail) {
      emailData.reply_to = companyEmail;
      console.log(`Reply-to configurado a: ${companyEmail}`);
    }
    
    const emailResponse = await resend.emails.send(emailData);

    console.log("Email enviado exitosamente:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: failedDocuments.length > 0 
          ? `${attachments.length} documentos enviados exitosamente. ${failedDocuments.length} documentos no se pudieron enviar.`
          : "Documentos enviados exitosamente",
        emailId: emailResponse.data?.id,
        attachmentCount: attachments.length,
        recipients: recipientList.length,
        failedDocuments: failedDocuments,
        totalRequested: documents.length
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.log("=== ERROR CAPTURADO ===");
    console.error("Error en función send-documents-email:", error);
    console.error("Stack del error:", error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error desconocido al enviar documentos"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);