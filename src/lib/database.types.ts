export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      habit_completions: {
        Row: {
          actual_date: string
          created_at: string
          day_number: number | null
          habit_id: string
          id: string
          is_completed: boolean
          user_id: string
        }
        Insert: {
          actual_date: string
          created_at?: string
          day_number?: number | null
          habit_id: string
          id?: string
          is_completed?: boolean
          user_id: string
        }
        Update: {
          actual_date?: string
          created_at?: string
          day_number?: number | null
          habit_id?: string
          id?: string
          is_completed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          habit_name: string
          id: string
          mandala_id: string | null
          updated_at: string
          user_id: string
          weekly_goal: number | null
        }
        Insert: {
          created_at?: string
          habit_name: string
          id?: string
          mandala_id?: string | null
          updated_at?: string
          user_id: string
          weekly_goal?: number | null
        }
        Update: {
          created_at?: string
          habit_name?: string
          id?: string
          mandala_id?: string | null
          updated_at?: string
          user_id?: string
          weekly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_mandala_id_fkey"
            columns: ["mandala_id"]
            isOneToOne: false
            referencedRelation: "mandalas"
            referencedColumns: ["id"]
          },
        ]
      }
      mandala_intentions: {
        Row: {
          cadence: string
          created_at: string
          id: string
          intention: string | null
          mandala_id: string
          period: number
        }
        Insert: {
          cadence: string
          created_at?: string
          id?: string
          intention?: string | null
          mandala_id: string
          period: number
        }
        Update: {
          cadence?: string
          created_at?: string
          id?: string
          intention?: string | null
          mandala_id?: string
          period?: number
        }
        Relationships: [
          {
            foreignKeyName: "mandala_intentions_mandala_id_fkey"
            columns: ["mandala_id"]
            isOneToOne: false
            referencedRelation: "mandalas"
            referencedColumns: ["id"]
          },
        ]
      }
      mandala_types: {
        Row: {
          created_at: string
          duration: string
          is_active: boolean
          label: string
          segment_count: number | null
          segment_unit: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          duration: string
          is_active?: boolean
          label: string
          segment_count?: number | null
          segment_unit: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          duration?: string
          is_active?: boolean
          label?: string
          segment_count?: number | null
          segment_unit?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      mandalas: {
        Row: {
          color_petal: string | null
          color_theme: string | null
          created_at: string
          figure_choice: string | null
          id: string
          mandala_name: string
          start_date: string | null
          type_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_petal?: string | null
          color_theme?: string | null
          created_at?: string
          figure_choice?: string | null
          id?: string
          mandala_name: string
          start_date?: string | null
          type_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_petal?: string | null
          color_theme?: string | null
          created_at?: string
          figure_choice?: string | null
          id?: string
          mandala_name?: string
          start_date?: string | null
          type_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandalas_type_slug_fkey"
            columns: ["type_slug"]
            isOneToOne: false
            referencedRelation: "mandala_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      messages: {
        Row: {
          answered_at: string | null
          body: string
          created_at: string
          direction: string
          dry_run: boolean
          id: string
          kind: string
          message_sid: string | null
          part: number | null
          prompt_index: number | null
          subscriber_id: string
        }
        Insert: {
          answered_at?: string | null
          body?: string
          created_at?: string
          direction: string
          dry_run?: boolean
          id?: string
          kind: string
          message_sid?: string | null
          part?: number | null
          prompt_index?: number | null
          subscriber_id: string
        }
        Update: {
          answered_at?: string | null
          body?: string
          created_at?: string
          direction?: string
          dry_run?: boolean
          id?: string
          kind?: string
          message_sid?: string | null
          part?: number | null
          prompt_index?: number | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "sms_subscribers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          category: string
          created_at: string
          id: string
          index: number
          multiprompt: number | null
          part: number
          reward_media_key: string | null
          text: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          index: number
          multiprompt?: number | null
          part?: number
          reward_media_key?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          index?: number
          multiprompt?: number | null
          part?: number
          reward_media_key?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts_audit: {
        Row: {
          auth_uid: string | null
          changed_at: string
          changed_by: string
          id: number
          new_row: Json | null
          old_row: Json
          operation: string
          prompt_id: string
        }
        Insert: {
          auth_uid?: string | null
          changed_at?: string
          changed_by?: string
          id?: never
          new_row?: Json | null
          old_row: Json
          operation: string
          prompt_id: string
        }
        Update: {
          auth_uid?: string | null
          changed_at?: string
          changed_by?: string
          id?: never
          new_row?: Json | null
          old_row?: Json
          operation?: string
          prompt_id?: string
        }
        Relationships: []
      }
      sms_consents: {
        Row: {
          consent_text: string
          consent_version: string
          created_at: string
          id: string
          phone: string
          source: string
          stripe_checkout_session_id: string | null
          user_id: string
        }
        Insert: {
          consent_text: string
          consent_version: string
          created_at?: string
          id?: string
          phone: string
          source: string
          stripe_checkout_session_id?: string | null
          user_id: string
        }
        Update: {
          consent_text?: string
          consent_version?: string
          created_at?: string
          id?: string
          phone?: string
          source?: string
          stripe_checkout_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sms_subscribers: {
        Row: {
          consent_confirmed_at: string | null
          created_at: string
          current_prompt_index: number
          display_name: string | null
          pending_multiprompt_part: number | null
          phone: string
          seed: number
          send_hour: number
          send_hours: number[]
          sms_opted_out_at: string | null
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          subscription_status: string
          texts_per_week: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_confirmed_at?: string | null
          created_at?: string
          current_prompt_index?: number
          display_name?: string | null
          pending_multiprompt_part?: number | null
          phone: string
          seed?: number
          send_hour?: number
          send_hours?: number[]
          sms_opted_out_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          texts_per_week?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_confirmed_at?: string | null
          created_at?: string
          current_prompt_index?: number
          display_name?: string | null
          pending_multiprompt_part?: number | null
          phone?: string
          seed?: number
          send_hour?: number
          send_hours?: number[]
          sms_opted_out_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          texts_per_week?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          share_scope: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          share_scope?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          share_scope?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      prompt_category_counts: {
        Row: {
          category: string | null
          category_ordinal: number | null
          growth_count: number | null
          index: number | null
          inward_count: number | null
          outward_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_team: { Args: { target_team_id: string }; Returns: boolean }
      can_view_user_data: { Args: { target_user_id: string }; Returns: boolean }
      is_team_member: { Args: { target_team_id: string }; Returns: boolean }
      trigger_daily_sms_send: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

