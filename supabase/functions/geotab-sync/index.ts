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

      const data = await response.json();
      
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const database = Deno.env.get('GEOTAB_DATABASE');
    const username = Deno.env.get('GEOTAB_USERNAME');
    const password = Deno.env.get('GEOTAB_PASSWORD');

    if (!database || !username || !password) {
      throw new Error('Missing Geotab credentials');
    }

    const geotab = new GeotabAPI(database, username, password);
    const { action = 'sync-all' } = await req.json().catch(() => ({}));

    let result = {};

    switch (action) {
      case 'sync-vehicles':
      case 'sync-all':
        console.log('Syncing vehicles from Geotab...');
        const devices = await geotab.getDevices();
        
        for (const device of devices) {
          const vehicleData = {
            geotab_id: device.id,
            name: device.name,
            vin: device.vehicleIdentificationNumber || null,
            license_plate: device.licensePlate || null,
            make: device.autoGroups?.find((g: any) => g.name?.toLowerCase().includes('make'))?.name || null,
            model: device.autoGroups?.find((g: any) => g.name?.toLowerCase().includes('model'))?.name || null,
            year: device.autoGroups?.find((g: any) => g.name?.toLowerCase().includes('year'))?.name ? 
                  parseInt(device.autoGroups.find((g: any) => g.name?.toLowerCase().includes('year')).name) : null,
            device_serial_number: device.serialNumber || null
          };

          await supabaseClient
            .from('vehicles')
            .upsert(vehicleData, { 
              onConflict: 'geotab_id',
              ignoreDuplicates: false 
            });
        }
        
        result.vehicles = `Synced ${devices.length} vehicles`;
        
        if (action === 'sync-vehicles') break;

      case 'sync-drivers':
        console.log('Syncing drivers from Geotab...');
        const drivers = await geotab.getDrivers();
        
        for (const driver of drivers) {
          const driverData = {
            geotab_id: driver.id,
            name: driver.name,
            license_number: driver.licenseNumber || null,
            phone: driver.phoneNumber || null,
            email: driver.privateUserGroups?.[0]?.name || null // Geotab might store email differently
          };

          await supabaseClient
            .from('drivers')
            .upsert(driverData, { 
              onConflict: 'geotab_id',
              ignoreDuplicates: false 
            });
        }
        
        result.drivers = `Synced ${drivers.length} drivers`;
        
        if (action === 'sync-drivers') break;

      case 'sync-positions':
        console.log('Syncing vehicle positions from Geotab...');
        const logRecords = await geotab.getLogRecords();
        const deviceStatusInfo = await geotab.getDeviceStatusInfo();
        
        // Get vehicle mappings from our database
        const { data: vehicles } = await supabaseClient
          .from('vehicles')
          .select('id, geotab_id');
        
        const vehicleMap = new Map(vehicles?.map(v => [v.geotab_id, v.id]) || []);
        
        const positionsToInsert = [];
        
        for (const record of logRecords) {
          if (record.latitude && record.longitude && vehicleMap.has(record.device.id)) {
            const vehicleId = vehicleMap.get(record.device.id);
            const statusInfo = deviceStatusInfo.find((s: any) => s.device.id === record.device.id);
            
            positionsToInsert.push({
              vehicle_id: vehicleId,
              geotab_device_id: record.device.id,
              latitude: record.latitude,
              longitude: record.longitude,
              speed: record.speed || 0,
              bearing: record.bearing || 0,
              odometer: statusInfo?.odometer || 0,
              engine_hours: statusInfo?.engineHours || 0,
              date_time: record.dateTime
            });
          }
        }
        
        if (positionsToInsert.length > 0) {
          await supabaseClient
            .from('vehicle_positions')
            .insert(positionsToInsert);
        }
        
        result.positions = `Synced ${positionsToInsert.length} position records`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in geotab-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});