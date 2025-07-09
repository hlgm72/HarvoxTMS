export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          city_id: string | null
          contract_start_date: string | null
          created_at: string
          dot_number: string | null
          ein: string | null
          email: string | null
          id: string
          max_users: number | null
          max_vehicles: number | null
          mc_number: string | null
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_title: string | null
          payment_day: number
          phone: string | null
          plan_type: string | null
          state_id: string
          status: string | null
          street_address: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          city_id?: string | null
          contract_start_date?: string | null
          created_at?: string
          dot_number?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          max_users?: number | null
          max_vehicles?: number | null
          mc_number?: string | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_title?: string | null
          payment_day?: number
          phone?: string | null
          plan_type?: string | null
          state_id: string
          status?: string | null
          street_address: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          city_id?: string | null
          contract_start_date?: string | null
          created_at?: string
          dot_number?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          max_users?: number | null
          max_vehicles?: number | null
          mc_number?: string | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_title?: string | null
          payment_day?: number
          phone?: string | null
          plan_type?: string | null
          state_id?: string
          status?: string | null
          street_address?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "state_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          cdl_class: string | null
          created_at: string
          date_of_birth: string | null
          driver_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          hire_date: string | null
          id: string
          is_active: boolean
          license_expiry_date: string | null
          license_number: string | null
          license_state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cdl_class?: string | null
          created_at?: string
          date_of_birth?: string | null
          driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_number?: string | null
          license_state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cdl_class?: string | null
          created_at?: string
          date_of_birth?: string | null
          driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_number?: string | null
          license_state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_license_state_fkey"
            columns: ["license_state"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          geotab_id: string
          id: string
          license_number: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          geotab_id: string
          id?: string
          license_number?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          geotab_id?: string
          id?: string
          license_number?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_operators: {
        Row: {
          business_address: string | null
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          business_type: string | null
          created_at: string
          dispatching_percentage: number | null
          factoring_percentage: number | null
          id: string
          insurance_pay: number | null
          is_active: boolean
          leasing_percentage: number | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          dispatching_percentage?: number | null
          factoring_percentage?: number | null
          id?: string
          insurance_pay?: number | null
          is_active?: boolean
          leasing_percentage?: number | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          dispatching_percentage?: number | null
          factoring_percentage?: number | null
          id?: string
          insurance_pay?: number | null
          is_active?: boolean
          leasing_percentage?: number | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferred_language: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      state_cities: {
        Row: {
          county: string | null
          created_at: string
          id: string
          name: string
          state_id: string
        }
        Insert: {
          county?: string | null
          created_at?: string
          id?: string
          name: string
          state_id: string
        }
        Update: {
          county?: string | null
          created_at?: string
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "state_cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_company_roles: {
        Row: {
          company_id: string
          created_at: string
          delegated_at: string | null
          delegated_by: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delegated_at?: string | null
          delegated_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delegated_at?: string | null
          delegated_by?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_assignments: {
        Row: {
          assigned_at: string
          driver_id: string
          id: string
          is_active: boolean
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_positions: {
        Row: {
          bearing: number | null
          created_at: string
          date_time: string
          engine_hours: number | null
          geotab_device_id: string
          id: string
          latitude: number
          longitude: number
          odometer: number | null
          speed: number | null
          vehicle_id: string
        }
        Insert: {
          bearing?: number | null
          created_at?: string
          date_time: string
          engine_hours?: number | null
          geotab_device_id: string
          id?: string
          latitude: number
          longitude: number
          odometer?: number | null
          speed?: number | null
          vehicle_id: string
        }
        Update: {
          bearing?: number | null
          created_at?: string
          date_time?: string
          engine_hours?: number | null
          geotab_device_id?: string
          id?: string
          latitude?: number
          longitude?: number
          odometer?: number | null
          speed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_positions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          device_serial_number: string | null
          geotab_id: string
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          device_serial_number?: string | null
          geotab_id: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          device_serial_number?: string | null
          geotab_id?: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_first_superadmin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      create_first_superadmin: {
        Args: {
          admin_email: string
          admin_password: string
          admin_first_name?: string
          admin_last_name?: string
        }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      needs_initial_setup: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "company_owner"
        | "senior_dispatcher"
        | "dispatcher"
        | "driver"
        | "safety_manager"
        | "superadmin"
        | "general_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "company_owner",
        "senior_dispatcher",
        "dispatcher",
        "driver",
        "safety_manager",
        "superadmin",
        "general_manager",
      ],
    },
  },
} as const
