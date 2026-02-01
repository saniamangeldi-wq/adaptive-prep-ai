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
      ai_conversations: {
        Row: {
          context_type: string | null
          created_at: string
          credits_used: number
          id: string
          messages: Json
          related_test_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          messages?: Json
          related_test_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          messages?: Json
          related_test_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_related_test_id_fkey"
            columns: ["related_test_id"]
            isOneToOne: false
            referencedRelation: "sat_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          cards: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          source: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cards?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          source?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cards?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          source?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_style_responses: {
        Row: {
          calculated_style: Database["public"]["Enums"]["learning_style"] | null
          confidence_scores: Json | null
          created_at: string
          id: string
          responses: Json
          user_id: string
        }
        Insert: {
          calculated_style?:
            | Database["public"]["Enums"]["learning_style"]
            | null
          confidence_scores?: Json | null
          created_at?: string
          id?: string
          responses?: Json
          user_id: string
        }
        Update: {
          calculated_style?:
            | Database["public"]["Enums"]["learning_style"]
            | null
          confidence_scores?: Json | null
          created_at?: string
          id?: string
          responses?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits_remaining: number
          credits_reset_at: string | null
          email: string
          full_name: string | null
          id: string
          learning_style: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          tests_remaining: number
          tests_reset_at: string | null
          tier: Database["public"]["Enums"]["pricing_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          learning_style?: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          tests_remaining?: number
          tests_reset_at?: string | null
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          learning_style?: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          tests_remaining?: number
          tests_reset_at?: string | null
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sat_tests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["test_difficulty"]
          id: string
          is_official: boolean
          length: Database["public"]["Enums"]["test_length"]
          questions: Json
          test_type: string
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          id?: string
          is_official?: boolean
          length?: Database["public"]["Enums"]["test_length"]
          questions?: Json
          test_type: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          id?: string
          is_official?: boolean
          length?: Database["public"]["Enums"]["test_length"]
          questions?: Json
          test_type?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
          tier: Database["public"]["Enums"]["pricing_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name: string
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      teacher_students: {
        Row: {
          created_at: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          feedback: Json | null
          id: string
          score: number | null
          started_at: string
          test_id: string
          time_spent_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          feedback?: Json | null
          id?: string
          score?: number | null
          started_at?: string
          test_id: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          feedback?: Json | null
          id?: string
          score?: number | null
          started_at?: string
          test_id?: string
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "sat_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_students: {
        Row: {
          created_at: string
          id: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
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
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_same_school: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      is_teacher_of_student: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: boolean
      }
      is_tutor_of_student: {
        Args: { _student_id: string; _tutor_id: string }
        Returns: boolean
      }
    }
    Enums: {
      learning_style: "visual" | "auditory" | "reading_writing" | "kinesthetic"
      pricing_tier: "tier_1" | "tier_2" | "tier_3"
      test_difficulty: "easy" | "normal" | "hard"
      test_length: "quick" | "short" | "medium" | "long" | "full"
      user_role: "student" | "tutor" | "teacher" | "school_admin"
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
      learning_style: ["visual", "auditory", "reading_writing", "kinesthetic"],
      pricing_tier: ["tier_1", "tier_2", "tier_3"],
      test_difficulty: ["easy", "normal", "hard"],
      test_length: ["quick", "short", "medium", "long", "full"],
      user_role: ["student", "tutor", "teacher", "school_admin"],
    },
  },
} as const
