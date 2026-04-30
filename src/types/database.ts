/**
 * Generated type definitions for Supabase
 * These will be updated as the schema evolves
 */
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
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'admin' | 'sales' | 'service' | null
          tenant_id: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'sales' | 'service' | null
          tenant_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'sales' | 'service' | null
          tenant_id?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      error_logs: {
        Row: {
          id: string
          error_message: string
          error_stack: string | null
          component_stack: string | null
          current_url: string | null
          user_id: string | null
          tenant_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          error_message: string
          error_stack?: string | null
          component_stack?: string | null
          current_url?: string | null
          user_id?: string | null
          tenant_id?: string | null
          created_at?: string
        }
      }
    }
    Enums: {
      user_role: 'admin' | 'sales' | 'service'
    }
  }
}
