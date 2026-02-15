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
      admin_invite_codes: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          invite_code: string
          school_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          invite_code?: string
          school_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          invite_code?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_invite_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context_type: string | null
          created_at: string
          credits_used: number
          id: string
          is_archived: boolean | null
          is_pinned: boolean | null
          messages: Json
          related_test_id: string | null
          space_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_type?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          messages?: Json
          related_test_id?: string | null
          space_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_type?: string | null
          created_at?: string
          credits_used?: number
          id?: string
          is_archived?: boolean | null
          is_pinned?: boolean | null
          messages?: Json
          related_test_id?: string | null
          space_id?: string | null
          title?: string | null
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
          {
            foreignKeyName: "ai_conversations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "conversation_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          subject: string
          suggestion_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          subject: string
          suggestion_text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          subject?: string
          suggestion_text?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
          text_content: string | null
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          text_content?: string | null
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          grade_level: string | null
          id: string
          school_id: string | null
          status: string | null
          subject: string | null
          title: string
          total_points: number | null
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          grade_level?: string | null
          id?: string
          school_id?: string | null
          status?: string | null
          subject?: string | null
          title: string
          total_points?: number | null
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          grade_level?: string | null
          id?: string
          school_id?: string | null
          status?: string | null
          subject?: string | null
          title?: string
          total_points?: number | null
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          attendees: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string | null
          grade_level: string | null
          id: string
          location: string | null
          school_id: string | null
          start_time: string
          subject: string | null
          title: string
          tutor_id: string | null
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          grade_level?: string | null
          id?: string
          location?: string | null
          school_id?: string | null
          start_time: string
          subject?: string | null
          title: string
          tutor_id?: string | null
        }
        Update: {
          attendees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string | null
          grade_level?: string | null
          id?: string
          location?: string | null
          school_id?: string | null
          start_time?: string
          subject?: string | null
          title?: string
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_attachments: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          extracted_text: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_spaces: {
        Row: {
          color: string | null
          conversation_count: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          conversation_count?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          conversation_count?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      curriculum_items: {
        Row: {
          created_at: string | null
          description: string | null
          grade_level: string | null
          id: string
          learning_objectives: string[] | null
          order_index: number | null
          resources: Json | null
          school_id: string
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          learning_objectives?: string[] | null
          order_index?: number | null
          resources?: Json | null
          school_id: string
          subject: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          learning_objectives?: string[] | null
          order_index?: number | null
          resources?: Json | null
          school_id?: string
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          card_count: number | null
          cards: Json
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          last_studied_at: string | null
          source: string | null
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_count?: number | null
          cards?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          last_studied_at?: string | null
          source?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_count?: number | null
          cards?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          last_studied_at?: string | null
          source?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_reviews: {
        Row: {
          card_index: number
          deck_id: string
          difficulty: string | null
          id: string
          reviewed_at: string | null
          user_id: string
        }
        Insert: {
          card_index: number
          deck_id: string
          difficulty?: string | null
          id?: string
          reviewed_at?: string | null
          user_id: string
        }
        Update: {
          card_index?: number
          deck_id?: string
          difficulty?: string | null
          id?: string
          reviewed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string | null
          grade_letter: string | null
          grade_value: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          notes: string | null
          school_id: string | null
          student_id: string
          subject: string
          term: string | null
          tutor_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          grade_letter?: string | null
          grade_value?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          school_id?: string | null
          student_id: string
          subject: string
          term?: string | null
          tutor_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          grade_letter?: string | null
          grade_value?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          school_id?: string | null
          student_id?: string
          subject?: string
          term?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          status: string
          student_email: string | null
          student_name: string | null
          student_user_id: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          student_user_id: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          student_email?: string | null
          student_name?: string | null
          student_user_id?: string
          target_id?: string
          target_type?: string
          updated_at?: string
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
      module_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_answers: number | null
          created_at: string
          flagged_questions: Json
          id: string
          module_id: string | null
          module_number: number
          score: number | null
          section: string
          started_at: string
          test_attempt_id: string | null
          time_spent_seconds: number | null
          total_questions: number | null
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          flagged_questions?: Json
          id?: string
          module_id?: string | null
          module_number: number
          score?: number | null
          section: string
          started_at?: string
          test_attempt_id?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string
          flagged_questions?: Json
          id?: string
          module_id?: string | null
          module_number?: number
          score?: number | null
          section?: string
          started_at?: string
          test_attempt_id?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_attempts_test_attempt_id_fkey"
            columns: ["test_attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits_remaining: number
          credits_reset_at: string | null
          email: string
          flashcards_created_today: number
          flashcards_reset_at: string | null
          full_name: string | null
          grade_level: string | null
          id: string
          is_trial: boolean
          learning_style: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed: boolean
          primary_goal: string | null
          questions_reset_at: string | null
          questions_used_today: number
          role: Database["public"]["Enums"]["user_role"]
          study_subjects: Json | null
          tests_remaining: number
          tests_reset_at: string | null
          tier: Database["public"]["Enums"]["pricing_tier"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string | null
          email: string
          flashcards_created_today?: number
          flashcards_reset_at?: string | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          is_trial?: boolean
          learning_style?: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          questions_reset_at?: string | null
          questions_used_today?: number
          role?: Database["public"]["Enums"]["user_role"]
          study_subjects?: Json | null
          tests_remaining?: number
          tests_reset_at?: string | null
          tier?: Database["public"]["Enums"]["pricing_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits_remaining?: number
          credits_reset_at?: string | null
          email?: string
          flashcards_created_today?: number
          flashcards_reset_at?: string | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          is_trial?: boolean
          learning_style?: Database["public"]["Enums"]["learning_style"] | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          questions_reset_at?: string | null
          questions_used_today?: number
          role?: Database["public"]["Enums"]["user_role"]
          study_subjects?: Json | null
          tests_remaining?: number
          tests_reset_at?: string | null
          tier?: Database["public"]["Enums"]["pricing_tier"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
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
          directions: string | null
          id: string
          is_official: boolean
          length: Database["public"]["Enums"]["test_length"]
          module_number: number | null
          questions: Json
          section: string | null
          test_type: string
          time_limit_minutes: number | null
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          directions?: string | null
          id?: string
          is_official?: boolean
          length?: Database["public"]["Enums"]["test_length"]
          module_number?: number | null
          questions?: Json
          section?: string | null
          test_type: string
          time_limit_minutes?: number | null
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["test_difficulty"]
          directions?: string | null
          id?: string
          is_official?: boolean
          length?: Database["public"]["Enums"]["test_length"]
          module_number?: number | null
          questions?: Json
          section?: string | null
          test_type?: string
          time_limit_minutes?: number | null
          time_limit_seconds?: number | null
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
          ai_tier: number
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          monthly_cost: number | null
          name: string
          student_count: number
          teacher_count: number
          tier: Database["public"]["Enums"]["pricing_tier"]
          updated_at: string
        }
        Insert: {
          ai_tier?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          monthly_cost?: number | null
          name: string
          student_count?: number
          teacher_count?: number
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
        }
        Update: {
          ai_tier?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          monthly_cost?: number | null
          name?: string
          student_count?: number
          teacher_count?: number
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      student_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          tutor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tutor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tutor_id?: string
        }
        Relationships: []
      }
      student_points: {
        Row: {
          assignments_completed: number | null
          id: string
          last_activity: string | null
          points: number | null
          school_id: string | null
          streak_days: number | null
          student_id: string
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          assignments_completed?: number | null
          id?: string
          last_activity?: string | null
          points?: number | null
          school_id?: string | null
          streak_days?: number | null
          student_id: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assignments_completed?: number | null
          id?: string
          last_activity?: string | null
          points?: number | null
          school_id?: string | null
          streak_days?: number | null
          student_id?: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_points_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_portfolios: {
        Row: {
          academic_docs: Json
          created_at: string
          essays: string | null
          extracted_data: Json | null
          extracurricular_docs: Json
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_docs?: Json
          created_at?: string
          essays?: string | null
          extracted_data?: Json | null
          extracurricular_docs?: Json
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_docs?: Json
          created_at?: string
          essays?: string | null
          extracted_data?: Json | null
          extracurricular_docs?: Json
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_university_matches: {
        Row: {
          created_at: string
          financial_estimate: Json | null
          id: string
          match_reason: string | null
          match_score: number
          saved: boolean | null
          student_id: string
          university_id: string
        }
        Insert: {
          created_at?: string
          financial_estimate?: Json | null
          id?: string
          match_reason?: string | null
          match_score: number
          saved?: boolean | null
          student_id: string
          university_id: string
        }
        Update: {
          created_at?: string
          financial_estimate?: Json | null
          id?: string
          match_reason?: string | null
          match_score?: number
          saved?: boolean | null
          student_id?: string
          university_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_university_matches_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university_database"
            referencedColumns: ["id"]
          },
        ]
      }
      study_subjects: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          created_at: string
          grade_levels: string[]
          id: string
          school_id: string
          subjects: string[]
          teacher_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_levels?: string[]
          id?: string
          school_id: string
          subjects?: string[]
          teacher_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_levels?: string[]
          id?: string
          school_id?: string
          subjects?: string[]
          teacher_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      test_modules: {
        Row: {
          created_at: string
          difficulty: string | null
          directions: string | null
          id: string
          module_number: number
          questions: Json
          section: string
          test_id: string | null
          time_limit_seconds: number
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          directions?: string | null
          id?: string
          module_number: number
          questions?: Json
          section: string
          test_id?: string | null
          time_limit_seconds: number
          total_questions: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          directions?: string | null
          id?: string
          module_number?: number
          questions?: Json
          section?: string
          test_id?: string | null
          time_limit_seconds?: number
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_modules_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "sat_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_invite_codes: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          tutor_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          tutor_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          tutor_user_id?: string
        }
        Relationships: []
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
      university_database: {
        Row: {
          acceptance_rate: number | null
          admission_requirements: Json | null
          application_deadline: string | null
          avg_sat_score: number | null
          career_outcomes: Json | null
          climate: string | null
          country: string
          created_at: string
          description: string | null
          id: string
          language_of_instruction: string[] | null
          living_cost_monthly: number | null
          location_type: string | null
          logo_url: string | null
          min_grade_requirement: number | null
          name: string
          programs: string[] | null
          ranking_global: number | null
          scholarship_types: Json | null
          student_population: number | null
          tuition_usd: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          admission_requirements?: Json | null
          application_deadline?: string | null
          avg_sat_score?: number | null
          career_outcomes?: Json | null
          climate?: string | null
          country: string
          created_at?: string
          description?: string | null
          id?: string
          language_of_instruction?: string[] | null
          living_cost_monthly?: number | null
          location_type?: string | null
          logo_url?: string | null
          min_grade_requirement?: number | null
          name: string
          programs?: string[] | null
          ranking_global?: number | null
          scholarship_types?: Json | null
          student_population?: number | null
          tuition_usd?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          admission_requirements?: Json | null
          application_deadline?: string | null
          avg_sat_score?: number | null
          career_outcomes?: Json | null
          climate?: string | null
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          language_of_instruction?: string[] | null
          living_cost_monthly?: number | null
          location_type?: string | null
          logo_url?: string | null
          min_grade_requirement?: number | null
          name?: string
          programs?: string[] | null
          ranking_global?: number | null
          scholarship_types?: Json | null
          student_population?: number | null
          tuition_usd?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      university_preferences: {
        Row: {
          budget_monthly: number | null
          can_work_part_time: string | null
          climate_preference: string | null
          created_at: string
          diversity_importance: string | null
          fields_of_interest: string[] | null
          graduation_year: number | null
          id: string
          international_support: string | null
          language_of_instruction: string[] | null
          needs_on_campus_housing: string | null
          preferred_countries: string[] | null
          ranking_importance: string | null
          research_importance: string | null
          scholarship_need: string | null
          social_life_preference: string | null
          student_id: string
          teaching_style: string | null
          university_size: string | null
          updated_at: string
        }
        Insert: {
          budget_monthly?: number | null
          can_work_part_time?: string | null
          climate_preference?: string | null
          created_at?: string
          diversity_importance?: string | null
          fields_of_interest?: string[] | null
          graduation_year?: number | null
          id?: string
          international_support?: string | null
          language_of_instruction?: string[] | null
          needs_on_campus_housing?: string | null
          preferred_countries?: string[] | null
          ranking_importance?: string | null
          research_importance?: string | null
          scholarship_need?: string | null
          social_life_preference?: string | null
          student_id: string
          teaching_style?: string | null
          university_size?: string | null
          updated_at?: string
        }
        Update: {
          budget_monthly?: number | null
          can_work_part_time?: string | null
          climate_preference?: string | null
          created_at?: string
          diversity_importance?: string | null
          fields_of_interest?: string[] | null
          graduation_year?: number | null
          id?: string
          international_support?: string | null
          language_of_instruction?: string[] | null
          needs_on_campus_housing?: string | null
          preferred_countries?: string[] | null
          ranking_importance?: string | null
          research_importance?: string | null
          scholarship_need?: string | null
          social_life_preference?: string | null
          student_id?: string
          teaching_style?: string | null
          university_size?: string | null
          updated_at?: string
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
      check_trial_expiration: { Args: never; Returns: undefined }
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
      is_school_admin: {
        Args: { school_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_school_member: {
        Args: { school_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_school_student: { Args: { _user_id: string }; Returns: boolean }
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
      pricing_tier: "tier_0" | "tier_1" | "tier_2" | "tier_3"
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
      pricing_tier: ["tier_0", "tier_1", "tier_2", "tier_3"],
      test_difficulty: ["easy", "normal", "hard"],
      test_length: ["quick", "short", "medium", "long", "full"],
      user_role: ["student", "tutor", "teacher", "school_admin"],
    },
  },
} as const
