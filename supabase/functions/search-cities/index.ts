import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchCitiesRequest {
  stateId: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

interface City {
  id: string;
  name: string;
  county?: string;
  state_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Search cities function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { stateId, searchTerm = '', page = 0, limit = 100 }: SearchCitiesRequest = await req.json();

    console.log(`🔍 Searching cities for state: ${stateId}, term: "${searchTerm}", page: ${page}, limit: ${limit}`);

    if (!stateId) {
      return new Response(
        JSON.stringify({ error: 'stateId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build the query
    let query = supabase
      .from('state_cities')
      .select('id, name, county, state_id')
      .eq('state_id', stateId);

    // Add search filter if provided
    if (searchTerm.trim()) {
      query = query.or(`name.ilike.%${searchTerm}%,county.ilike.%${searchTerm}%`);
    }

    // Get total count for pagination info (without limit)
    const { count } = await supabase
      .from('state_cities')
      .select('*', { count: 'exact', head: true })
      .eq('state_id', stateId)
      .or(searchTerm.trim() ? `name.ilike.%${searchTerm}%,county.ilike.%${searchTerm}%` : '');

    // Apply ordering: prioritize cities that start with search term, then alphabetical
    if (searchTerm.trim()) {
      // Use a more complex ordering to prioritize exact matches at the beginning
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('name', { ascending: true });
    }

    // Apply pagination
    const offset = page * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: cities, error } = await query;

    if (error) {
      console.error('❌ Error searching cities:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search cities' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Found ${cities?.length || 0} cities (total: ${count})`);

    // Post-process to prioritize cities that start with search term
    let sortedCities = cities || [];
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      sortedCities = [...cities].sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(lowerSearchTerm);
        const bStartsWith = b.name.toLowerCase().startsWith(lowerSearchTerm);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return new Response(
      JSON.stringify({
        cities: sortedCities,
        totalCount: count || 0,
        page,
        limit,
        hasMore: (offset + limit) < (count || 0)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error in search-cities:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});