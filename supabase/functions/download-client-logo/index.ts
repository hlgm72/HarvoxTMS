import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadResult {
  success: boolean;
  logoUrl?: string;
  error?: string;
}

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function downloadAndStoreImage(imageUrl: string, clientId: string, companyName: string): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to download image:', imageResponse.status);
      return null;
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);
    
    // Clean company name for filename
    const cleanCompanyName = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const filePath = `${clientId}/${cleanCompanyName}.png`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('client-logos')
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from('client-logos')
      .getPublicUrl(filePath);
    
    console.log(`Image stored successfully: ${data.publicUrl}`);
    return data.publicUrl;
    
  } catch (error) {
    console.error('Error downloading and storing image:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, clientId, companyName } = await req.json();
    
    if (!imageUrl || !clientId || !companyName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Image URL, client ID, and company name are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Starting download for client ${clientId}: ${companyName}`);

    const storedUrl = await downloadAndStoreImage(imageUrl, clientId, companyName);
    
    const result: DownloadResult = {
      success: !!storedUrl,
      logoUrl: storedUrl || undefined,
    };

    if (!storedUrl) {
      result.error = 'Failed to download and store logo';
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Logo download error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});