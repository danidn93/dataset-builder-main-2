<<<<<<< HEAD
Need to install the following packages:
supabase@2.63.1
Ok to proceed? (y) 
=======
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analisis_comentarios: {
        Row: {
          carrera_nombre: string | null
          comentario_negativo: string | null
          comentario_positivo: string | null
          created_at: string | null
          facultad_nombre: string | null
          id: string
          recomendaciones: string | null
          version_id: string
        }
        Insert: {
          carrera_nombre?: string | null
          comentario_negativo?: string | null
          comentario_positivo?: string | null
          created_at?: string | null
          facultad_nombre?: string | null
          id?: string
          recomendaciones?: string | null
          version_id: string
        }
        Update: {
          carrera_nombre?: string | null
          comentario_negativo?: string | null
          comentario_positivo?: string | null
          created_at?: string | null
          facultad_nombre?: string | null
          id?: string
          recomendaciones?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analisis_comentarios_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      carreras: {
        Row: {
          codigo: string | null
          created_at: string
          facultad_id: string
          id: string
          nombre: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          facultad_id: string
          id?: string
          nombre: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          facultad_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "carreras_facultad_id_fkey"
            columns: ["facultad_id"]
            isOneToOne: false
            referencedRelation: "facultades"
            referencedColumns: ["id"]
          },
        ]
      }
<<<<<<< HEAD
      dataset_analysis: {
        Row: {
          conteo: Json
          created_at: string | null
          global: number
          id: string
          porcentajes: Json
          version_id: string | null
        }
        Insert: {
          conteo: Json
          created_at?: string | null
          global: number
          id?: string
          porcentajes: Json
          version_id?: string | null
        }
        Update: {
          conteo?: Json
          created_at?: string | null
          global?: number
          id?: string
          porcentajes?: Json
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_analysis_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_rows: {
        Row: {
          created_at: string | null
          data: Json | null
          id: number
          version_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: never
          version_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: never
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_rows_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_versions: {
        Row: {
          col_carrera: string | null
          col_criterios: string[] | null
          col_facultad: string | null
          comentarios_column: string | null
          created_at: string
          dataset_id: string
          file_path: string
          id: string
          periodo: string
          total_columns: number | null
          total_rows: number | null
          version_number: number
        }
        Insert: {
          col_carrera?: string | null
          col_criterios?: string[] | null
          col_facultad?: string | null
          comentarios_column?: string | null
          created_at?: string
          dataset_id: string
          file_path: string
          id?: string
          periodo: string
          total_columns?: number | null
          total_rows?: number | null
          version_number: number
        }
        Update: {
          col_carrera?: string | null
          col_criterios?: string[] | null
          col_facultad?: string | null
          comentarios_column?: string | null
          created_at?: string
          dataset_id?: string
          file_path?: string
          id?: string
          periodo?: string
          total_columns?: number | null
          total_rows?: number | null
=======
      dataset_versions: {
        Row: {
          comentarios_column: string | null
          created_at: string
          data: Json
          dataset_id: string
          file_path: string
          id: string
          version_number: number
        }
        Insert: {
          comentarios_column?: string | null
          created_at?: string
          data: Json
          dataset_id: string
          file_path: string
          id?: string
          version_number: number
        }
        Update: {
          comentarios_column?: string | null
          created_at?: string
          data?: Json
          dataset_id?: string
          file_path?: string
          id?: string
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_versions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
<<<<<<< HEAD
          periodo: string
=======
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
<<<<<<< HEAD
          periodo: string
=======
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
<<<<<<< HEAD
          periodo?: string
=======
>>>>>>> 20f347d6bf4a2bc89fc1bb812bdf4c6aae84fada
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      facultades: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          carrera_id: string | null
          charts: Json | null
          created_at: string
          dataset_id: string | null
          expires_at: string | null
          facultad_id: string | null
          filters: Json | null
          id: string
          link_type: string
          token: string
          version_id: string | null
        }
        Insert: {
          carrera_id?: string | null
          charts?: Json | null
          created_at?: string
          dataset_id?: string | null
          expires_at?: string | null
          facultad_id?: string | null
          filters?: Json | null
          id?: string
          link_type: string
          token: string
          version_id?: string | null
        }
        Update: {
          carrera_id?: string | null
          charts?: Json | null
          created_at?: string
          dataset_id?: string | null
          expires_at?: string | null
          facultad_id?: string | null
          filters?: Json | null
          id?: string
          link_type?: string
          token?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carreras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_facultad_id_fkey"
            columns: ["facultad_id"]
            isOneToOne: false
            referencedRelation: "facultades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
