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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_invoice_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_invoice_id?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_invoice_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_records: {
        Row: {
          cgst: number
          created_at: string
          filing_period: string | null
          id: string
          igst: number
          invoice_date: string | null
          invoice_number: string
          sgst: number
          source: string
          taxable_amount: number
          total_amount: number
          user_id: string
          vendor_gstin: string
          vendor_name: string | null
        }
        Insert: {
          cgst?: number
          created_at?: string
          filing_period?: string | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number: string
          sgst?: number
          source?: string
          taxable_amount?: number
          total_amount?: number
          user_id: string
          vendor_gstin: string
          vendor_name?: string | null
        }
        Update: {
          cgst?: number
          created_at?: string
          filing_period?: string | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string
          sgst?: number
          source?: string
          taxable_amount?: number
          total_amount?: number
          user_id?: string
          vendor_gstin?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          buyer_gstin: string | null
          cgst: number
          confidence_score: number | null
          created_at: string
          file_path: string | null
          fraud_flags: Json | null
          id: string
          igst: number
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: string
          raw_ocr_text: string | null
          sgst: number
          status: string
          taxable_amount: number
          total_amount: number
          updated_at: string
          user_id: string
          validation_issues: Json | null
          vendor_gstin: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          buyer_gstin?: string | null
          cgst?: number
          confidence_score?: number | null
          created_at?: string
          file_path?: string | null
          fraud_flags?: Json | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string
          raw_ocr_text?: string | null
          sgst?: number
          status?: string
          taxable_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
          validation_issues?: Json | null
          vendor_gstin?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          buyer_gstin?: string | null
          cgst?: number
          confidence_score?: number | null
          created_at?: string
          file_path?: string | null
          fraud_flags?: Json | null
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: string
          raw_ocr_text?: string | null
          sgst?: number
          status?: string
          taxable_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          validation_issues?: Json | null
          vendor_gstin?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reconciliation_results: {
        Row: {
          created_at: string
          difference: Json | null
          gst_record_id: string | null
          id: string
          invoice_id: string | null
          match_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difference?: Json | null
          gst_record_id?: string | null
          id?: string
          invoice_id?: string | null
          match_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difference?: Json | null
          gst_record_id?: string | null
          id?: string
          invoice_id?: string | null
          match_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_results_gst_record_id_fkey"
            columns: ["gst_record_id"]
            isOneToOne: false
            referencedRelation: "gst_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_results_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          created_at: string
          filing_consistency: number
          gstin: string | null
          id: string
          matched_invoices: number
          mismatch_rate: number
          name: string
          risk_level: string
          risk_score: number
          total_invoices: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filing_consistency?: number
          gstin?: string | null
          id?: string
          matched_invoices?: number
          mismatch_rate?: number
          name: string
          risk_level?: string
          risk_score?: number
          total_invoices?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filing_consistency?: number
          gstin?: string | null
          id?: string
          matched_invoices?: number
          mismatch_rate?: number
          name?: string
          risk_level?: string
          risk_score?: number
          total_invoices?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
