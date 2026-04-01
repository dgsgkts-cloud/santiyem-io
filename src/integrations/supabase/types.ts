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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          page_number: number
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          id?: string
          page_number?: number
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_path: string | null
          file_size: number
          id: string
          name: string
          page_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_size?: number
          id?: string
          name: string
          page_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_size?: number
          id?: string
          name?: string
          page_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          contact: string
          created_at: string
          description: string
          floor_info: string | null
          id: string
          listing_type: string
          media_urls: Json | null
          parcel_ada: string | null
          parcel_area_sqm: number | null
          parcel_center_lat: number | null
          parcel_center_lng: number | null
          parcel_coords: Json | null
          parcel_il: string | null
          parcel_ilce: string | null
          parcel_parsel: string | null
          price: number
          property_type: string | null
          rooms: string | null
          sqm: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
          video_status: string | null
          video_url: string | null
        }
        Insert: {
          contact?: string
          created_at?: string
          description?: string
          floor_info?: string | null
          id?: string
          listing_type?: string
          media_urls?: Json | null
          parcel_ada?: string | null
          parcel_area_sqm?: number | null
          parcel_center_lat?: number | null
          parcel_center_lng?: number | null
          parcel_coords?: Json | null
          parcel_il?: string | null
          parcel_ilce?: string | null
          parcel_parsel?: string | null
          price?: number
          property_type?: string | null
          rooms?: string | null
          sqm?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          video_status?: string | null
          video_url?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          description?: string
          floor_info?: string | null
          id?: string
          listing_type?: string
          media_urls?: Json | null
          parcel_ada?: string | null
          parcel_area_sqm?: number | null
          parcel_center_lat?: number | null
          parcel_center_lng?: number | null
          parcel_coords?: Json | null
          parcel_il?: string | null
          parcel_ilce?: string | null
          parcel_parsel?: string | null
          price?: number
          property_type?: string | null
          rooms?: string | null
          sqm?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_status?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      office_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      office_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      office_teams: {
        Row: {
          created_at: string
          id: string
          max_members: number
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_members?: number
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_members?: number
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          plan: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_hakedis: {
        Row: {
          amount: number
          created_at: string
          id: string
          kdv: number
          net: number
          period: string
          project_id: string
          status: string
          status_color: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kdv?: number
          net?: number
          period: string
          project_id: string
          status?: string
          status_color?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kdv?: number
          net?: number
          period?: string
          project_id?: string
          status?: string
          status_color?: string
          user_id?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          milestone_date: string
          project_id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          milestone_date?: string
          project_id: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          milestone_date?: string
          project_id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: string
          client: string
          created_at: string
          description: string
          end_date: string
          id: string
          location: string
          manager: string
          name: string
          progress: number
          site_responsible: string
          start_date: string
          status: string
          status_color: string
          user_id: string
        }
        Insert: {
          budget?: string
          client?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          location?: string
          manager?: string
          name: string
          progress?: number
          site_responsible?: string
          start_date?: string
          status?: string
          status_color?: string
          user_id: string
        }
        Update: {
          budget?: string
          client?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          location?: string
          manager?: string
          name?: string
          progress?: number
          site_responsible?: string
          start_date?: string
          status?: string
          status_color?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          created_at: string
          done: boolean
          id: string
          note: string | null
          reminder_date: string
          title: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          reminder_date: string
          title: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          reminder_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          sort_order: number
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          sort_order?: number
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          sort_order?: number
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "office_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calculations: {
        Row: {
          calc_title: string
          calc_type: string
          created_at: string
          id: string
          input_data: Json
          result_data: Json
          user_id: string
        }
        Insert: {
          calc_title: string
          calc_type: string
          created_at?: string
          id?: string
          input_data?: Json
          result_data?: Json
          user_id: string
        }
        Update: {
          calc_title?: string
          calc_type?: string
          created_at?: string
          id?: string
          input_data?: Json
          result_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_renders: {
        Row: {
          created_at: string
          id: string
          prompt: string
          result_image_url: string | null
          result_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          result_image_url?: string | null
          result_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          result_image_url?: string | null
          result_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_team_resource: {
        Args: { _accessor_id: string; _owner_id: string }
        Returns: boolean
      }
      check_pending_invitations: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      get_user_team_id: { Args: { _user_id: string }; Returns: string }
      is_same_team: {
        Args: { _user_id_a: string; _user_id_b: string }
        Returns: boolean
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
