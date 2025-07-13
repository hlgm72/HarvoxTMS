import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogoSearchResult {
  success: boolean;
  logoUrl?: string;
  source?: 'clearbit' | 'google' | 'iconhorse';
  error?: string;
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
    const { companyName, emailDomain } = await req.json();
    
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
    let source: 'clearbit' | 'google' | 'iconhorse' | undefined = undefined;

    // Try Clearbit first
    logoUrl = await searchWithClearbit(domain);
    if (logoUrl) {
      source = 'clearbit';
    }

    // Try Google Favicon if Clearbit failed
    if (!logoUrl) {
      logoUrl = await searchWithGoogle(domain);
      if (logoUrl) {
        source = 'google';
      }
    }

    // Try Iconhorse as final fallback
    if (!logoUrl) {
      logoUrl = await searchWithIconhorse(domain);
      if (logoUrl) {
        source = 'iconhorse';
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