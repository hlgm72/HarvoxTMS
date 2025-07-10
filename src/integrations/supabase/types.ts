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
          default_payment_frequency: string | null
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
          payment_cycle_start_day: number | null
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
          default_payment_frequency?: string | null
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
          payment_cycle_start_day?: number | null
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
          default_payment_frequency?: string | null
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
          payment_cycle_start_day?: number | null
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
      company_broker_dispatchers: {
        Row: {
          broker_id: string
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
          broker_id: string
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
          broker_id?: string
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
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "company_brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_brokers: {
        Row: {
          address: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
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
      expense_instances: {
        Row: {
          amount: number
          applied_at: string | null
          applied_by: string | null
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
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_by?: string | null
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
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_by?: string | null
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
            foreignKeyName: "expense_instances_payment_period_id_fkey"
            columns: ["payment_period_id"]
            isOneToOne: false
            referencedRelation: "payment_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_instances_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_expense_templates"
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
            referencedRelation: "recurring_expense_templates"
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
      fuel_expenses: {
        Row: {
          created_at: string
          created_by: string | null
          driver_user_id: string
          fuel_card_number: string | null
          fuel_type: string
          gallons_purchased: number
          id: string
          is_verified: boolean
          notes: string | null
          odometer_reading: number | null
          payment_period_id: string
          price_per_gallon: number
          receipt_url: string | null
          station_address: string | null
          station_name: string | null
          status: string
          total_amount: number
          transaction_date: string
          updated_at: string
          vehicle_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          driver_user_id: string
          fuel_card_number?: string | null
          fuel_type?: string
          gallons_purchased: number
          id?: string
          is_verified?: boolean
          notes?: string | null
          odometer_reading?: number | null
          payment_period_id: string
          price_per_gallon: number
          receipt_url?: string | null
          station_address?: string | null
          station_name?: string | null
          status?: string
          total_amount: number
          transaction_date: string
          updated_at?: string
          vehicle_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          driver_user_id?: string
          fuel_card_number?: string | null
          fuel_type?: string
          gallons_purchased?: number
          id?: string
          is_verified?: boolean
          notes?: string | null
          odometer_reading?: number | null
          payment_period_id?: string
          price_per_gallon?: number
          receipt_url?: string | null
          station_address?: string | null
          station_name?: string | null
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
            foreignKeyName: "fuel_expenses_payment_period_id_fkey"
            columns: ["payment_period_id"]
            isOneToOne: false
            referencedRelation: "payment_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      payment_periods: {
        Row: {
          balance_alert_message: string | null
          created_at: string
          driver_user_id: string
          gross_earnings: number
          has_negative_balance: boolean
          id: string
          net_payment: number
          other_income: number
          period_end_date: string
          period_frequency: string | null
          period_start_date: string
          period_type: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          total_deductions: number
          total_income: number
          updated_at: string
        }
        Insert: {
          balance_alert_message?: string | null
          created_at?: string
          driver_user_id: string
          gross_earnings?: number
          has_negative_balance?: boolean
          id?: string
          net_payment?: number
          other_income?: number
          period_end_date: string
          period_frequency?: string | null
          period_start_date: string
          period_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number
          total_income?: number
          updated_at?: string
        }
        Update: {
          balance_alert_message?: string | null
          created_at?: string
          driver_user_id?: string
          gross_earnings?: number
          has_negative_balance?: boolean
          id?: string
          net_payment?: number
          other_income?: number
          period_end_date?: string
          period_frequency?: string | null
          period_start_date?: string
          period_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          total_deductions?: number
          total_income?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_expenses: {
        Row: {
          amount: number
          applied_to_period_id: string | null
          created_at: string
          driver_user_id: string
          expense_instance_id: string
          id: string
          original_period_id: string
          reason_deferred: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          amount: number
          applied_to_period_id?: string | null
          created_at?: string
          driver_user_id: string
          expense_instance_id: string
          id?: string
          original_period_id: string
          reason_deferred?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          applied_to_period_id?: string | null
          created_at?: string
          driver_user_id?: string
          expense_instance_id?: string
          id?: string
          original_period_id?: string
          reason_deferred?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_expenses_applied_to_period_id_fkey"
            columns: ["applied_to_period_id"]
            isOneToOne: false
            referencedRelation: "payment_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_expenses_expense_instance_id_fkey"
            columns: ["expense_instance_id"]
            isOneToOne: false
            referencedRelation: "expense_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_expenses_original_period_id_fkey"
            columns: ["original_period_id"]
            isOneToOne: false
            referencedRelation: "payment_periods"
            referencedColumns: ["id"]
          },
        ]
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
      recurring_expense_templates: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          driver_user_id: string
          end_date: string | null
          expense_type_id: string
          frequency: string
          id: string
          is_active: boolean
          month_week: number | null
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          driver_user_id: string
          end_date?: string | null
          expense_type_id: string
          frequency: string
          id?: string
          is_active?: boolean
          month_week?: number | null
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          driver_user_id?: string
          end_date?: string | null
          expense_type_id?: string
          frequency?: string
          id?: string
          is_active?: boolean
          month_week?: number | null
          notes?: string | null
          start_date?: string
          updated_at?: string
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
      calculate_fuel_summary_for_period: {
        Args: { period_id: string }
        Returns: {
          total_gallons: number
          total_amount: number
          average_price_per_gallon: number
          transaction_count: number
          pending_amount: number
          approved_amount: number
        }[]
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
