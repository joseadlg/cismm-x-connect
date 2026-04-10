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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_sessions: {
        Row: {
          day: string | null
          description: string | null
          end_time: string
          id: number
          room: string | null
          start_time: string
          title: string
          track: string | null
        }
        Insert: {
          day?: string | null
          description?: string | null
          end_time: string
          id?: number
          room?: string | null
          start_time: string
          title: string
          track?: string | null
        }
        Update: {
          day?: string | null
          description?: string | null
          end_time?: string
          id?: number
          room?: string | null
          start_time?: string
          title?: string
          track?: string | null
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          description: string | null
          exhibitor_id: number | null
          id: number
          time: string
          title: string
        }
        Insert: {
          description?: string | null
          exhibitor_id?: number | null
          id?: number
          time: string
          title: string
        }
        Update: {
          description?: string | null
          exhibitor_id?: number | null
          id?: number
          time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_sessions_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_sessions_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "top_exhibitors"
            referencedColumns: ["exhibitor_id"]
          },
        ]
      }
      exhibitor_categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      exhibitors: {
        Row: {
          category_id: number | null
          contact: string | null
          description: string | null
          id: number
          logo_url: string | null
          name: string
          stand_number: string | null
          website: string | null
        }
        Insert: {
          category_id?: number | null
          contact?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          name: string
          stand_number?: string | null
          website?: string | null
        }
        Update: {
          category_id?: number | null
          contact?: string | null
          description?: string | null
          id?: number
          logo_url?: string | null
          name?: string
          stand_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exhibitor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: string | null
          category: string | null
          content: string
          created_at: string | null
          id: number
          title: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          author_role?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: number
          title: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          device_id: string | null
          email: string | null
          exhibitor_id: number | null
          id: string
          interests: Json | null
          max_devices: number | null
          name: string
          phone: string | null
          photo_url: string | null
          points: number | null
          registered_devices: string[] | null
          role: string
          title: string | null
          track: string | null
        }
        Insert: {
          company?: string | null
          device_id?: string | null
          email?: string | null
          exhibitor_id?: number | null
          id: string
          interests?: Json | null
          max_devices?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          points?: number | null
          registered_devices?: string[] | null
          role: string
          title?: string | null
          track?: string | null
        }
        Update: {
          company?: string | null
          device_id?: string | null
          email?: string | null
          exhibitor_id?: number | null
          id?: string
          interests?: Json | null
          max_devices?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          points?: number | null
          registered_devices?: string[] | null
          role?: string
          title?: string | null
          track?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile_exhibitor"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profile_exhibitor"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "top_exhibitors"
            referencedColumns: ["exhibitor_id"]
          },
        ]
      }
      session_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          rating: number
          session_id: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: number
          rating: number
          session_id?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: number
          rating?: number
          session_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "top_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_speakers: {
        Row: {
          session_id: number
          speaker_id: number
        }
        Insert: {
          session_id: number
          speaker_id: number
        }
        Update: {
          session_id?: number
          speaker_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "top_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          bio: string | null
          company: string | null
          id: number
          name: string
          photo_url: string | null
          social_linkedin: string | null
          social_twitter: string | null
          title: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          id?: number
          name: string
          photo_url?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          title?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          id?: number
          name?: string
          photo_url?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          title?: string | null
        }
        Relationships: []
      }
      user_agenda: {
        Row: {
          created_at: string | null
          session_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          session_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          session_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agenda_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agenda_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "top_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "user_agenda_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts_log: {
        Row: {
          contact_id: string | null
          created_at: string
          id: number
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_contacts_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contacts_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_checkins: {
        Row: {
          created_at: string | null
          session_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          session_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          session_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_session_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agenda_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_session_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "top_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "user_session_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_visited_exhibitors: {
        Row: {
          created_at: string | null
          exhibitor_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exhibitor_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          exhibitor_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_visited_exhibitors_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "exhibitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_visited_exhibitors_exhibitor_id_fkey"
            columns: ["exhibitor_id"]
            isOneToOne: false
            referencedRelation: "top_exhibitors"
            referencedColumns: ["exhibitor_id"]
          },
          {
            foreignKeyName: "user_visited_exhibitors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      top_exhibitors: {
        Row: {
          exhibitor_id: number | null
          name: string | null
          visits: number | null
        }
        Relationships: []
      }
      top_sessions: {
        Row: {
          checkins: number | null
          session_id: number | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_mutual_contact: {
        Args: {
          target_user_id: string
        }
        Returns: Json
      }
      get_peak_activity_hours: {
        Args: never
        Returns: {
          activity_count: number
          activity_hour: string
        }[]
      }
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
