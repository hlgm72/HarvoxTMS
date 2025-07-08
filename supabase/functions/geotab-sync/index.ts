import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geotab API authentication and data fetching
class GeotabAPI {
  private credentials: string | null = null;
  private database: string;
  private username: string;
  private password: string;

  constructor(database: string, username: string, password: string) {
    this.database = database;
    this.username = username;
    this.password = password;
  }

  private async authenticate(): Promise<boolean> {
    try {
      console.log('Attempting Geotab authentication...');
      const response = await fetch('https://my.geotab.com/apiv1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'Authenticate',
          params: {
            database: this.database,
            userName: this.username,
            password: this.password
          }
        })
      });

      console.log('Geotab response status:', response.status);
      const data = await response.json();
      console.log('Geotab response data:', data);
      
      if (data.result && data.result.credentials) {
        this.credentials = data.result.credentials;
        console.log('Geotab authentication successful');
        return true;
      } else {
        console.error('Geotab authentication failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error authenticating with Geotab:', error);
      return false;
    }
  }

  private async makeGeotabCall(method: string, params: any = {}) {
    if (!this.credentials) {
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Failed to authenticate with Geotab');
      }
    }

    try {
      const response = await fetch('https://my.geotab.com/apiv1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          params: {
            credentials: this.credentials,
            ...params
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error(`Geotab API error for ${method}:`, data.error);
        throw new Error(`Geotab API error: ${data.error.message || 'Unknown error'}`);
      }

      return data.result;
    } catch (error) {
      console.error(`Error calling Geotab ${method}:`, error);
      throw error;
    }
  }

  async getDevices() {
    return await this.makeGeotabCall('Get', {
      typeName: 'Device'
    });
  }

  async getDrivers() {
    return await this.makeGeotabCall('Get', {
      typeName: 'User',
      search: {
        userSearchType: 'Driver'
      }
    });
  }

  async getDeviceStatusInfo() {
    return await this.makeGeotabCall('Get', {
      typeName: 'DeviceStatusInfo'
    });
  }

  async getLogRecords() {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours

    return await this.makeGeotabCall('Get', {
      typeName: 'LogRecord',
      search: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString()
      }
    });
  }
}

serve(async (req) => {
  console.log('=== GEOTAB SYNC FUNCTION CALLED ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function started successfully');
    
    // Check environment variables
    const database = Deno.env.get('GEOTAB_DATABASE');
    const username = Deno.env.get('GEOTAB_USERNAME');
    const password = Deno.env.get('GEOTAB_PASSWORD');
    
    console.log('Environment variables check:', {
      hasDatabase: !!database,
      hasUsername: !!username,
      hasPassword: !!password,
      database: database || 'NOT_SET',
      username: username || 'NOT_SET'
    });
    
    if (!database || !username || !password) {
      const errorMsg = 'Missing Geotab credentials. Please configure GEOTAB_DATABASE, GEOTAB_USERNAME, and GEOTAB_PASSWORD in Supabase secrets.';
      console.error(errorMsg);
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          missing: {
            database: !database,
            username: !username,
            password: !password
          },
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test Supabase connection
    const supabaseUrl = 'https://htaotttcnjxqzpsrqwll.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.pDZ-U7fZRQXrKvpMgPOcvdF4ZPc6JEt7-Z_H2KA_S5Y';
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabaseClient
      .from('vehicles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return new Response(
        JSON.stringify({ 
          error: 'Supabase connection failed',
          details: testError.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Supabase connection successful');
    
    // Test Geotab authentication
    console.log('Testing Geotab authentication...');
    const geotab = new GeotabAPI(database, username, password);
    const authResult = await geotab.authenticate();
    
    if (!authResult) {
      console.error('Geotab authentication failed');
      return new Response(
        JSON.stringify({ 
          error: 'Geotab authentication failed. Please check your credentials.',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Geotab authentication successful');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All systems working! Geotab and Supabase connections successful.',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error in geotab-sync function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});