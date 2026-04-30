export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          is_active: boolean
          archive_after_months: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          is_active?: boolean
          archive_after_months?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          is_active?: boolean
          archive_after_months?: number
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_types: {
        Row: {
          id: string
          tenant_id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      vehicle_models: {
        Row: {
          id: string
          tenant_id: string
          type_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          type_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_variants: {
        Row: {
          id: string
          tenant_id: string
          model_id: string
          name: string
          sku: string | null
          status: string
          specs: Json
          service_interval_km: number | null
          service_interval_months: number | null
          warranty_vehicle_yrs: number | null
          warranty_battery_yrs: number | null
          warranty_motor_yrs: number | null
          launched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          model_id: string
          name: string
          sku?: string | null
          status?: string
          specs?: Json
          service_interval_km?: number | null
          service_interval_months?: number | null
          warranty_vehicle_yrs?: number | null
          warranty_battery_yrs?: number | null
          warranty_motor_yrs?: number | null
          launched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          model_id?: string
          name?: string
          sku?: string | null
          status?: string
          specs?: Json
          service_interval_km?: number | null
          service_interval_months?: number | null
          warranty_vehicle_yrs?: number | null
          warranty_battery_yrs?: number | null
          warranty_motor_yrs?: number | null
          launched_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          phone: string
          email: string | null
          address: string | null
          city: string | null
          customer_type: string
          fleet_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          phone: string
          email?: string | null
          address?: string | null
          city?: string | null
          customer_type: string
          fleet_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          phone?: string
          email?: string | null
          address?: string | null
          city?: string | null
          customer_type?: string
          fleet_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          tenant_id: string
          variant_id: string
          customer_id: string
          vehicle_number: string
          chassis_number: string | null
          registration_plate: string | null
          sale_date: string
          sale_notes: string | null
          status: string
          is_archived: boolean
          archive_key: string | null
          archived_at: string | null
          last_service_date: string | null
          total_service_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          variant_id: string
          customer_id: string
          vehicle_number: string
          chassis_number?: string | null
          registration_plate?: string | null
          sale_date: string
          sale_notes?: string | null
          status?: string
          is_archived?: boolean
          archive_key?: string | null
          archived_at?: string | null
          last_service_date?: string | null
          total_service_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          variant_id?: string
          customer_id?: string
          vehicle_number?: string
          chassis_number?: string | null
          registration_plate?: string | null
          sale_date?: string
          sale_notes?: string | null
          status?: string
          is_archived?: boolean
          archive_key?: string | null
          archived_at?: string | null
          last_service_date?: string | null
          total_service_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      service_records: {
        Row: {
          id: string
          tenant_id: string
          vehicle_id: string
          visit_date: string
          mileage_at_visit: number | null
          visit_type: string
          complaint: string | null
          diagnosis: string | null
          work_done: string | null
          technician_name: string | null
          next_service_km: number | null
          next_service_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          vehicle_id: string
          visit_date: string
          mileage_at_visit?: number | null
          visit_type: string
          complaint?: string | null
          diagnosis?: string | null
          work_done?: string | null
          technician_name?: string | null
          next_service_km?: number | null
          next_service_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          vehicle_id?: string
          visit_date?: string
          mileage_at_visit?: number | null
          visit_type?: string
          complaint?: string | null
          diagnosis?: string | null
          work_done?: string | null
          technician_name?: string | null
          next_service_km?: number | null
          next_service_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
