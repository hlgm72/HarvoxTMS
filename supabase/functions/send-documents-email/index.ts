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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get request data
    const { recipients, subject, message, documentIds }: SendDocumentsRequest = await req.json();

    console.log("Sending documents email:", { recipients, subject, documentIds });

    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    // Get user's company information
    const { data: userRole, error: roleError } = await supabase
      .from("user_company_roles")
      .select(`
        company_id,
        companies (
          name,
          email,
          owner_email,
          owner_name
        )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (roleError || !userRole) {
      throw new Error("No se pudo obtener información de la compañía");
    }

    const company = userRole.companies as any;
    const companyName = company.name || "FleetNest";
    const senderName = `${companyName} (via FleetNest)`;
    const companyEmail = company.email || company.owner_email;
    
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

    if (!documents || documents.length === 0) {
      throw new Error("No se encontraron documentos válidos");
    }

    console.log(`Found ${documents.length} documents to send`);

    // Download and prepare attachments
    const attachments = [];
    let totalSize = 0;
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB limit for Resend

    for (const doc of documents) {
      try {
        console.log(`Downloading document: ${doc.file_name}`);
        
        // Extract file path from URL
        const urlParts = doc.file_url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'company-documents');
        if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
          console.error(`Invalid file URL format: ${doc.file_url}`);
          continue;
        }
        
        const filePath = urlParts.slice(bucketIndex + 1).join('/');
        console.log(`File path: ${filePath}`);

        // Download file from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("company-documents")
          .download(filePath);

        if (downloadError) {
          console.error(`Error downloading ${doc.file_name}:`, downloadError);
          continue;
        }

        // Convert blob to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check size limit
        if (totalSize + uint8Array.length > maxSizeBytes) {
          console.warn(`Skipping ${doc.file_name} - would exceed size limit`);
          continue;
        }

        totalSize += uint8Array.length;

        // Convert to base64
        const base64 = btoa(String.fromCharCode(...uint8Array));

        attachments.push({
          filename: doc.file_name,
          content: base64,
          type: doc.content_type || "application/octet-stream",
          disposition: "attachment"
        });

        console.log(`Successfully prepared attachment: ${doc.file_name} (${uint8Array.length} bytes)`);
      } catch (error) {
        console.error(`Error processing document ${doc.file_name}:`, error);
      }
    }

    if (attachments.length === 0) {
      throw new Error("No se pudieron preparar los documentos para envío");
    }

    console.log(`Prepared ${attachments.length} attachments, total size: ${totalSize} bytes`);

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
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Documentos Adjuntos</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Documentos de ${companyName}</h2>
          
          ${message ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #666; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            Se adjuntan ${attachments.length} documento(s) solicitado(s):
          </p>
          
          <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
            ${attachments.map(att => `<li>${att.filename}</li>`).join('')}
          </ul>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              Este email fue enviado por <strong>${companyName}</strong> a través de FleetNest.
            </p>
            ${companyEmail ? `
              <p style="color: #999; font-size: 14px; margin: 5px 0 0 0;">
                Para responder, contacte: <a href="mailto:${companyEmail}" style="color: #667eea;">${companyEmail}</a>
              </p>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Send email
    console.log(`Sending email to: ${recipientList.join(', ')}`);
    
    // Always use FleetNest verified email for guaranteed delivery
    console.log(`Sending email from: ${senderName} <${senderEmail}>`);
    
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
      console.log(`Reply-to set to: ${companyEmail}`);
    }
    
    const emailResponse = await resend.emails.send(emailData);

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Documentos enviados exitosamente",
        emailId: emailResponse.data?.id,
        attachmentCount: attachments.length,
        recipients: recipientList.length
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
    console.error("Error in send-documents-email function:", error);
    
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