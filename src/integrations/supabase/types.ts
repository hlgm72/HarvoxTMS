export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      archive_logs: {
        Row: {
          completed_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          operation_type: string
          records_affected: number | null
          started_at: string | null
          status: string | null
          table_name: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          operation_type: string
          records_affected?: number | null
          started_at?: string | null
          status?: string | null
          table_name: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          operation_type?: string
          records_affected?: number | null
          started_at?: string | null
          status?: string | null
          table_name?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          city: string | null
          contract_start_date: string | null
          created_at: string
          default_dispatching_percentage: number | null
          default_factoring_percentage: number | null
          default_leasing_percentage: number | null
          default_payment_frequency: string | null
          dot_number: string | null
          ein: string | null
          email: string | null
          id: string
          load_assignment_criteria: string | null
          logo_url: string | null
          max_users: number | null
          max_vehicles: number | null
          mc_number: string | null
          name: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_title: string | null
          payment_cycle_start_day: number | null
          payment_day: string
          phone: string | null
          plan_type: string | null
          state_id: string
          status: string
          street_address: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          city?: string | null
          contract_start_date?: string | null
          created_at?: string
          default_dispatching_percentage?: number | null
          default_factoring_percentage?: number | null
          default_leasing_percentage?: number | null
          default_payment_frequency?: string | null
          dot_number?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          load_assignment_criteria?: string | null
          logo_url?: string | null
          max_users?: number | null
          max_vehicles?: number | null
          mc_number?: string | null
          name: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_title?: string | null
          payment_cycle_start_day?: number | null
          payment_day?: string
          phone?: string | null
          plan_type?: string | null
          state_id: string
          status?: string
          street_address: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          city?: string | null
          contract_start_date?: string | null
          created_at?: string
          default_dispatching_percentage?: number | null
          default_factoring_percentage?: number | null
          default_leasing_percentage?: number | null
          default_payment_frequency?: string | null
          dot_number?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          load_assignment_criteria?: string | null
          logo_url?: string | null
          max_users?: number | null
          max_vehicles?: number | null
          mc_number?: string | null
          name?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_title?: string | null
          payment_cycle_start_day?: number | null
          payment_day?: string
          phone?: string | null
          plan_type?: string | null
          state_id?: string
          status?: string
          street_address?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      company_client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          extension: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone_mobile: string | null
          phone_office: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          extension?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          extension?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone_mobile?: string | null
          phone_office?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_broker_dispatchers_broker_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "company_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      company_clients: {
        Row: {
          address: string | null
          alias: string | null
          company_id: string
          created_at: string
          dot_number: string | null
          email_domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          mc_number: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alias?: string | null
          company_id: string
          created_at?: string
          dot_number?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mc_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alias?: string | null
          company_id?: string
          created_at?: string
          dot_number?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mc_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_brokers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_brokers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_clients_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_clients_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      company_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          action: string
          company_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          action: string
          company_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          action?: string
          company_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          company_id: string
          content_type: string | null
          created_at: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          company_id: string
          content_type?: string | null
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          company_id?: string
          content_type?: string | null
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean
          notes?: string | null
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
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      company_equipment: {
        Row: {
          annual_inspection_expiry_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          current_mileage: number | null
          equipment_number: string
          equipment_type: string
          fuel_type: string | null
          geotab_vehicle_id: string | null
          id: string
          insurance_expiry_date: string | null
          license_plate: string | null
          license_plate_expiry_date: string | null
          make: string | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry_date: string | null
          status: string
          updated_at: string
          updated_by: string | null
          vin_number: string | null
          year: number | null
        }
        Insert: {
          annual_inspection_expiry_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          current_mileage?: number | null
          equipment_number: string
          equipment_type?: string
          fuel_type?: string | null
          geotab_vehicle_id?: string | null
          id?: string
          insurance_expiry_date?: string | null
          license_plate?: string | null
          license_plate_expiry_date?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vin_number?: string | null
          year?: number | null
        }
        Update: {
          annual_inspection_expiry_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_mileage?: number | null
          equipment_number?: string
          equipment_type?: string
          fuel_type?: string | null
          geotab_vehicle_id?: string | null
          id?: string
          insurance_expiry_date?: string | null
          license_plate?: string | null
          license_plate_expiry_date?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry_date?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vin_number?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_company_equipment_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      company_financial_settings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          default_dispatching_percentage: number | null
          default_factoring_percentage: number | null
          default_leasing_percentage: number | null
          default_payment_frequency: string | null
          ein: string | null
          id: string
          payment_cycle_start_day: number | null
          payment_day: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          default_dispatching_percentage?: number | null
          default_factoring_percentage?: number | null
          default_leasing_percentage?: number | null
          default_payment_frequency?: string | null
          ein?: string | null
          id?: string
          payment_cycle_start_day?: number | null
          payment_day?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_dispatching_percentage?: number | null
          default_factoring_percentage?: number | null
          default_leasing_percentage?: number | null
          default_payment_frequency?: string | null
          ein?: string | null
          id?: string
          payment_cycle_start_day?: number | null
          payment_day?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_financial_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_financial_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payment_periods: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          payment_date: string | null
          period_end_date: string
          period_frequency: string
          period_start_date: string
          period_type: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          payment_date?: string | null
          period_end_date: string
          period_frequency: string
          period_start_date: string
          period_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          payment_date?: string | null
          period_end_date?: string
          period_frequency?: string
          period_start_date?: string
          period_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_sensitive_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string
          company_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by: string
          company_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string
          company_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      deployment_log: {
        Row: {
          completed_at: string | null
          created_at: string
          deployment_id: string
          environment: string
          event_data: Json | null
          event_type: string
          github_commit_sha: string | null
          health_check_results: Json | null
          id: string
          initiated_by: string | null
          status: string | null
          version_from: string | null
          version_to: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deployment_id: string
          environment?: string
          event_data?: Json | null
          event_type: string
          github_commit_sha?: string | null
          health_check_results?: Json | null
          id?: string
          initiated_by?: string | null
          status?: string | null
          version_from?: string | null
          version_to?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deployment_id?: string
          environment?: string
          event_data?: Json | null
          event_type?: string
          github_commit_sha?: string | null
          health_check_results?: Json | null
          id?: string
          initiated_by?: string | null
          status?: string | null
          version_from?: string | null
          version_to?: string | null
        }
        Relationships: []
      }
      driver_fuel_cards: {
        Row: {
          assigned_date: string
          card_identifier: string | null
          card_number_last_five: string
          card_provider: string
          company_id: string
          created_at: string
          created_by: string | null
          deactivated_date: string | null
          driver_user_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          card_identifier?: string | null
          card_number_last_five: string
          card_provider?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deactivated_date?: string | null
          driver_user_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          card_identifier?: string | null
          card_number_last_five?: string
          card_provider?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deactivated_date?: string | null
          driver_user_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      driver_period_calculations: {
        Row: {
          balance_alert_message: string | null
          calculated_at: string | null
          calculated_by: string | null
          company_payment_period_id: string
          created_at: string
          driver_user_id: string
          fuel_expenses: number
          gross_earnings: number
          has_negative_balance: boolean
          id: string
          net_payment: number
          other_income: number
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_reference: string | null
          payment_status: string | null
          total_deductions: number
          total_income: number
          updated_at: string
        }
        Insert: {
          balance_alert_message?: string | null
          calculated_at?: string | null
          calculated_by?: string | null
          company_payment_period_id: string
          created_at?: string
          driver_user_id: string
          fuel_expenses?: number
          gross_earnings?: number
          has_negative_balance?: boolean
          id?: string
          net_payment?: number
          other_income?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          total_deductions?: number
          total_income?: number
          updated_at?: string
        }
        Update: {
          balance_alert_message?: string | null
          calculated_at?: string | null
          calculated_by?: string | null
          company_payment_period_id?: string
          created_at?: string
          driver_user_id?: string
          fuel_expenses?: number
          gross_earnings?: number
          has_negative_balance?: boolean
          id?: string
          net_payment?: number
          other_income?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          total_deductions?: number
          total_income?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_period_calculations_company_payment_period_id_fkey"
            columns: ["company_payment_period_id"]
            isOneToOne: false
            referencedRelation: "company_payment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          cdl_class: string | null
          cdl_endorsements: string | null
          created_at: string
          driver_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          is_active: boolean
          license_expiry_date: string | null
          license_issue_date: string | null
          license_number: string | null
          license_state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cdl_class?: string | null
          cdl_endorsements?: string | null
          created_at?: string
          driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_issue_date?: string | null
          license_number?: string | null
          license_state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cdl_class?: string | null
          cdl_endorsements?: string | null
          created_at?: string
          driver_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_active?: boolean
          license_expiry_date?: string | null
          license_issue_date?: string | null
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
      equipment_assignments: {
        Row: {
          assigned_by: string | null
          assigned_date: string
          assignment_type: string
          created_at: string
          driver_user_id: string
          equipment_id: string
          id: string
          is_active: boolean
          notes: string | null
          unassigned_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string
          assignment_type?: string
          created_at?: string
          driver_user_id: string
          equipment_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          unassigned_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string
          assignment_type?: string
          created_at?: string
          driver_user_id?: string
          equipment_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          unassigned_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "company_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_status_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_assignments_equipment_id"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "company_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipment_assignments_equipment_id"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_status_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          content_type: string | null
          created_at: string
          document_name: string
          document_number: string | null
          document_type: string
          equipment_id: string
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_current: boolean
          issue_date: string | null
          issuing_authority: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          content_type?: string | null
          created_at?: string
          document_name: string
          document_number?: string | null
          document_type: string
          equipment_id: string
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_current?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          content_type?: string | null
          created_at?: string
          document_name?: string
          document_number?: string | null
          document_type?: string
          equipment_id?: string
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_current?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      equipment_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          equipment_id: string
          facility_name: string | null
          id: string
          is_current: boolean
          latitude: number | null
          location_type: string
          longitude: number | null
          notes: string | null
          reported_at: string
          reported_by: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          equipment_id: string
          facility_name?: string | null
          id?: string
          is_current?: boolean
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          notes?: string | null
          reported_at?: string
          reported_by?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          equipment_id?: string
          facility_name?: string | null
          id?: string
          is_current?: boolean
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          notes?: string | null
          reported_at?: string
          reported_by?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      expense_instances: {
        Row: {
          amount: number
          applied_at: string | null
          applied_by: string | null
          applied_to_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string | null
          expense_type_id: string
          id: string
          is_critical: boolean
          notes: string | null
          payment_period_id: string
          priority: number
          recurring_template_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_by?: string | null
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          expense_type_id: string
          id?: string
          is_critical?: boolean
          notes?: string | null
          payment_period_id: string
          priority?: number
          recurring_template_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_by?: string | null
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          expense_type_id?: string
          id?: string
          is_critical?: boolean
          notes?: string | null
          payment_period_id?: string
          priority?: number
          recurring_template_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_instances_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_instances_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "expense_recurring_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_recurring_templates: {
        Row: {
          amount: number
          applied_to_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          created_by: string | null
          end_date: string | null
          expense_type_id: string
          frequency: string
          id: string
          is_active: boolean
          month_week: number | null
          notes: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          expense_type_id: string
          frequency: string
          id?: string
          is_active?: boolean
          month_week?: number | null
          notes?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          expense_type_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          month_week?: number | null
          notes?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expense_templates_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_template_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          effective_from: string
          id: string
          new_amount: number
          previous_amount: number
          template_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_from: string
          id?: string
          new_amount: number
          previous_amount: number
          template_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          new_amount?: number
          previous_amount?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_template_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "expense_recurring_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fuel_card_providers: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fuel_expenses: {
        Row: {
          card_last_five: string | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          driver_user_id: string
          fees: number | null
          fuel_type: string
          gallons_purchased: number
          gross_amount: number | null
          id: string
          invoice_number: string | null
          is_verified: boolean
          notes: string | null
          payment_period_id: string
          price_per_gallon: number
          raw_webhook_data: Json | null
          receipt_url: string | null
          station_name: string | null
          station_state: string | null
          status: string
          total_amount: number
          transaction_date: string
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          card_last_five?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          driver_user_id: string
          fees?: number | null
          fuel_type?: string
          gallons_purchased: number
          gross_amount?: number | null
          id?: string
          invoice_number?: string | null
          is_verified?: boolean
          notes?: string | null
          payment_period_id: string
          price_per_gallon: number
          raw_webhook_data?: Json | null
          receipt_url?: string | null
          station_name?: string | null
          station_state?: string | null
          status?: string
          total_amount: number
          transaction_date: string
          updated_at?: string
          vehicle_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          card_last_five?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          driver_user_id?: string
          fees?: number | null
          fuel_type?: string
          gallons_purchased?: number
          gross_amount?: number | null
          id?: string
          invoice_number?: string | null
          is_verified?: boolean
          notes?: string | null
          payment_period_id?: string
          price_per_gallon?: number
          raw_webhook_data?: Json | null
          receipt_url?: string | null
          station_name?: string | null
          station_state?: string | null
          status?: string
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          vehicle_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fuel_expenses_payment_period"
            columns: ["payment_period_id"]
            isOneToOne: false
            referencedRelation: "company_payment_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "company_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "equipment_status_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_limits: {
        Row: {
          alert_at_percentage: number | null
          created_at: string
          created_by: string | null
          daily_dollar_limit: number | null
          daily_gallon_limit: number | null
          driver_user_id: string
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean
          updated_at: string
          weekly_dollar_limit: number | null
          weekly_gallon_limit: number | null
        }
        Insert: {
          alert_at_percentage?: number | null
          created_at?: string
          created_by?: string | null
          daily_dollar_limit?: number | null
          daily_gallon_limit?: number | null
          driver_user_id: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          weekly_dollar_limit?: number | null
          weekly_gallon_limit?: number | null
        }
        Update: {
          alert_at_percentage?: number | null
          created_at?: string
          created_by?: string | null
          daily_dollar_limit?: number | null
          daily_gallon_limit?: number | null
          driver_user_id?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          weekly_dollar_limit?: number | null
          weekly_gallon_limit?: number | null
        }
        Relationships: []
      }
      geotab_drivers: {
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
      geotab_vehicle_assignments: {
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
            referencedRelation: "geotab_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "geotab_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geotab_vehicle_positions: {
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
            referencedRelation: "geotab_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geotab_vehicles: {
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
      inspections: {
        Row: {
          certificate_expiry_date: string | null
          certificate_number: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          defects_found: string[] | null
          engine_hours: number | null
          equipment_id: string
          id: string
          inspection_date: string
          inspection_items: Json | null
          inspection_location: string | null
          inspection_type: string
          inspector_license: string | null
          inspector_name: string
          notes: string | null
          odometer_reading: number | null
          overall_status: string
          report_url: string | null
          updated_at: string
        }
        Insert: {
          certificate_expiry_date?: string | null
          certificate_number?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          defects_found?: string[] | null
          engine_hours?: number | null
          equipment_id: string
          id?: string
          inspection_date: string
          inspection_items?: Json | null
          inspection_location?: string | null
          inspection_type: string
          inspector_license?: string | null
          inspector_name: string
          notes?: string | null
          odometer_reading?: number | null
          overall_status?: string
          report_url?: string | null
          updated_at?: string
        }
        Update: {
          certificate_expiry_date?: string | null
          certificate_number?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          defects_found?: string[] | null
          engine_hours?: number | null
          equipment_id?: string
          id?: string
          inspection_date?: string
          inspection_items?: Json | null
          inspection_location?: string | null
          inspection_type?: string
          inspector_license?: string | null
          inspector_name?: string
          notes?: string | null
          odometer_reading?: number | null
          overall_status?: string
          report_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      load_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          content_type: string | null
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          load_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          content_type?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          load_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          content_type?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          load_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_documents_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      load_stops: {
        Row: {
          actual_date: string | null
          actual_time: string | null
          address: string
          city: string
          company_name: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          load_id: string
          reference_number: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          special_instructions: string | null
          state: string
          stop_number: number
          stop_type: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          actual_date?: string | null
          actual_time?: string | null
          address: string
          city: string
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          load_id: string
          reference_number?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          special_instructions?: string | null
          state: string
          stop_number: number
          stop_type: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          actual_date?: string | null
          actual_time?: string | null
          address?: string
          city?: string
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          load_id?: string
          reference_number?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          special_instructions?: string | null
          state?: string
          stop_number?: number
          stop_type?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_stops_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          client_contact_id: string | null
          client_id: string | null
          commodity: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_name: string | null
          delivery_date: string | null
          dispatching_percentage: number | null
          driver_user_id: string | null
          factoring_percentage: number | null
          id: string
          internal_dispatcher_id: string | null
          leasing_percentage: number | null
          load_number: string
          notes: string | null
          payment_period_id: string | null
          pickup_date: string | null
          po_number: string | null
          status: string
          total_amount: number
          updated_at: string
          weight_lbs: number | null
        }
        Insert: {
          client_contact_id?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          delivery_date?: string | null
          dispatching_percentage?: number | null
          driver_user_id?: string | null
          factoring_percentage?: number | null
          id?: string
          internal_dispatcher_id?: string | null
          leasing_percentage?: number | null
          load_number: string
          notes?: string | null
          payment_period_id?: string | null
          pickup_date?: string | null
          po_number?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          weight_lbs?: number | null
        }
        Update: {
          client_contact_id?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          delivery_date?: string | null
          dispatching_percentage?: number | null
          driver_user_id?: string | null
          factoring_percentage?: number | null
          id?: string
          internal_dispatcher_id?: string | null
          leasing_percentage?: number | null
          load_number?: string
          notes?: string | null
          payment_period_id?: string | null
          pickup_date?: string | null
          po_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loads_broker_dispatcher_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "company_client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_payment_period_id_fkey"
            columns: ["payment_period_id"]
            isOneToOne: false
            referencedRelation: "company_payment_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      loads_archive: {
        Row: {
          client_contact_id: string | null
          client_id: string | null
          commodity: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_name: string | null
          delivery_date: string | null
          dispatching_percentage: number | null
          driver_user_id: string | null
          factoring_percentage: number | null
          id: string
          internal_dispatcher_id: string | null
          leasing_percentage: number | null
          load_number: string
          notes: string | null
          payment_period_id: string | null
          pickup_date: string | null
          po_number: string | null
          status: string
          total_amount: number
          updated_at: string
          weight_lbs: number | null
        }
        Insert: {
          client_contact_id?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          delivery_date?: string | null
          dispatching_percentage?: number | null
          driver_user_id?: string | null
          factoring_percentage?: number | null
          id?: string
          internal_dispatcher_id?: string | null
          leasing_percentage?: number | null
          load_number: string
          notes?: string | null
          payment_period_id?: string | null
          pickup_date?: string | null
          po_number?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          weight_lbs?: number | null
        }
        Update: {
          client_contact_id?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_name?: string | null
          delivery_date?: string | null
          dispatching_percentage?: number | null
          driver_user_id?: string | null
          factoring_percentage?: number | null
          id?: string
          internal_dispatcher_id?: string | null
          leasing_percentage?: number | null
          load_number?: string
          notes?: string | null
          payment_period_id?: string | null
          pickup_date?: string | null
          po_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          weight_lbs?: number | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          created_at: string
          created_by: string | null
          engine_hours_at_service: number | null
          equipment_id: string
          id: string
          labor_cost: number | null
          maintenance_type_id: string
          mileage_at_service: number | null
          next_service_due_date: string | null
          next_service_due_mileage: number | null
          notes: string | null
          parts_cost: number | null
          parts_used: string[] | null
          performed_by: string
          performed_date: string
          receipt_url: string | null
          schedule_id: string | null
          status: string
          total_cost: number | null
          updated_at: string
          work_description: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          engine_hours_at_service?: number | null
          equipment_id: string
          id?: string
          labor_cost?: number | null
          maintenance_type_id: string
          mileage_at_service?: number | null
          next_service_due_date?: string | null
          next_service_due_mileage?: number | null
          notes?: string | null
          parts_cost?: number | null
          parts_used?: string[] | null
          performed_by: string
          performed_date: string
          receipt_url?: string | null
          schedule_id?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          work_description?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          engine_hours_at_service?: number | null
          equipment_id?: string
          id?: string
          labor_cost?: number | null
          maintenance_type_id?: string
          mileage_at_service?: number | null
          next_service_due_date?: string | null
          next_service_due_mileage?: number | null
          notes?: string | null
          parts_cost?: number | null
          parts_used?: string[] | null
          performed_by?: string
          performed_date?: string
          receipt_url?: string | null
          schedule_id?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string
          work_description?: string | null
        }
        Relationships: []
      }
      maintenance_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          equipment_id: string
          frequency_type: string
          frequency_value: number
          id: string
          is_active: boolean
          last_performed_date: string | null
          last_performed_mileage: number | null
          maintenance_type_id: string
          next_due_date: string | null
          next_due_mileage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment_id: string
          frequency_type: string
          frequency_value: number
          id?: string
          is_active?: boolean
          last_performed_date?: string | null
          last_performed_mileage?: number | null
          maintenance_type_id: string
          next_due_date?: string | null
          next_due_mileage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          frequency_type?: string
          frequency_value?: number
          id?: string
          is_active?: boolean
          last_performed_date?: string | null
          last_performed_mileage?: number | null
          maintenance_type_id?: string
          next_due_date?: string | null
          next_due_mileage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_types: {
        Row: {
          category: string
          created_at: string
          description: string | null
          estimated_cost: number | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean
          name: string
          required_parts: string[] | null
          safety_requirements: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean
          name: string
          required_parts?: string[] | null
          safety_requirements?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean
          name?: string
          required_parts?: string[] | null
          safety_requirements?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      other_income: {
        Row: {
          amount: number
          applied_to_role: Database["public"]["Enums"]["user_role"]
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          income_date: string
          income_type: string
          notes: string | null
          payment_period_id: string
          receipt_url: string | null
          reference_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          applied_to_role: Database["public"]["Enums"]["user_role"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          income_date: string
          income_type: string
          notes?: string | null
          payment_period_id: string
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          applied_to_role?: Database["public"]["Enums"]["user_role"]
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          income_date?: string
          income_type?: string
          notes?: string | null
          payment_period_id?: string
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          token: string
          used_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          token: string
          used_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          token?: string
          used_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          method_type: string
          name: string
          requires_reference: boolean | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method_type?: string
          name: string
          requires_reference?: boolean | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method_type?: string
          name?: string
          requires_reference?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reports: {
        Row: {
          amount: number
          attachments: Json | null
          created_at: string
          id: string
          notes: string | null
          payment_method_id: string
          payment_period_id: string
          reference_number: string | null
          reported_at: string
          reported_by: string
          status: string
          transaction_date: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          attachments?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method_id: string
          payment_period_id: string
          reference_number?: string | null
          reported_at?: string
          reported_by: string
          status?: string
          transaction_date?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          attachments?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method_id?: string
          payment_period_id?: string
          reference_number?: string | null
          reported_at?: string
          reported_by?: string
          status?: string
          transaction_date?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reports_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_expenses: {
        Row: {
          amount: number
          applied_to_period_id: string | null
          applied_to_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          driver_user_id: string
          expense_instance_id: string
          id: string
          original_period_id: string
          reason_deferred: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          applied_to_period_id?: string | null
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          driver_user_id: string
          expense_instance_id: string
          id?: string
          original_period_id: string
          reason_deferred?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          applied_to_period_id?: string | null
          applied_to_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          driver_user_id?: string
          expense_instance_id?: string
          id?: string
          original_period_id?: string
          reason_deferred?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_expenses_expense_instance_id_fkey"
            columns: ["expense_instance_id"]
            isOneToOne: false
            referencedRelation: "expense_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferred_language: string | null
          state_id: string | null
          street_address: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          state_id?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferred_language?: string | null
          state_id?: string | null
          street_address?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
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
      system_backups: {
        Row: {
          backup_data: Json
          backup_id: string
          backup_type: string
          checksum: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_compressed: boolean | null
          metadata: Json | null
          record_count: number
          status: string | null
          table_name: string
        }
        Insert: {
          backup_data: Json
          backup_id: string
          backup_type?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_compressed?: boolean | null
          metadata?: Json | null
          record_count?: number
          status?: string | null
          table_name: string
        }
        Update: {
          backup_data?: Json
          backup_id?: string
          backup_type?: string
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_compressed?: boolean | null
          metadata?: Json | null
          record_count?: number
          status?: string | null
          table_name?: string
        }
        Relationships: []
      }
      system_health_log: {
        Row: {
          acid_functions_status: boolean | null
          active_connections: number | null
          authentication_status: boolean | null
          check_timestamp: string
          created_at: string
          critical_tables_status: boolean | null
          database_status: boolean | null
          detailed_results: Json | null
          error_rate_percentage: number | null
          health_percentage: number
          id: string
          overall_status: string
          recommendations: string[] | null
          response_time_ms: number | null
          storage_status: boolean | null
        }
        Insert: {
          acid_functions_status?: boolean | null
          active_connections?: number | null
          authentication_status?: boolean | null
          check_timestamp?: string
          created_at?: string
          critical_tables_status?: boolean | null
          database_status?: boolean | null
          detailed_results?: Json | null
          error_rate_percentage?: number | null
          health_percentage: number
          id?: string
          overall_status: string
          recommendations?: string[] | null
          response_time_ms?: number | null
          storage_status?: boolean | null
        }
        Update: {
          acid_functions_status?: boolean | null
          active_connections?: number | null
          authentication_status?: boolean | null
          check_timestamp?: string
          created_at?: string
          critical_tables_status?: boolean | null
          database_status?: boolean | null
          detailed_results?: Json | null
          error_rate_percentage?: number | null
          health_percentage?: number
          id?: string
          overall_status?: string
          recommendations?: string[] | null
          response_time_ms?: number | null
          storage_status?: boolean | null
        }
        Relationships: []
      }
      system_stats: {
        Row: {
          created_at: string | null
          id: string
          stat_type: string
          stat_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          stat_type: string
          stat_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          stat_type?: string
          stat_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      user_company_roles: {
        Row: {
          company_id: string
          created_at: string
          delegated_at: string | null
          delegated_by: string | null
          employment_status: string | null
          id: string
          is_active: boolean
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delegated_at?: string | null
          delegated_by?: string | null
          employment_status?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delegated_at?: string | null
          delegated_by?: string | null
          employment_status?: string | null
          id?: string
          is_active?: boolean
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_company_roles_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_company_roles_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invitation_token: string
          invited_by: string | null
          is_active: boolean
          last_name: string | null
          metadata: Json | null
          role: string
          status: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invitation_token: string
          invited_by?: string | null
          is_active?: boolean
          last_name?: string | null
          metadata?: Json | null
          role?: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invitation_token?: string
          invited_by?: string | null
          is_active?: boolean
          last_name?: string | null
          metadata?: Json | null
          role?: string
          status?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          role: string
          skipped: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          role: string
          skipped?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          role?: string
          skipped?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_public_secure: {
        Row: {
          city: string | null
          created_at: string | null
          email: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          phone: string | null
          plan_type: string | null
          state_id: string | null
          status: string | null
          street_address: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          plan_type?: string | null
          state_id?: string | null
          status?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          phone?: string | null
          plan_type?: string | null
          state_id?: string | null
          status?: string | null
          street_address?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_status_summary: {
        Row: {
          annual_inspection_expiry_date: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          current_mileage: number | null
          equipment_number: string | null
          equipment_type: string | null
          fuel_type: string | null
          geotab_vehicle_id: string | null
          has_form_2290: number | null
          has_inspection: number | null
          has_registration: number | null
          has_title: number | null
          id: string | null
          inspection_status: string | null
          insurance_expiry_date: string | null
          insurance_status: string | null
          license_plate: string | null
          license_plate_expiry_date: string | null
          license_status: string | null
          make: string | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry_date: string | null
          registration_status: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          vin_number: string | null
          year: number | null
        }
        Insert: {
          annual_inspection_expiry_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_mileage?: number | null
          equipment_number?: string | null
          equipment_type?: string | null
          fuel_type?: string | null
          geotab_vehicle_id?: string | null
          has_form_2290?: never
          has_inspection?: never
          has_registration?: never
          has_title?: never
          id?: string | null
          inspection_status?: never
          insurance_expiry_date?: string | null
          insurance_status?: never
          license_plate?: string | null
          license_plate_expiry_date?: string | null
          license_status?: never
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry_date?: string | null
          registration_status?: never
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vin_number?: string | null
          year?: number | null
        }
        Update: {
          annual_inspection_expiry_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_mileage?: number | null
          equipment_number?: string | null
          equipment_type?: string | null
          fuel_type?: string | null
          geotab_vehicle_id?: string | null
          has_form_2290?: never
          has_inspection?: never
          has_registration?: never
          has_title?: never
          id?: string | null
          inspection_status?: never
          insurance_expiry_date?: string | null
          insurance_status?: never
          license_plate?: string | null
          license_plate_expiry_date?: string | null
          license_status?: never
          make?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry_date?: string | null
          registration_status?: never
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          vin_number?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_company_equipment_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_company_equipment_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public_secure"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_company_document: {
        Args: { document_id: string }
        Returns: Json
      }
      archive_document_with_validation: {
        Args: { archive_reason?: string; document_id_param: string }
        Returns: Json
      }
      archive_old_loads: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      assign_equipment_to_driver_with_validation: {
        Args: { assignment_data: Json }
        Returns: Json
      }
      assign_equipment_with_validation: {
        Args: { assignment_data: Json }
        Returns: Json
      }
      assign_first_superadmin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      calculate_driver_payment_period: {
        Args: { period_calculation_id: string }
        Returns: Json
      }
      calculate_driver_payment_period_v2: {
        Args: { period_calculation_id: string }
        Returns: Json
      }
      calculate_driver_payment_period_with_validation: {
        Args: { calculation_id: string }
        Returns: Json
      }
      calculate_driver_period_totals: {
        Args: {
          company_payment_period_id_param: string
          driver_user_id_param: string
        }
        Returns: {
          fuel_expenses: number
          gross_earnings: number
          other_income: number
          total_deductions: number
        }[]
      }
      calculate_fuel_summary_for_period: {
        Args: { period_id: string }
        Returns: {
          approved_amount: number
          average_price_per_gallon: number
          pending_amount: number
          total_amount: number
          total_gallons: number
          transaction_count: number
        }[]
      }
      calculate_payment_date: {
        Args:
          | { company_id_param: string; target_date?: string }
          | { payment_day: string; period_end_date: string }
        Returns: string
      }
      can_access_company_sensitive_data: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      can_access_load: {
        Args: { load_id_param: string }
        Returns: boolean
      }
      can_close_payment_period: {
        Args: { period_id: string }
        Returns: Json
      }
      can_delete_test_company: {
        Args: { company_id_param: string }
        Returns: Json
      }
      can_user_be_permanently_deleted: {
        Args: { user_id_param: string }
        Returns: Json
      }
      check_is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_user_role_access: {
        Args: { target_company_id: string; target_user_id: string }
        Returns: boolean
      }
      cleanup_expired_backups: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      close_payment_period_when_complete: {
        Args: { period_id: string }
        Returns: Json
      }
      close_payment_period_with_validation: {
        Args: { company_period_id: string }
        Returns: Json
      }
      company_has_owner: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      create_client_with_contacts: {
        Args: { client_data: Json; contacts_data?: Json }
        Returns: Json
      }
      create_equipment_with_documents: {
        Args: { documents_data?: Json; equipment_data: Json }
        Returns: Json
      }
      create_first_superadmin: {
        Args: {
          admin_email: string
          admin_first_name?: string
          admin_last_name?: string
          admin_password: string
        }
        Returns: Json
      }
      create_fuel_expense_with_validation: {
        Args: { expense_data: Json; receipt_file_data?: Json }
        Returns: Json
      }
      create_load_with_stops_and_documents: {
        Args: { documents_data?: Json; load_data: Json; stops_data?: Json }
        Returns: Json
      }
      create_or_update_client_contact_with_validation: {
        Args: { contact_data: Json; contact_id?: string }
        Returns: Json
      }
      create_or_update_client_with_validation: {
        Args: { client_data: Json; client_id?: string }
        Returns: Json
      }
      create_or_update_company_with_validation: {
        Args: { company_data: Json; company_id?: string }
        Returns: Json
      }
      create_or_update_document_with_validation: {
        Args: { document_data: Json; document_id?: string }
        Returns: Json
      }
      create_or_update_equipment_with_validation: {
        Args: { equipment_data: Json; equipment_id?: string }
        Returns: Json
      }
      create_or_update_expense_template_with_validation: {
        Args: { template_data: Json; template_id?: string }
        Returns: Json
      }
      create_or_update_fuel_expense_with_validation: {
        Args: { expense_data: Json; expense_id?: string }
        Returns: Json
      }
      create_or_update_load_with_validation: {
        Args: { load_data: Json; load_id?: string; stops_data: Json }
        Returns: Json
      }
      create_or_update_user_profile_with_validation: {
        Args: { role_data?: Json; user_data: Json }
        Returns: Json
      }
      create_other_income_with_validation: {
        Args: { income_data: Json }
        Returns: Json
      }
      create_user_with_company_role_validation: {
        Args: { company_role_data: Json; user_data: Json }
        Returns: Json
      }
      deactivate_expense_template_with_validation: {
        Args: { deactivation_reason?: string; template_id: string }
        Returns: Json
      }
      deactivate_user_with_validation: {
        Args: {
          deactivation_reason?: string
          target_company_id: string
          target_user_id: string
        }
        Returns: Json
      }
      delete_client_contact_with_validation: {
        Args: { contact_id_param: string }
        Returns: Json
      }
      delete_client_with_validation: {
        Args: { client_id_param: string }
        Returns: Json
      }
      delete_company_document_permanently: {
        Args: { document_id: string }
        Returns: Json
      }
      delete_fuel_expense_with_validation: {
        Args: { expense_id: string }
        Returns: Json
      }
      delete_load_with_validation: {
        Args: { load_id_param: string }
        Returns: Json
      }
      delete_other_income_with_validation: {
        Args: { income_id: string }
        Returns: Json
      }
      delete_test_company: {
        Args: { company_id_param: string }
        Returns: Json
      }
      disable_service_operation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_service_operation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_fuel_expenses_separation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_fuel_expenses_separation_v2: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      force_assign_payment_period: {
        Args: { load_id_param: string; period_id_param: string }
        Returns: boolean
      }
      force_recalculate_driver_deductions: {
        Args: { driver_id_param: string; period_id_param: string }
        Returns: Json
      }
      generate_company_payment_periods: {
        Args: { company_id_param: string; from_date: string; to_date: string }
        Returns: Json
      }
      generate_company_payment_periods_with_calculations: {
        Args: {
          end_date: string
          run_calculations?: boolean
          start_date: string
          target_company_id: string
        }
        Returns: Json
      }
      generate_load_percentage_deductions: {
        Args: { load_id_param?: string; period_calculation_id: string }
        Returns: undefined
      }
      generate_load_percentage_deductions_v2: {
        Args: { period_calculation_id: string }
        Returns: Json
      }
      generate_payment_periods: {
        Args:
          | { company_id_param: string; from_date: string; to_date: string }
          | {
              company_id_param: string
              from_date_param: string
              to_date_param: string
            }
        Returns: Json
      }
      generate_recurring_expenses_for_period: {
        Args: { period_id: string }
        Returns: Json
      }
      get_company_current_payment_period: {
        Args: { company_id_param: string; target_date?: string }
        Returns: string
      }
      get_current_payment_period: {
        Args: { driver_user_id_param: string; target_date?: string }
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_email_for_rls: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_for_rls: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_id_optimized: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_payment_period_elements: {
        Args: { period_id_param: string }
        Returns: Json
      }
      get_period_drivers_summary: {
        Args: { company_payment_period_id_param: string }
        Returns: {
          driver_name: string
          driver_user_id: string
          gross_earnings: number
          has_negative_balance: boolean
          net_payment: number
          other_income: number
          total_deductions: number
          total_income: number
        }[]
      }
      get_real_companies: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
        }[]
      }
      get_user_admin_companies: {
        Args: { user_id_param: string }
        Returns: {
          company_id: string
        }[]
      }
      get_user_companies: {
        Args: { user_id_param: string }
        Returns: {
          company_id: string
        }[]
      }
      get_user_company_ids: {
        Args: { user_id_param?: string }
        Returns: string[]
      }
      get_user_company_ids_safe: {
        Args: { user_id_param?: string }
        Returns: string[]
      }
      get_user_email_by_id: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_user_emails_for_company: {
        Args: { company_id_param: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated_company_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_non_anon: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_non_anon_for_rls: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_non_anonymous: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_optimized: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_company_owner_in_company: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      is_current_user_anonymous: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_period_locked: {
        Args: { period_id: string }
        Returns: boolean
      }
      is_superadmin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_user_admin_in_company_safe: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_user_authorized_for_company: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      is_user_company_owner: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_user_superadmin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_superadmin_safe: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      lock_payment_period: {
        Args: {
          payment_method_used?: string
          payment_ref?: string
          period_id: string
        }
        Returns: Json
      }
      log_company_data_access: {
        Args: {
          access_type_param: string
          action_param?: string
          company_id_param: string
        }
        Returns: undefined
      }
      log_deployment_event: {
        Args: {
          deployment_id_param: string
          environment_param?: string
          event_data_param?: Json
          event_type_param: string
          github_commit_sha_param?: string
          version_from_param?: string
          version_to_param?: string
        }
        Returns: Json
      }
      log_health_check: {
        Args: {
          acid_functions_status_param?: boolean
          authentication_status_param?: boolean
          critical_tables_status_param?: boolean
          database_status_param?: boolean
          detailed_results_param?: Json
          health_percentage_param: number
          overall_status_param: string
          response_time_ms_param?: number
          storage_status_param?: boolean
        }
        Returns: Json
      }
      maintenance_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      mark_driver_as_paid: {
        Args: {
          calculation_id: string
          notes?: string
          payment_method_used?: string
          payment_ref?: string
        }
        Returns: Json
      }
      mark_driver_as_paid_with_validation: {
        Args: {
          calculation_id: string
          notes?: string
          payment_method_used?: string
          payment_ref?: string
        }
        Returns: Json
      }
      mark_multiple_drivers_as_paid_with_validation: {
        Args: {
          calculation_ids: string[]
          notes?: string
          payment_method_used?: string
          payment_ref?: string
        }
        Returns: Json
      }
      move_to_archive: {
        Args: Record<PropertyKey, never>
        Returns: {
          moved_records: number
        }[]
      }
      move_to_archive_with_logging: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      needs_initial_setup: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      permanently_delete_user_with_validation: {
        Args: { confirmation_email: string; user_id_param: string }
        Returns: Json
      }
      process_company_payment_period: {
        Args: { company_payment_period_id: string }
        Returns: Json
      }
      reassign_load_payment_period: {
        Args: { load_id_param: string; target_company_period_id: string }
        Returns: Json
      }
      reassign_to_payment_period: {
        Args: {
          element_id: string
          element_type: string
          new_period_id: string
          reassigned_by?: string
        }
        Returns: Json
      }
      recalculate_all_historical_periods: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      recalculate_driver_period_deductions: {
        Args: { driver_id_param: string; period_id_param: string }
        Returns: undefined
      }
      recalculate_driver_period_totals: {
        Args: { period_calc_id: string }
        Returns: Json
      }
      recalculate_payment_period_totals: {
        Args: { period_id: string }
        Returns: undefined
      }
      refresh_driver_period_deductions: {
        Args: { driver_id_param: string; period_id_param: string }
        Returns: Json
      }
      report_payment_and_lock: {
        Args: {
          amount_paid: number
          method_id: string
          payment_notes?: string
          period_id: string
          reference_num?: string
        }
        Returns: Json
      }
      require_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      restore_company_document: {
        Args: { document_id: string }
        Returns: Json
      }
      restore_document_with_validation: {
        Args: { document_id_param: string }
        Returns: Json
      }
      simple_load_operation: {
        Args: { load_data: Json; operation_mode?: string; stops_data: Json }
        Returns: Json
      }
      unassign_equipment_with_validation: {
        Args: { assignment_id: string; unassignment_reason?: string }
        Returns: Json
      }
      update_client_with_logo_download: {
        Args: {
          client_data: Json
          client_id_param: string
          external_logo_url?: string
        }
        Returns: Json
      }
      update_company_status_with_validation: {
        Args: {
          new_status: string
          status_reason?: string
          target_company_id: string
        }
        Returns: Json
      }
      update_fuel_expense_with_validation: {
        Args: { expense_id: string; update_data: Json }
        Returns: Json
      }
      update_load_status_with_validation: {
        Args:
          | { load_id_param: string; new_status: string }
          | {
              load_id_param: string
              new_status: string
              status_reason?: string
            }
        Returns: Json
      }
      update_other_income_with_validation: {
        Args: { income_data: Json; income_id: string }
        Returns: Json
      }
      update_user_company_role_with_validation: {
        Args: {
          new_role_data: Json
          target_company_id: string
          target_user_id: string
        }
        Returns: Json
      }
      update_user_role_with_validation: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          status_active?: boolean
          target_company_id: string
          target_user_id: string
        }
        Returns: Json
      }
      use_reset_token: {
        Args: { token_param: string }
        Returns: Json
      }
      user_belongs_to_company: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      user_has_role_in_company: {
        Args: {
          company_id_param: string
          role_param: Database["public"]["Enums"]["user_role"]
          user_id_param: string
        }
        Returns: boolean
      }
      user_is_admin_in_company: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { token_param: string }
        Returns: {
          company_id: string
          company_name: string
          email: string
          expires_at: string
          first_name: string
          invitation_id: string
          is_valid: boolean
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      validate_reset_token: {
        Args: { token_param: string }
        Returns: {
          expires_at: string
          id: string
          is_valid: boolean
          user_email: string
        }[]
      }
    }
    Enums: {
      user_role:
        | "superadmin"
        | "company_owner"
        | "operations_manager"
        | "senior_dispatcher"
        | "dispatcher"
        | "driver"
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
        "superadmin",
        "company_owner",
        "operations_manager",
        "senior_dispatcher",
        "dispatcher",
        "driver",
      ],
    },
  },
} as const
