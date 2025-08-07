import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogoSearchResult {
  success: boolean;
  logoUrl?: string;
  source?: 'clearbit' | 'google' | 'iconhorse' | 'website' | 'logosearch';
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

async function searchWithClearbit(domain: string): Promise<string | null> {
  try {
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    
    // Test if the logo exists by making a HEAD request
    const response = await fetch(logoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return logoUrl;
    }
  } catch (error) {
    console.error('Clearbit error:', error);
  }
  return null;
}

async function searchWithGoogle(domain: string): Promise<string | null> {
  try {
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    
    // Test if the favicon exists
    const response = await fetch(logoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return logoUrl;
    }
  } catch (error) {
    console.error('Google Favicon error:', error);
  }
  return null;
}

async function searchWebsiteLogo(domain: string): Promise<string | null> {
  try {
    // Try common logo paths on the website
    const logoPaths = [
      '/logo.svg',
      '/logo.png', 
      '/assets/logo.svg',
      '/assets/logo.png',
      '/images/logo.svg',
      '/images/logo.png',
      '/static/logo.svg',
      '/static/logo.png'
    ];

    for (const path of logoPaths) {
      try {
        const logoUrl = `https://${domain}${path}`;
        const response = await fetch(logoUrl, { method: 'HEAD' });
        
        if (response.ok) {
          return logoUrl;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    // Try to scrape the website for logo in meta tags or common selectors
    try {
      const response = await fetch(`https://${domain}`, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LogoBot/1.0)' }
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Look for common logo patterns in HTML
        const logoPatterns = [
          /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
          /<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
          /<img[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i
        ];

        for (const pattern of logoPatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            let logoUrl = match[1];
            // Convert relative URLs to absolute
            if (logoUrl.startsWith('/')) {
              logoUrl = `https://${domain}${logoUrl}`;
            } else if (logoUrl.startsWith('./')) {
              logoUrl = `https://${domain}/${logoUrl.substring(2)}`;
            } else if (!logoUrl.startsWith('http')) {
              logoUrl = `https://${domain}/${logoUrl}`;
            }
            
            // Verify the logo exists
            const verifyResponse = await fetch(logoUrl, { method: 'HEAD' });
            if (verifyResponse.ok) {
              return logoUrl;
            }
          }
        }
      }
    } catch (error) {
      console.error('Website scraping error:', error);
    }

  } catch (error) {
    console.error('Website logo search error:', error);
  }
  return null;
}

async function searchWithLogoSearch(domain: string): Promise<string | null> {
  try {
    // LogoSearch API - free tier available
    const logoUrl = `https://api.logo.dev/${domain}?format=png&size=400`;
    
    // Test if the logo exists
    const response = await fetch(logoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return logoUrl;
    }
  } catch (error) {
    console.error('LogoSearch error:', error);
  }
  return null;
}

async function searchWithIconhorse(domain: string): Promise<string | null> {
  try {
    const logoUrl = `https://icon.horse/icon/${domain}`;
    
    // Test if the icon exists
    const response = await fetch(logoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return logoUrl;
    }
  } catch (error) {
    console.error('Iconhorse error:', error);
  }
  return null;
}

function cleanDomain(input: string): string {
  // Remove common prefixes and clean the domain
  let domain = input.toLowerCase().trim();
  
  // Remove @ if present
  domain = domain.replace(/^@/, '');
  
  // Remove www. prefix
  domain = domain.replace(/^www\./, '');
  
  // Remove http/https protocols
  domain = domain.replace(/^https?:\/\//, '');
  
  // Remove trailing slashes and paths
  domain = domain.split('/')[0];
  
  // If it doesn't have a TLD, try adding .com
  if (!domain.includes('.') && domain.length > 0) {
    domain = `${domain}.com`;
  }
  
  return domain;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, emailDomain, sourceIndex, clientId, autoStore } = await req.json();
    
    if (!companyName && !emailDomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Company name or email domain is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Try to get domain from email domain first, then from company name
    const domain = cleanDomain(emailDomain || companyName);
    
    if (!domain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract valid domain' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Searching logo for domain: ${domain}`);

    let logoUrl: string | null = null;
    let source: 'clearbit' | 'google' | 'iconhorse' | 'website' | 'logosearch' | undefined = undefined;

    // Define search sources in order
    const searchSources = [
      { name: 'clearbit', fn: () => searchWithClearbit(domain) },
      { name: 'website', fn: () => searchWebsiteLogo(domain) },
      { name: 'logosearch', fn: () => searchWithLogoSearch(domain) },
      { name: 'google', fn: () => searchWithGoogle(domain) },
      { name: 'iconhorse', fn: () => searchWithIconhorse(domain) }
    ];

    // Start from the specified source index (default 0)
    const startIndex = Math.max(0, Math.min(sourceIndex || 0, searchSources.length - 1));
    
    // Try each source starting from the specified index
    for (let i = startIndex; i < searchSources.length; i++) {
      const currentSource = searchSources[i];
      console.log(`Trying source ${i}: ${currentSource.name}`);
      
      logoUrl = await currentSource.fn();
      if (logoUrl) {
        source = currentSource.name as any;
        console.log(`Found logo with ${currentSource.name}: ${logoUrl}`);
        break;
      }
    }

    // If autoStore is enabled and we have a clientId, download and store the image
    if (logoUrl && autoStore && clientId && companyName) {
      console.log('Auto-storing logo to Supabase storage...');
      const storedUrl = await downloadAndStoreImage(logoUrl, clientId, companyName);
      if (storedUrl) {
        logoUrl = storedUrl;
        console.log('Logo stored successfully in Supabase storage');
      }
    }

    const result: LogoSearchResult = {
      success: !!logoUrl,
      logoUrl: logoUrl || undefined,
      source: logoUrl ? source : undefined,
    };

    if (!logoUrl) {
      result.error = 'No logo found from any source';
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Logo search error:', error);
    
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