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

  private async authenticate(): Promise<{success: boolean, error?: any}> {
    try {
      console.log('Attempting Geotab authentication...');
      console.log('Database:', this.database);
      console.log('Username:', this.username);
      console.log('Password length:', this.password?.length || 0);
      
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
      console.log('Geotab response data:', JSON.stringify(data, null, 2));
      
      if (data.result && data.result.credentials) {
        this.credentials = data.result.credentials;
        console.log('Geotab authentication successful');
        return { success: true };
      } else {
        console.error('Geotab authentication failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error authenticating with Geotab:', error);
      return { success: false, error: error.message };
    }
  }

  private async makeGeotabCall(method: string, params: any = {}) {
    if (!this.credentials) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
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
    const fromDate = new Date(toDate.getTime() - (30 * 60 * 1000)); // Last 30 minutes for faster sync

    console.log('Getting GPS positions from:', fromDate.toISOString(), 'to:', toDate.toISOString());

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
    
    if (!authResult.success) {
      console.error('Geotab authentication failed:', authResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Geotab authentication failed. Please check your credentials.',
          geotabError: authResult.error,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Geotab authentication successful');
    
    // Determine action from request body
    const requestBody = await req.json();
    const action = requestBody?.action || 'sync-all';
    
    console.log('Action requested:', action);
    
    let syncResults = {
      vehicles: 0,
      drivers: 0,
      positions: 0,
      message: ''
    };
    
    // Sync vehicles if requested
    if (action === 'sync-vehicles' || action === 'sync-all') {
      console.log('Starting vehicle sync...');
      try {
        const devices = await geotab.getDevices();
        console.log(`Found ${devices?.length || 0} devices from Geotab`);
        
        if (devices && devices.length > 0) {
          for (const device of devices) {
            const { data: existingVehicle, error: checkError } = await supabaseClient
              .from('vehicles')
              .select('id')
              .eq('geotab_id', device.id)
              .maybeSingle();
            
            if (checkError) {
              console.error('Error checking existing vehicle:', checkError);
              continue;
            }
            
            if (!existingVehicle) {
              const { error: insertError } = await supabaseClient
                .from('vehicles')
                .insert({
                  geotab_id: device.id,
                  name: device.name || `Vehicle ${device.serialNumber || device.id}`,
                  vin: device.vehicleIdentificationNumber,
                  license_plate: device.licensePlate,
                  make: device.vehicleModel?.manufacturer?.name,
                  model: device.vehicleModel?.name,
                  year: device.vehicleModel?.year,
                  device_serial_number: device.serialNumber
                });
              
              if (insertError) {
                console.error('Error inserting vehicle:', insertError);
              } else {
                syncResults.vehicles++;
                console.log(`Inserted vehicle: ${device.name}`);
              }
            } else {
              console.log(`Vehicle already exists: ${device.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Error syncing vehicles:', error);
        syncResults.message += `Error syncing vehicles: ${error.message}. `;
      }
    }
    
    // Sync positions if requested
    if (action === 'sync-positions' || action === 'sync-all') {
      console.log('Starting position sync...');
      try {
        // Get device status info to see which devices are actually online
        const deviceStatusInfo = await geotab.getDeviceStatusInfo();
        console.log(`Found ${deviceStatusInfo?.length || 0} device status records`);
        
        // Get log records (GPS positions) for the last 24 hours
        const logRecords = await geotab.getLogRecords();
        console.log(`Found ${logRecords?.length || 0} log records`);
        
        if (logRecords && logRecords.length > 0) {
          for (const record of logRecords) {
            if (!record.device || !record.dateTime || !record.latitude || !record.longitude) {
              continue;
            }
            
            // Find the corresponding vehicle in our database
            const { data: vehicle, error: vehicleError } = await supabaseClient
              .from('vehicles')
              .select('id')
              .eq('geotab_id', record.device.id)
              .maybeSingle();
            
            if (vehicleError || !vehicle) {
              console.log(`Vehicle not found for device ${record.device.id}`);
              continue;
            }
            
            // Check if this position already exists
            const { data: existingPosition, error: positionError } = await supabaseClient
              .from('vehicle_positions')
              .select('id')
              .eq('vehicle_id', vehicle.id)
              .eq('date_time', record.dateTime)
              .maybeSingle();
            
            if (positionError) {
              console.error('Error checking existing position:', positionError);
              continue;
            }
            
            if (!existingPosition) {
              const { error: insertError } = await supabaseClient
                .from('vehicle_positions')
                .insert({
                  vehicle_id: vehicle.id,
                  geotab_device_id: record.device.id,
                  latitude: record.latitude,
                  longitude: record.longitude,
                  speed: record.speed || 0,
                  bearing: record.bearing || 0,
                  odometer: record.odometer || 0,
                  engine_hours: record.engineHours || 0,
                  date_time: record.dateTime
                });
              
              if (insertError) {
                console.error('Error inserting position:', insertError);
              } else {
                syncResults.positions++;
              }
            }
          }
          console.log(`Synced ${syncResults.positions} new positions`);
        }
      } catch (error) {
        console.error('Error syncing positions:', error);
        syncResults.message += `Error syncing positions: ${error.message}. `;
      }
    }
    
    // Sync drivers if requested
    if (action === 'sync-drivers' || action === 'sync-all') {
      console.log('Starting driver sync...');
      try {
        const drivers = await geotab.getDrivers();
        console.log(`Found ${drivers?.length || 0} drivers from Geotab`);
        
        if (drivers && drivers.length > 0) {
          for (const driver of drivers) {
            const { data: existingDriver, error: checkError } = await supabaseClient
              .from('drivers')
              .select('id')
              .eq('geotab_id', driver.id)
              .maybeSingle();
            
            if (checkError) {
              console.error('Error checking existing driver:', checkError);
              continue;
            }
            
            if (!existingDriver) {
              const { error: insertError } = await supabaseClient
                .from('drivers')
                .insert({
                  geotab_id: driver.id,
                  name: driver.name || `Driver ${driver.id}`,
                  license_number: driver.licenseNumber,
                  phone: driver.phone,
                  email: driver.email
                });
              
              if (insertError) {
                console.error('Error inserting driver:', insertError);
              } else {
                syncResults.drivers++;
                console.log(`Inserted driver: ${driver.name}`);
              }
            } else {
              console.log(`Driver already exists: ${driver.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Error syncing drivers:', error);
        syncResults.message += `Error syncing drivers: ${error.message}. `;
      }
    }
    
    const message = syncResults.message || 
      `Successfully synced ${syncResults.vehicles} vehicles and ${syncResults.drivers} drivers.`;
    
    console.log('Sync completed:', syncResults);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        results: syncResults,
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