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
      biblioteka_skladowe_materialy: {
        Row: {
          cena_domyslna: number | null
          created_at: string | null
          dostawca_id: string | null
          id: string
          jednostka: string | null
          lp: number
          nazwa: string
          norma_domyslna: number | null
          pozycja_biblioteka_id: string
          produkt_id: string | null
        }
        Insert: {
          cena_domyslna?: number | null
          created_at?: string | null
          dostawca_id?: string | null
          id?: string
          jednostka?: string | null
          lp?: number
          nazwa: string
          norma_domyslna?: number | null
          pozycja_biblioteka_id: string
          produkt_id?: string | null
        }
        Update: {
          cena_domyslna?: number | null
          created_at?: string | null
          dostawca_id?: string | null
          id?: string
          jednostka?: string | null
          lp?: number
          nazwa?: string
          norma_domyslna?: number | null
          pozycja_biblioteka_id?: string
          produkt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteka_skladowe_materialy_dostawca_id_fkey"
            columns: ["dostawca_id"]
            isOneToOne: false
            referencedRelation: "dostawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteka_skladowe_materialy_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteka_skladowe_materialy_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkty"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteka_skladowe_robocizna: {
        Row: {
          created_at: string | null
          id: string
          jednostka: string | null
          lp: number
          norma_domyslna: number | null
          opis: string
          podwykonawca_id: string | null
          pozycja_biblioteka_id: string
          stawka_domyslna: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jednostka?: string | null
          lp?: number
          norma_domyslna?: number | null
          opis: string
          podwykonawca_id?: string | null
          pozycja_biblioteka_id: string
          stawka_domyslna?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jednostka?: string | null
          lp?: number
          norma_domyslna?: number | null
          opis?: string
          podwykonawca_id?: string | null
          pozycja_biblioteka_id?: string
          stawka_domyslna?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteka_skladowe_robocizna_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteka_skladowe_robocizna_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
        ]
      }
      ceny_dostawcow: {
        Row: {
          aktywny: boolean | null
          cena_netto: number
          created_at: string | null
          dostawca_id: string
          id: string
          produkt_id: string
          updated_at: string | null
        }
        Insert: {
          aktywny?: boolean | null
          cena_netto: number
          created_at?: string | null
          dostawca_id: string
          id?: string
          produkt_id: string
          updated_at?: string | null
        }
        Update: {
          aktywny?: boolean | null
          cena_netto?: number
          created_at?: string | null
          dostawca_id?: string
          id?: string
          produkt_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceny_dostawcow_dostawca_id_fkey"
            columns: ["dostawca_id"]
            isOneToOne: false
            referencedRelation: "dostawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceny_dostawcow_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkty"
            referencedColumns: ["id"]
          },
        ]
      }
      dostawcy: {
        Row: {
          aktywny: boolean | null
          created_at: string | null
          id: string
          kod: string | null
          kontakt: string | null
          nazwa: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          kod?: string | null
          kontakt?: string | null
          nazwa: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          kod?: string | null
          kontakt?: string | null
          nazwa?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dostawcy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kategorie: {
        Row: {
          created_at: string | null
          id: string
          kod: string
          nazwa: string
          organization_id: string | null
          parent_id: string | null
          pelny_kod: string | null
          poziom: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kod: string
          nazwa: string
          organization_id?: string | null
          parent_id?: string | null
          pelny_kod?: string | null
          poziom?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kod?: string
          nazwa?: string
          organization_id?: string | null
          parent_id?: string | null
          pelny_kod?: string | null
          poziom?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kategorie_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kategorie_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["id"]
          },
        ]
      }
      kosztorys_pozycje: {
        Row: {
          created_at: string | null
          id: string
          ilosc: number
          jednostka: string | null
          lp: number
          narzut_percent: number
          nazwa: string
          notatki: string | null
          organization_id: string
          pozycja_biblioteka_id: string | null
          rewizja_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ilosc?: number
          jednostka?: string | null
          lp: number
          narzut_percent?: number
          nazwa: string
          notatki?: string | null
          organization_id: string
          pozycja_biblioteka_id?: string | null
          rewizja_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ilosc?: number
          jednostka?: string | null
          lp?: number
          narzut_percent?: number
          nazwa?: string
          notatki?: string | null
          organization_id?: string
          pozycja_biblioteka_id?: string | null
          rewizja_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kosztorys_pozycje_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      kosztorys_skladowe_materialy: {
        Row: {
          cena: number
          created_at: string | null
          dostawca_id: string | null
          id: string
          ilosc: number | null
          is_manual: boolean
          jednostka: string | null
          kosztorys_pozycja_id: string
          lp: number
          nazwa: string
          norma: number
          produkt_id: string | null
          updated_at: string | null
        }
        Insert: {
          cena: number
          created_at?: string | null
          dostawca_id?: string | null
          id?: string
          ilosc?: number | null
          is_manual?: boolean
          jednostka?: string | null
          kosztorys_pozycja_id: string
          lp?: number
          nazwa: string
          norma?: number
          produkt_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cena?: number
          created_at?: string | null
          dostawca_id?: string | null
          id?: string
          ilosc?: number | null
          is_manual?: boolean
          jednostka?: string | null
          kosztorys_pozycja_id?: string
          lp?: number
          nazwa?: string
          norma?: number
          produkt_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kosztorys_skladowe_materialy_dostawca_id_fkey"
            columns: ["dostawca_id"]
            isOneToOne: false
            referencedRelation: "dostawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_skladowe_materialy_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_skladowe_materialy_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_skladowe_materialy_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkty"
            referencedColumns: ["id"]
          },
        ]
      }
      kosztorys_skladowe_robocizna: {
        Row: {
          created_at: string | null
          id: string
          ilosc: number | null
          is_manual: boolean
          jednostka: string | null
          kosztorys_pozycja_id: string
          lp: number
          norma: number
          opis: string
          podwykonawca_id: string | null
          stawka: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ilosc?: number | null
          is_manual?: boolean
          jednostka?: string | null
          kosztorys_pozycja_id: string
          lp?: number
          norma?: number
          opis: string
          podwykonawca_id?: string | null
          stawka: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ilosc?: number | null
          is_manual?: boolean
          jednostka?: string | null
          kosztorys_pozycja_id?: string
          lp?: number
          norma?: number
          opis?: string
          podwykonawca_id?: string | null
          stawka?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kosztorys_skladowe_robocizna_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_skladowe_robocizna_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_skladowe_robocizna_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
            referencedColumns: ["id"]
          },
        ]
      }
      narzuty_domyslne: {
        Row: {
          branza_kod: Database["public"]["Enums"]["branza_kod"]
          created_at: string | null
          id: string
          narzut_percent: number
          organization_id: string | null
        }
        Insert: {
          branza_kod: Database["public"]["Enums"]["branza_kod"]
          created_at?: string | null
          id?: string
          narzut_percent?: number
          organization_id?: string | null
        }
        Update: {
          branza_kod?: Database["public"]["Enums"]["branza_kod"]
          created_at?: string | null
          id?: string
          narzut_percent?: number
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "narzuty_domyslne_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          nazwa: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nazwa: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nazwa?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      podwykonawcy: {
        Row: {
          aktywny: boolean | null
          created_at: string | null
          id: string
          kontakt: string | null
          nazwa: string
          organization_id: string | null
          specjalizacja: string | null
          updated_at: string | null
        }
        Insert: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          kontakt?: string | null
          nazwa: string
          organization_id?: string | null
          specjalizacja?: string | null
          updated_at?: string | null
        }
        Update: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          kontakt?: string | null
          nazwa?: string
          organization_id?: string | null
          specjalizacja?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podwykonawcy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pozycje_biblioteka: {
        Row: {
          aktywny: boolean | null
          created_at: string | null
          id: string
          jednostka: string
          kategoria_id: string | null
          kod: string
          nazwa: string
          opis: string | null
          organization_id: string | null
          typ: Database["public"]["Enums"]["position_type"] | null
          updated_at: string | null
        }
        Insert: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          jednostka?: string
          kategoria_id?: string | null
          kod: string
          nazwa: string
          opis?: string | null
          organization_id?: string | null
          typ?: Database["public"]["Enums"]["position_type"] | null
          updated_at?: string | null
        }
        Update: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          jednostka?: string
          kategoria_id?: string | null
          kod?: string
          nazwa?: string
          opis?: string | null
          organization_id?: string | null
          typ?: Database["public"]["Enums"]["position_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pozycje_biblioteka_kategoria_id_fkey"
            columns: ["kategoria_id"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pozycje_biblioteka_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      produkty: {
        Row: {
          aktywny: boolean | null
          created_at: string | null
          id: string
          jednostka: string
          kategoria: string | null
          nazwa: string
          organization_id: string | null
          sku: string
          updated_at: string | null
        }
        Insert: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          jednostka?: string
          kategoria?: string | null
          nazwa: string
          organization_id?: string | null
          sku: string
          updated_at?: string | null
        }
        Update: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          jednostka?: string
          kategoria?: string | null
          nazwa?: string
          organization_id?: string | null
          sku?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produkty_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projekty: {
        Row: {
          adres: string | null
          created_at: string | null
          id: string
          klient: string | null
          nazwa: string
          notatki: string | null
          organization_id: string
          powierzchnia: number | null
          slug: string
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Insert: {
          adres?: string | null
          created_at?: string | null
          id?: string
          klient?: string | null
          nazwa: string
          notatki?: string | null
          organization_id: string
          powierzchnia?: number | null
          slug: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Update: {
          adres?: string | null
          created_at?: string | null
          id?: string
          klient?: string | null
          nazwa?: string
          notatki?: string | null
          organization_id?: string
          powierzchnia?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projekty_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rewizje: {
        Row: {
          created_at: string | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          nazwa: string | null
          numer: number
          projekt_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          nazwa?: string | null
          numer: number
          projekt_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          nazwa?: string | null
          numer?: number
          projekt_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewizje_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekty"
            referencedColumns: ["id"]
          },
        ]
      }
      stawki_podwykonawcow: {
        Row: {
          aktywny: boolean | null
          created_at: string | null
          id: string
          podwykonawca_id: string
          pozycja_biblioteka_id: string
          stawka: number
        }
        Insert: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          podwykonawca_id: string
          pozycja_biblioteka_id: string
          stawka: number
        }
        Update: {
          aktywny?: boolean | null
          created_at?: string | null
          id?: string
          podwykonawca_id?: string
          pozycja_biblioteka_id?: string
          stawka?: number
        }
        Relationships: [
          {
            foreignKeyName: "stawki_podwykonawcow_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stawki_podwykonawcow_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kosztorys_pozycje_view: {
        Row: {
          created_at: string | null
          id: string | null
          ilosc: number | null
          jednostka: string | null
          lp: number | null
          m_jednostkowy: number | null
          m_materialy: number | null
          narzut_percent: number | null
          narzut_wartosc: number | null
          nazwa: string | null
          notatki: string | null
          organization_id: string | null
          pozycja_biblioteka_id: string | null
          r_jednostkowy: number | null
          r_plus_m: number | null
          r_robocizna: number | null
          razem: number | null
          rewizja_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kosztorys_pozycje_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kosztorys_pozycje_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      rewizje_summary: {
        Row: {
          created_at: string | null
          id: string | null
          is_locked: boolean | null
          liczba_pozycji: number | null
          locked_at: string | null
          nazwa: string | null
          numer: number | null
          projekt_id: string | null
          suma_m: number | null
          suma_r: number | null
          suma_razem: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rewizje_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekty"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      copy_revision: {
        Args: { new_nazwa?: string; source_rewizja_id: string }
        Returns: string
      }
      get_materialy_aggregated: {
        Args: {
          p_branza?: string
          p_kategoria?: string
          p_limit?: number
          p_offset?: number
          p_podkategoria?: string
          p_search?: string
        }
        Returns: {
          aktywny: boolean
          dostawcy_count: number
          id: string
          jednostka: string
          najlepsza_cena: number
          nazwa: string
          pozycje_count: number
          sku: string
          total_count: number
        }[]
      }
      user_organizations: { Args: never; Returns: string[] }
    }
    Enums: {
      branza_kod: "BUD" | "ELE" | "SAN" | "TEL" | "HVC"
      org_role: "owner" | "admin" | "member"
      position_type: "robocizna" | "material" | "komplet"
      project_status:
        | "draft"
        | "ofertowanie"
        | "realizacja"
        | "zamkniety"
        | "odrzucony"
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
      branza_kod: ["BUD", "ELE", "SAN", "TEL", "HVC"],
      org_role: ["owner", "admin", "member"],
      position_type: ["robocizna", "material", "komplet"],
      project_status: [
        "draft",
        "ofertowanie",
        "realizacja",
        "zamkniety",
        "odrzucony",
      ],
    },
  },
} as const
