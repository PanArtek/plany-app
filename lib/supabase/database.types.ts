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
          cena_robocizny: number
          cena_robocizny_zrodlo:
            | Database["public"]["Enums"]["cena_robocizny_zrodlo"]
            | null
          cena_robocizny_zrodlowa: number | null
          created_at: string | null
          id: string
          ilosc: number
          jednostka: string | null
          lp: number
          narzut_percent: number
          nazwa: string
          notatki: string | null
          organization_id: string
          podwykonawca_id: string | null
          pozycja_biblioteka_id: string | null
          rewizja_id: string
          updated_at: string | null
        }
        Insert: {
          cena_robocizny?: number
          cena_robocizny_zrodlo?:
            | Database["public"]["Enums"]["cena_robocizny_zrodlo"]
            | null
          cena_robocizny_zrodlowa?: number | null
          created_at?: string | null
          id?: string
          ilosc?: number
          jednostka?: string | null
          lp: number
          narzut_percent?: number
          nazwa: string
          notatki?: string | null
          organization_id: string
          podwykonawca_id?: string | null
          pozycja_biblioteka_id?: string | null
          rewizja_id: string
          updated_at?: string | null
        }
        Update: {
          cena_robocizny?: number
          cena_robocizny_zrodlo?:
            | Database["public"]["Enums"]["cena_robocizny_zrodlo"]
            | null
          cena_robocizny_zrodlowa?: number | null
          created_at?: string | null
          id?: string
          ilosc?: number
          jednostka?: string | null
          lp?: number
          narzut_percent?: number
          nazwa?: string
          notatki?: string | null
          organization_id?: string
          podwykonawca_id?: string | null
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
            foreignKeyName: "kosztorys_pozycje_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
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
          cena_robocizny: number | null
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
          cena_robocizny?: number | null
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
          cena_robocizny?: number | null
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
          accepted_rewizja_id: string | null
          adres: string | null
          created_at: string | null
          id: string
          klient: string | null
          nazwa: string
          notatki: string | null
          organization_id: string
          powierzchnia: number | null
          sent_at: string | null
          slug: string
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Insert: {
          accepted_rewizja_id?: string | null
          adres?: string | null
          created_at?: string | null
          id?: string
          klient?: string | null
          nazwa: string
          notatki?: string | null
          organization_id: string
          powierzchnia?: number | null
          sent_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Update: {
          accepted_rewizja_id?: string | null
          adres?: string | null
          created_at?: string | null
          id?: string
          klient?: string | null
          nazwa?: string
          notatki?: string | null
          organization_id?: string
          powierzchnia?: number | null
          sent_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projekty_accepted_rewizja_id_fkey"
            columns: ["accepted_rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projekty_accepted_rewizja_id_fkey"
            columns: ["accepted_rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projekty_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      realizacja_wpisy: {
        Row: {
          created_at: string | null
          data_faktury: string | null
          id: string
          kwota_netto: number
          numer_faktury: string | null
          opis: string | null
          oplacone: boolean | null
          organization_id: string
          projekt_id: string
          typ: Database["public"]["Enums"]["realizacja_wpis_typ"]
          umowa_id: string | null
          updated_at: string | null
          zamowienie_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_faktury?: string | null
          id?: string
          kwota_netto: number
          numer_faktury?: string | null
          opis?: string | null
          oplacone?: boolean | null
          organization_id: string
          projekt_id: string
          typ: Database["public"]["Enums"]["realizacja_wpis_typ"]
          umowa_id?: string | null
          updated_at?: string | null
          zamowienie_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_faktury?: string | null
          id?: string
          kwota_netto?: number
          numer_faktury?: string | null
          opis?: string | null
          oplacone?: boolean | null
          organization_id?: string
          projekt_id?: string
          typ?: Database["public"]["Enums"]["realizacja_wpis_typ"]
          umowa_id?: string | null
          updated_at?: string | null
          zamowienie_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "realizacja_wpisy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizacja_wpisy_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizacja_wpisy_umowa_id_fkey"
            columns: ["umowa_id"]
            isOneToOne: false
            referencedRelation: "umowy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realizacja_wpisy_zamowienie_id_fkey"
            columns: ["zamowienie_id"]
            isOneToOne: false
            referencedRelation: "zamowienia"
            referencedColumns: ["id"]
          },
        ]
      }
      rewizje: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          is_accepted: boolean | null
          is_locked: boolean | null
          locked_at: string | null
          nazwa: string | null
          numer: number
          projekt_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          is_accepted?: boolean | null
          is_locked?: boolean | null
          locked_at?: string | null
          nazwa?: string | null
          numer: number
          projekt_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          is_accepted?: boolean | null
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
      umowa_pozycje: {
        Row: {
          created_at: string | null
          id: string
          ilosc: number
          ilosc_wykonana: number | null
          jednostka: string | null
          nazwa: string
          pozycja_biblioteka_id: string | null
          procent_wykonania: number | null
          stawka: number
          umowa_id: string
          wartosc: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ilosc: number
          ilosc_wykonana?: number | null
          jednostka?: string | null
          nazwa: string
          pozycja_biblioteka_id?: string | null
          procent_wykonania?: number | null
          stawka: number
          umowa_id: string
          wartosc?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ilosc?: number
          ilosc_wykonana?: number | null
          jednostka?: string | null
          nazwa?: string
          pozycja_biblioteka_id?: string | null
          procent_wykonania?: number | null
          stawka?: number
          umowa_id?: string
          wartosc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "umowa_pozycje_pozycja_biblioteka_id_fkey"
            columns: ["pozycja_biblioteka_id"]
            isOneToOne: false
            referencedRelation: "pozycje_biblioteka"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowa_pozycje_umowa_id_fkey"
            columns: ["umowa_id"]
            isOneToOne: false
            referencedRelation: "umowy"
            referencedColumns: ["id"]
          },
        ]
      }
      umowa_pozycje_zrodla: {
        Row: {
          id: string
          ilosc: number
          kosztorys_pozycja_id: string
          umowa_pozycja_id: string
        }
        Insert: {
          id?: string
          ilosc: number
          kosztorys_pozycja_id: string
          umowa_pozycja_id: string
        }
        Update: {
          id?: string
          ilosc?: number
          kosztorys_pozycja_id?: string
          umowa_pozycja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "umowa_pozycje_zrodla_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowa_pozycje_zrodla_kosztorys_pozycja_id_fkey"
            columns: ["kosztorys_pozycja_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_pozycje_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowa_pozycje_zrodla_umowa_pozycja_id_fkey"
            columns: ["umowa_pozycja_id"]
            isOneToOne: false
            referencedRelation: "umowa_pozycje"
            referencedColumns: ["id"]
          },
        ]
      }
      umowa_wykonanie: {
        Row: {
          created_at: string | null
          data_wpisu: string
          id: string
          ilosc_wykonana: number
          umowa_pozycja_id: string
          uwagi: string | null
        }
        Insert: {
          created_at?: string | null
          data_wpisu: string
          id?: string
          ilosc_wykonana: number
          umowa_pozycja_id: string
          uwagi?: string | null
        }
        Update: {
          created_at?: string | null
          data_wpisu?: string
          id?: string
          ilosc_wykonana?: number
          umowa_pozycja_id?: string
          uwagi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "umowa_wykonanie_umowa_pozycja_id_fkey"
            columns: ["umowa_pozycja_id"]
            isOneToOne: false
            referencedRelation: "umowa_pozycje"
            referencedColumns: ["id"]
          },
        ]
      }
      umowy: {
        Row: {
          created_at: string | null
          data_podpisania: string | null
          id: string
          numer: string
          organization_id: string
          podwykonawca_id: string
          projekt_id: string
          rewizja_id: string
          status: Database["public"]["Enums"]["umowa_status"]
          updated_at: string | null
          uwagi: string | null
          warunki_platnosci: string | null
        }
        Insert: {
          created_at?: string | null
          data_podpisania?: string | null
          id?: string
          numer: string
          organization_id: string
          podwykonawca_id: string
          projekt_id: string
          rewizja_id: string
          status?: Database["public"]["Enums"]["umowa_status"]
          updated_at?: string | null
          uwagi?: string | null
          warunki_platnosci?: string | null
        }
        Update: {
          created_at?: string | null
          data_podpisania?: string | null
          id?: string
          numer?: string
          organization_id?: string
          podwykonawca_id?: string
          projekt_id?: string
          rewizja_id?: string
          status?: Database["public"]["Enums"]["umowa_status"]
          updated_at?: string | null
          uwagi?: string | null
          warunki_platnosci?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "umowy_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowy_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowy_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowy_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umowy_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      zamowienia: {
        Row: {
          created_at: string | null
          data_dostawy_planowana: string | null
          data_zamowienia: string | null
          dostawca_id: string
          id: string
          numer: string
          organization_id: string
          projekt_id: string
          rewizja_id: string
          status: Database["public"]["Enums"]["zamowienie_status"]
          updated_at: string | null
          uwagi: string | null
        }
        Insert: {
          created_at?: string | null
          data_dostawy_planowana?: string | null
          data_zamowienia?: string | null
          dostawca_id: string
          id?: string
          numer: string
          organization_id: string
          projekt_id: string
          rewizja_id: string
          status?: Database["public"]["Enums"]["zamowienie_status"]
          updated_at?: string | null
          uwagi?: string | null
        }
        Update: {
          created_at?: string | null
          data_dostawy_planowana?: string | null
          data_zamowienia?: string | null
          dostawca_id?: string
          id?: string
          numer?: string
          organization_id?: string
          projekt_id?: string
          rewizja_id?: string
          status?: Database["public"]["Enums"]["zamowienie_status"]
          updated_at?: string | null
          uwagi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zamowienia_dostawca_id_fkey"
            columns: ["dostawca_id"]
            isOneToOne: false
            referencedRelation: "dostawcy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienia_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienia_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienia_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienia_rewizja_id_fkey"
            columns: ["rewizja_id"]
            isOneToOne: false
            referencedRelation: "rewizje_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      zamowienie_dostawy: {
        Row: {
          created_at: string | null
          data_dostawy: string
          id: string
          numer_wz: string | null
          uwagi: string | null
          zamowienie_id: string
        }
        Insert: {
          created_at?: string | null
          data_dostawy: string
          id?: string
          numer_wz?: string | null
          uwagi?: string | null
          zamowienie_id: string
        }
        Update: {
          created_at?: string | null
          data_dostawy?: string
          id?: string
          numer_wz?: string | null
          uwagi?: string | null
          zamowienie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zamowienie_dostawy_zamowienie_id_fkey"
            columns: ["zamowienie_id"]
            isOneToOne: false
            referencedRelation: "zamowienia"
            referencedColumns: ["id"]
          },
        ]
      }
      zamowienie_dostawy_pozycje: {
        Row: {
          id: string
          ilosc_dostarczona: number
          zamowienie_dostawa_id: string
          zamowienie_pozycja_id: string
        }
        Insert: {
          id?: string
          ilosc_dostarczona: number
          zamowienie_dostawa_id: string
          zamowienie_pozycja_id: string
        }
        Update: {
          id?: string
          ilosc_dostarczona?: number
          zamowienie_dostawa_id?: string
          zamowienie_pozycja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zamowienie_dostawy_pozycje_zamowienie_dostawa_id_fkey"
            columns: ["zamowienie_dostawa_id"]
            isOneToOne: false
            referencedRelation: "zamowienie_dostawy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienie_dostawy_pozycje_zamowienie_pozycja_id_fkey"
            columns: ["zamowienie_pozycja_id"]
            isOneToOne: false
            referencedRelation: "zamowienie_pozycje"
            referencedColumns: ["id"]
          },
        ]
      }
      zamowienie_pozycje: {
        Row: {
          cena_jednostkowa: number
          created_at: string | null
          id: string
          ilosc_dostarczona: number | null
          ilosc_zamowiona: number
          jednostka: string | null
          nazwa: string
          produkt_id: string | null
          wartosc: number | null
          zamowienie_id: string
        }
        Insert: {
          cena_jednostkowa: number
          created_at?: string | null
          id?: string
          ilosc_dostarczona?: number | null
          ilosc_zamowiona: number
          jednostka?: string | null
          nazwa: string
          produkt_id?: string | null
          wartosc?: number | null
          zamowienie_id: string
        }
        Update: {
          cena_jednostkowa?: number
          created_at?: string | null
          id?: string
          ilosc_dostarczona?: number | null
          ilosc_zamowiona?: number
          jednostka?: string | null
          nazwa?: string
          produkt_id?: string | null
          wartosc?: number | null
          zamowienie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zamowienie_pozycje_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "produkty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienie_pozycje_zamowienie_id_fkey"
            columns: ["zamowienie_id"]
            isOneToOne: false
            referencedRelation: "zamowienia"
            referencedColumns: ["id"]
          },
        ]
      }
      zamowienie_pozycje_zrodla: {
        Row: {
          id: string
          ilosc: number
          kosztorys_skladowa_m_id: string
          zamowienie_pozycja_id: string
        }
        Insert: {
          id?: string
          ilosc: number
          kosztorys_skladowa_m_id: string
          zamowienie_pozycja_id: string
        }
        Update: {
          id?: string
          ilosc?: number
          kosztorys_skladowa_m_id?: string
          zamowienie_pozycja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zamowienie_pozycje_zrodla_kosztorys_skladowa_m_id_fkey"
            columns: ["kosztorys_skladowa_m_id"]
            isOneToOne: false
            referencedRelation: "kosztorys_skladowe_materialy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zamowienie_pozycje_zrodla_zamowienie_pozycja_id_fkey"
            columns: ["zamowienie_pozycja_id"]
            isOneToOne: false
            referencedRelation: "zamowienie_pozycje"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kosztorys_pozycje_view: {
        Row: {
          cena_robocizny_zrodlo:
            | Database["public"]["Enums"]["cena_robocizny_zrodlo"]
            | null
          cena_robocizny_zrodlowa: number | null
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
          podwykonawca_id: string | null
          pozycja_biblioteka_id: string | null
          r_is_override: boolean | null
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
            foreignKeyName: "kosztorys_pozycje_podwykonawca_id_fkey"
            columns: ["podwykonawca_id"]
            isOneToOne: false
            referencedRelation: "podwykonawcy"
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
          accepted_at: string | null
          created_at: string | null
          id: string | null
          is_accepted: boolean | null
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
      change_project_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["project_status"]
          p_projekt_id: string
          p_rewizja_id?: string
        }
        Returns: Json
      }
      copy_revision: {
        Args: { new_nazwa?: string; source_rewizja_id: string }
        Returns: string
      }
      generate_umowy_draft: {
        Args: { p_projekt_id: string; p_rewizja_id: string }
        Returns: number
      }
      generate_zamowienia_draft: {
        Args: { p_projekt_id: string; p_rewizja_id: string }
        Returns: number
      }
      get_dostawcy_aggregated:
        | {
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
              id: string
              kod: string
              kontakt: string
              najnizsza_cena: number
              nazwa: string
              pozycje_count: number
              produkty_count: number
              total_count: number
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_order?: string
              p_search?: string
              p_show_inactive?: boolean
              p_sort?: string
            }
            Returns: {
              aktywny: boolean
              id: string
              kod: string
              kontakt: string
              nazwa: string
              produkty_count: number
              total_count: number
              total_wartosc: number
            }[]
          }
      get_dostawcy_stats: {
        Args: never
        Returns: {
          avg_products: number
          total: number
          total_products: number
        }[]
      }
      get_materialy_aggregated:
        | {
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
        | {
            Args: {
              p_branza?: string
              p_kategoria?: string
              p_limit?: number
              p_offset?: number
              p_order?: string
              p_podkategoria?: string
              p_search?: string
              p_show_inactive?: boolean
              p_sort?: string
              p_status_cenowy?: string
            }
            Returns: {
              aktywny: boolean
              dostawcy_count: number
              id: string
              jednostka: string
              najgorsza_cena: number
              najlepsza_cena: number
              nazwa: string
              pozycje_count: number
              sku: string
              total_count: number
            }[]
          }
      get_materialy_stats: {
        Args: never
        Returns: {
          avg_price: number
          total: number
          with_suppliers: number
          without_suppliers: number
        }[]
      }
      get_podwykonawcy_aggregated:
        | {
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
              id: string
              kontakt: string
              najnizsza_stawka: number
              najwyzsza_stawka: number
              nazwa: string
              pozycje_count: number
              specjalizacja: string
              total_count: number
            }[]
          }
        | {
            Args: {
              p_limit?: number
              p_offset?: number
              p_order?: string
              p_search?: string
              p_show_inactive?: boolean
              p_sort?: string
              p_specjalizacja?: string
            }
            Returns: {
              aktywny: boolean
              id: string
              kontakt: string
              max_stawka: number
              min_stawka: number
              nazwa: string
              specjalizacja: string
              stawki_count: number
              total_count: number
            }[]
          }
      get_podwykonawcy_stats: {
        Args: never
        Returns: {
          avg_stawka: number
          total: number
          total_stawki: number
        }[]
      }
      get_realizacja_stats: { Args: { p_projekt_id: string }; Returns: Json }
      user_organizations: { Args: never; Returns: string[] }
    }
    Enums: {
      branza_kod: "BUD" | "ELE" | "SAN" | "TEL" | "HVC"
      cena_robocizny_zrodlo: "biblioteka" | "podwykonawca" | "reczna"
      org_role: "owner" | "admin" | "member"
      position_type: "robocizna" | "material" | "komplet"
      project_status:
        | "draft"
        | "ofertowanie"
        | "realizacja"
        | "zamkniety"
        | "odrzucony"
      realizacja_wpis_typ: "material" | "robocizna" | "inny"
      umowa_status:
        | "draft"
        | "wyslana"
        | "podpisana"
        | "wykonana"
        | "rozliczona"
      zamowienie_status:
        | "draft"
        | "wyslane"
        | "czesciowo"
        | "dostarczone"
        | "rozliczone"
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
      cena_robocizny_zrodlo: ["biblioteka", "podwykonawca", "reczna"],
      org_role: ["owner", "admin", "member"],
      position_type: ["robocizna", "material", "komplet"],
      project_status: [
        "draft",
        "ofertowanie",
        "realizacja",
        "zamkniety",
        "odrzucony",
      ],
      realizacja_wpis_typ: ["material", "robocizna", "inny"],
      umowa_status: ["draft", "wyslana", "podpisana", "wykonana", "rozliczona"],
      zamowienie_status: [
        "draft",
        "wyslane",
        "czesciowo",
        "dostarczone",
        "rozliczone",
      ],
    },
  },
} as const
