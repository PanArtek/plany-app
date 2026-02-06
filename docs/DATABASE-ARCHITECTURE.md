# PLANY App - Architektura Bazy Danych Supabase (v4.0)

## Podsumowanie

Plan migracji modelu danych z wireframe do produkcyjnej bazy Supabase z RLS, triggerami i optymalizacją wydajności.

**Kluczowa zasada: KOSZTORYS JEST ŹRÓDŁEM PRAWDY**
- Cennik (ceny_dostawcow, stawki_podwykonawcow) = tylko podpowiedź/punkt startowy
- Każdy kosztorys ma własne ceny, edytowalne i zapisywane
- Każda rewizja = kopia z własnymi wartościami R, M, Narzut

**Cykl życia projektu:**
```
draft → ofertowanie → realizacja → zamkniety/odrzucony
                  ↓
         akceptacja rewizji → generowanie zamówień + umów
```

**Model kalkulacji:**
```
is_manual=false → koszt = norma × cena × kp.ilosc  (auto, przelicza się przy zmianie metrażu)
is_manual=true  → koszt = ilosc × cena             (manual override, nie przelicza się)

R = suma(auto) × ilosc + suma(manual)
M = suma(auto) × ilosc + suma(manual)
Razem = (R + M) × (1 + narzut%)
```

---

## 1. Decyzje Architektoniczne

| Aspekt | Decyzja | Uzasadnienie |
|--------|---------|--------------|
| Multi-tenancy | **`organization_id`** + RLS | Gotowość na zespoły, łatwiejsza migracja |
| Shared data | `organization_id = NULL` dla szablonów | kategorie, pozycje_biblioteka współdzielone |
| Składowe biblioteki | **Szablony** (bez cen lub domyślne) | Kopiowane do kosztorysu przy dodawaniu pozycji |
| Składowe kosztorysu | **Własne tabele** z cenami | `kosztorys_skladowe_robocizna`, `kosztorys_skladowe_materialy` |
| Cennik | **Tylko podpowiedź** | Cena w kosztorysie może być inna niż w cenniku |
| Narzuty | **Per pozycja w kosztorysie** | Edytowalny `narzut_percent` |
| Soft delete | `aktywny` boolean | Prostsza implementacja niż `deleted_at` |
| Decimal precision | `DECIMAL(12,2)` ceny, `DECIMAL(12,3)` ilości | Precyzja dla PLN i jednostek |
| Timestamps | `created_at` + `updated_at` | Audit trail, cache invalidation |

### Kluczowe zmiany vs v2:

**Cennik ≠ Źródło prawdy**
- `ceny_dostawcow` i `stawki_podwykonawcow` to tylko baza wyjściowa
- Ceny w kosztorysie są niezależne - edytujesz, zapisujesz, wracasz
- Nie ma "overrides" - są bezpośrednie ceny w kosztorysie

**Składowe na dwóch poziomach:**
1. `biblioteka_skladowe_*` = szablony (pozycje_biblioteka)
2. `kosztorys_skladowe_*` = rzeczywiste ceny (kosztorys_pozycje)

**Rewizje = pełne kopie**
- Każda rewizja ma własne `kosztorys_pozycje` z własnymi `kosztorys_skladowe_*`
- Porównanie rewizji = porównanie ich danych (nie snapshotów)

---

## 2. Schemat Tabel (27 tabel)

### Kolejność migracji (FK dependencies):

```
--- Faza 1-5: Fundament (COMPLETE) ---
1. Extensions + Types (position_type, project_status, org_role, branza_kod)
2. organizations
3. organization_members (→ organizations, auth.users)
4. kategorie (self-ref, → organizations)
5. narzuty_domyslne (→ organizations)
6. produkty (→ organizations)
7. dostawcy (→ organizations)
8. ceny_dostawcow (→ dostawcy, produkty)
9. podwykonawcy (→ organizations)
10. stawki_podwykonawcow (→ podwykonawcy, pozycje_biblioteka)
11. pozycje_biblioteka (→ organizations, kategorie)
12. biblioteka_skladowe_robocizna (→ pozycje_biblioteka) [SZABLON]
13. biblioteka_skladowe_materialy (→ pozycje_biblioteka) [SZABLON]
14. projekty (→ organizations, rewizje)
15. rewizje (→ projekty)
16. kosztorys_pozycje (→ rewizje, pozycje_biblioteka)
17. kosztorys_skladowe_robocizna (→ kosztorys_pozycje) [CENY]
18. kosztorys_skladowe_materialy (→ kosztorys_pozycje) [CENY]

--- Faza 6: Business Logic (COMPLETE) ---
19. Types: zamowienie_status, umowa_status, realizacja_wpis_typ
20. ALTER: rewizje (+is_accepted, +accepted_at), projekty (+accepted_rewizja_id)
21. zamowienia (→ organizations, projekty, rewizje, dostawcy)
22. zamowienie_pozycje (→ zamowienia, produkty)
23. zamowienie_pozycje_zrodla (→ zamowienie_pozycje, kosztorys_skladowe_materialy)
24. zamowienie_dostawy (→ zamowienia)
25. zamowienie_dostawy_pozycje (→ zamowienie_dostawy, zamowienie_pozycje)
26. umowy (→ organizations, projekty, rewizje, podwykonawcy)
27. umowa_pozycje (→ umowy, pozycje_biblioteka)
28. umowa_pozycje_zrodla (→ umowa_pozycje, kosztorys_skladowe_robocizna)
29. umowa_wykonanie (→ umowa_pozycje)
30. realizacja_wpisy (→ organizations, projekty, zamowienia, umowy)

--- Functions + Triggers + Views + RLS ---
31. Triggers (prevent_unlock, updated_at, auto_numer, auto_sum)
32. Functions (generate_zamowienia_draft, generate_umowy_draft, UX aggregation)
33. Views + RLS Policies
```

### Tabele - przegląd:

**Fundament (17 tabel):**

| Tabela | Rola | Ceny? |
|--------|------|-------|
| `organizations` | Firmy/zespoły | - |
| `organization_members` | Członkowie | - |
| `kategorie` | Hierarchia branż | - |
| `narzuty_domyslne` | Domyślne marże per branża | % |
| `produkty` | Katalog materiałów | - |
| `dostawcy` | Dostawcy | - |
| `ceny_dostawcow` | **Cennik materiałów (PODPOWIEDŹ)** | TAK |
| `podwykonawcy` | Ekipy robocze | - |
| `stawki_podwykonawcow` | **Cennik robocizny (PODPOWIEDŹ)** — powiązane z pozycja_biblioteka | TAK |
| `pozycje_biblioteka` | Szablony pozycji | - |
| `biblioteka_skladowe_robocizna` | **Szablony składowych R** (norma, stawka opcjonalna) | opcjonalne |
| `biblioteka_skladowe_materialy` | **Szablony składowych M** (norma, cena opcjonalna) | opcjonalne |
| `projekty` | Projekty (+accepted_rewizja_id) | - |
| `rewizje` | Wersje kosztorysu (locked/unlocked, +is_accepted) | - |
| `kosztorys_pozycje` | Pozycje w kosztorysie (ilość, narzut%) | - |
| `kosztorys_skladowe_robocizna` | **Rzeczywiste R (ŹRÓDŁO PRAWDY)** - stawka, norma, ilosc, is_manual | TAK |
| `kosztorys_skladowe_materialy` | **Rzeczywiste M (ŹRÓDŁO PRAWDY)** - cena, norma, ilosc, is_manual | TAK |

**Zamówienia materiałów (5 tabel):**

| Tabela | Rola |
|--------|------|
| `zamowienia` | Zamówienia do dostawców (auto-numer ZAM/YYYY/NNN) |
| `zamowienie_pozycje` | Pozycje zamówienia (GENERATED wartosc) |
| `zamowienie_pozycje_zrodla` | Traceability: skąd pochodzi ilość (FK → kosztorys_skladowe_materialy) |
| `zamowienie_dostawy` | Dostawy (numer WZ, data) |
| `zamowienie_dostawy_pozycje` | Pozycje dostawy (trigger → ilosc_dostarczona) |

**Umowy z podwykonawcami (4 tabele):**

| Tabela | Rola |
|--------|------|
| `umowy` | Umowy z podwykonawcami (auto-numer UMW/YYYY/NNN) |
| `umowa_pozycje` | Pozycje umowy (GENERATED wartosc, procent_wykonania) |
| `umowa_pozycje_zrodla` | Traceability: skąd pochodzi ilość (FK → kosztorys_skladowe_robocizna) |
| `umowa_wykonanie` | Wpisy wykonania (trigger → ilosc_wykonana) |

**Realizacja (1 tabela):**

| Tabela | Rola |
|--------|------|
| `realizacja_wpisy` | Faktury i rozliczenia (typ: material/robocizna/inny) |

---

## 3. Kluczowe Pliki SQL

### 3.1 `supabase/migrations/001_types.sql`
```sql
-- Faza 1
CREATE TYPE position_type AS ENUM ('robocizna', 'material', 'komplet');
CREATE TYPE project_status AS ENUM ('draft', 'ofertowanie', 'realizacja', 'zamkniety', 'odrzucony');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE branza_kod AS ENUM ('BUD', 'ELE', 'SAN', 'TEL', 'HVC');

-- Faza 6 (Business Logic)
CREATE TYPE zamowienie_status AS ENUM ('draft', 'wyslane', 'czesciowo', 'dostarczone', 'rozliczone');
CREATE TYPE umowa_status AS ENUM ('draft', 'wyslana', 'podpisana', 'wykonana', 'rozliczona');
CREATE TYPE realizacja_wpis_typ AS ENUM ('material', 'robocizna', 'inny');
```

### 3.2 `supabase/migrations/002_organizations.sql`
```sql
-- Organizacje (firmy/zespoły)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazwa VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Członkowie organizacji
CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

-- Helper function: get user's organizations
CREATE OR REPLACE FUNCTION user_organizations()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Index for RLS performance
CREATE INDEX idx_org_members_user ON organization_members(user_id);
```

### 3.3 `supabase/migrations/003_narzuty_domyslne.sql`
```sql
-- Domyślne narzuty per branża (tylko podpowiedź!)
CREATE TABLE narzuty_domyslne (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    branza_kod branza_kod NOT NULL,
    narzut_percent DECIMAL(5,2) NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT narzuty_unique UNIQUE (organization_id, branza_kod)
);

-- System defaults (organization_id = NULL)
INSERT INTO narzuty_domyslne (organization_id, branza_kod, narzut_percent) VALUES
    (NULL, 'BUD', 30),
    (NULL, 'ELE', 25),
    (NULL, 'SAN', 28),
    (NULL, 'TEL', 25),
    (NULL, 'HVC', 22);
```

### 3.4 `supabase/migrations/004_cennik.sql`
```sql
-- Produkty (katalog materiałów)
CREATE TABLE produkty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    nazwa VARCHAR(255) NOT NULL,
    jednostka VARCHAR(20) NOT NULL DEFAULT 'szt',
    kategoria VARCHAR(100),
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT produkty_sku_unique UNIQUE (organization_id, sku)
);

-- Dostawcy
CREATE TABLE dostawcy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    nazwa VARCHAR(255) NOT NULL,
    kod VARCHAR(50),
    kontakt TEXT,
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ceny dostawców (CENNIK = PODPOWIEDŹ)
CREATE TABLE ceny_dostawcow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dostawca_id UUID NOT NULL REFERENCES dostawcy(id) ON DELETE CASCADE,
    produkt_id UUID NOT NULL REFERENCES produkty(id) ON DELETE CASCADE,
    cena_netto DECIMAL(12,2) NOT NULL,
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ceny_unique UNIQUE (dostawca_id, produkt_id)
);

-- Podwykonawcy
CREATE TABLE podwykonawcy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    nazwa VARCHAR(255) NOT NULL,
    specjalizacja VARCHAR(100),
    kontakt TEXT,
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stawki podwykonawców (CENNIK = PODPOWIEDŹ)
-- WAŻNE: Powiązane z pozycja_biblioteka (nie nazwa_stawki)
CREATE TABLE stawki_podwykonawcow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podwykonawca_id UUID NOT NULL REFERENCES podwykonawcy(id) ON DELETE CASCADE,
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    stawka DECIMAL(12,2) NOT NULL,
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price lookups
CREATE INDEX idx_ceny_produkt ON ceny_dostawcow(produkt_id);
CREATE INDEX idx_ceny_dostawca ON ceny_dostawcow(dostawca_id);
CREATE INDEX idx_stawki_podwykonawca ON stawki_podwykonawcow(podwykonawca_id);
```

### 3.5 `supabase/migrations/005_biblioteka.sql`
```sql
-- Kategorie (hierarchia: branża → kategoria → podkategoria)
CREATE TABLE kategorie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES kategorie(id) ON DELETE CASCADE,
    kod VARCHAR(20) NOT NULL,
    pelny_kod VARCHAR(50),  -- auto-generated: BUD.03.01
    nazwa VARCHAR(255) NOT NULL,
    poziom INTEGER NOT NULL DEFAULT 1,  -- 1=branża, 2=kategoria, 3=podkategoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT kategorie_kod_unique UNIQUE (organization_id, pelny_kod)
);

-- Pozycje biblioteka (SZABLONY)
CREATE TABLE pozycje_biblioteka (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    kategoria_id UUID REFERENCES kategorie(id) ON DELETE SET NULL,
    kod VARCHAR(50) NOT NULL,  -- np. BUD.03.01.001
    nazwa VARCHAR(500) NOT NULL,
    opis TEXT,
    jednostka VARCHAR(20) NOT NULL DEFAULT 'm²',
    typ position_type DEFAULT 'komplet',
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pozycje_kod_unique UNIQUE (organization_id, kod)
);

-- Składowe robocizna w BIBLIOTECE (szablon, ceny opcjonalne)
-- WAŻNE: norma_domyslna = zużycie na 1 jednostkę pozycji
CREATE TABLE biblioteka_skladowe_robocizna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    opis VARCHAR(500) NOT NULL,
    podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL,
    stawka_domyslna DECIMAL(12,2),           -- opcjonalna domyślna stawka
    norma_domyslna DECIMAL(12,4) DEFAULT 1,  -- zużycie na 1 jednostkę (np. 0.1 h/m²)
    jednostka VARCHAR(20) DEFAULT 'h',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bib_skladowe_r_unique UNIQUE (pozycja_biblioteka_id, lp)
);

-- Składowe materiały w BIBLIOTECE (szablon, ceny opcjonalne)
-- WAŻNE: norma_domyslna = zużycie na 1 jednostkę pozycji
CREATE TABLE biblioteka_skladowe_materialy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    nazwa VARCHAR(255) NOT NULL,
    produkt_id UUID REFERENCES produkty(id) ON DELETE SET NULL,
    dostawca_id UUID REFERENCES dostawcy(id) ON DELETE SET NULL,
    cena_domyslna DECIMAL(12,2),             -- opcjonalna domyślna cena
    norma_domyslna DECIMAL(12,4) DEFAULT 1,  -- zużycie na 1 jednostkę (np. 0.15 l/m²)
    jednostka VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bib_skladowe_m_unique UNIQUE (pozycja_biblioteka_id, lp)
);

CREATE INDEX idx_pozycje_kategoria ON pozycje_biblioteka(kategoria_id);
CREATE INDEX idx_pozycje_kod ON pozycje_biblioteka(kod varchar_pattern_ops);
```

### 3.6 `supabase/migrations/006_kosztorys.sql`
```sql
-- Projekty
CREATE TABLE projekty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nazwa VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    klient VARCHAR(255),
    adres TEXT,
    powierzchnia DECIMAL(10,2),  -- m²
    status project_status DEFAULT 'draft',
    notatki TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT projekty_slug_unique UNIQUE (organization_id, slug)
);

-- Rewizje (wersje kosztorysu)
CREATE TABLE rewizje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    numer INTEGER NOT NULL,  -- 0, 1, 2...
    nazwa VARCHAR(100),  -- np. "Wersja wstępna", "Po negocjacjach"
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT rewizje_numer_unique UNIQUE (projekt_id, numer)
);

-- Pozycje w kosztorysie
CREATE TABLE kosztorys_pozycje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rewizja_id UUID NOT NULL REFERENCES rewizje(id) ON DELETE CASCADE,
    pozycja_biblioteka_id UUID REFERENCES pozycje_biblioteka(id) ON DELETE SET NULL,

    lp INTEGER NOT NULL,
    nazwa VARCHAR(500) NOT NULL,

    ilosc DECIMAL(12,3) NOT NULL DEFAULT 1,  -- ilość pozycji (np. 100 m²)
    jednostka VARCHAR(20),

    -- Narzut edytowalny per pozycja
    narzut_percent DECIMAL(5,2) NOT NULL DEFAULT 30,

    notatki TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT kosztorys_lp_unique UNIQUE (rewizja_id, lp)
);

-- Składowe robocizna w KOSZTORYSIE (ŹRÓDŁO PRAWDY!)
-- WAŻNE: norma = zużycie na 1 jednostkę pozycji (np. 0.1 h/m²)
-- WAŻNE: is_manual = true → ilosc wpisana ręcznie, nie przeliczać przy zmianie metrażu
CREATE TABLE kosztorys_skladowe_robocizna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kosztorys_pozycja_id UUID NOT NULL REFERENCES kosztorys_pozycje(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,

    opis VARCHAR(500) NOT NULL,

    -- Opcjonalne powiązanie (dla historii/raportów)
    podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL,

    -- WARTOŚCI EDYTOWALNE (źródło prawdy!)
    stawka DECIMAL(12,2) NOT NULL,          -- zł/h lub zł/jednostkę
    norma DECIMAL(12,4) NOT NULL DEFAULT 1, -- zużycie na 1 jednostkę pozycji (np. 0.1 h/m²)
    ilosc DECIMAL(12,4),                    -- rzeczywista ilość (gdy is_manual=true)
    jednostka VARCHAR(20) DEFAULT 'h',

    -- Manual override flag
    is_manual BOOLEAN NOT NULL DEFAULT FALSE, -- true = ilosc wpisana ręcznie

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT ksz_skladowe_r_unique UNIQUE (kosztorys_pozycja_id, lp),
    -- is_manual=true wymaga ilosc
    CONSTRAINT ksz_skladowe_r_manual_ilosc CHECK (
        (is_manual = FALSE) OR (is_manual = TRUE AND ilosc IS NOT NULL)
    )
);

-- Składowe materiały w KOSZTORYSIE (ŹRÓDŁO PRAWDY!)
-- WAŻNE: norma = zużycie na 1 jednostkę pozycji (np. 0.15 l/m²)
-- WAŻNE: is_manual = true → ilosc wpisana ręcznie, nie przeliczać przy zmianie metrażu
CREATE TABLE kosztorys_skladowe_materialy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kosztorys_pozycja_id UUID NOT NULL REFERENCES kosztorys_pozycje(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,

    nazwa VARCHAR(255) NOT NULL,

    -- Opcjonalne powiązania (dla historii/raportów)
    produkt_id UUID REFERENCES produkty(id) ON DELETE SET NULL,
    dostawca_id UUID REFERENCES dostawcy(id) ON DELETE SET NULL,

    -- WARTOŚCI EDYTOWALNE (źródło prawdy!)
    cena DECIMAL(12,2) NOT NULL,            -- cena jednostkowa (zł/l, zł/szt)
    norma DECIMAL(12,4) NOT NULL DEFAULT 1, -- zużycie na 1 jednostkę pozycji (np. 0.15 l/m²)
    ilosc DECIMAL(12,4),                    -- rzeczywista ilość (gdy is_manual=true)
    jednostka VARCHAR(20),

    -- Manual override flag
    is_manual BOOLEAN NOT NULL DEFAULT FALSE, -- true = ilosc wpisana ręcznie

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT ksz_skladowe_m_unique UNIQUE (kosztorys_pozycja_id, lp),
    -- is_manual=true wymaga ilosc
    CONSTRAINT ksz_skladowe_m_manual_ilosc CHECK (
        (is_manual = FALSE) OR (is_manual = TRUE AND ilosc IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_projekty_org ON projekty(organization_id);
CREATE INDEX idx_projekty_slug ON projekty(slug);
CREATE INDEX idx_rewizje_projekt ON rewizje(projekt_id);
CREATE INDEX idx_kosztorys_rewizja ON kosztorys_pozycje(rewizja_id);
CREATE INDEX idx_ksz_skladowe_r_pozycja ON kosztorys_skladowe_robocizna(kosztorys_pozycja_id);
CREATE INDEX idx_ksz_skladowe_m_pozycja ON kosztorys_skladowe_materialy(kosztorys_pozycja_id);

-- Index for RLS performance (CRITICAL for kosztorys_pozycje RLS policy)
CREATE INDEX idx_kosztorys_pozycje_org ON kosztorys_pozycje(organization_id);

-- Indexes for reporting (opcjonalne - ile użyć produktu/podwykonawcy)
CREATE INDEX idx_ksz_skladowe_r_podwykonawca ON kosztorys_skladowe_robocizna(podwykonawca_id);
CREATE INDEX idx_ksz_skladowe_m_produkt ON kosztorys_skladowe_materialy(produkt_id);
CREATE INDEX idx_ksz_skladowe_m_dostawca ON kosztorys_skladowe_materialy(dostawca_id);
```

### 3.7 `supabase/migrations/007_views.sql`
```sql
-- View: kosztorys_pozycje z wyliczonymi R, M, Razem
-- WAŻNE: Wzór kalkulacji z obsługą manual override:
--   is_manual=false → koszt = norma × cena × kp.ilosc
--   is_manual=true  → koszt = ilosc × cena (user override)
-- WAŻNE: security_invoker = true wymusza RLS na views
CREATE OR REPLACE VIEW kosztorys_pozycje_view
WITH (security_invoker = true)
AS
SELECT
    kp.id,
    kp.organization_id,
    kp.rewizja_id,
    kp.pozycja_biblioteka_id,
    kp.lp,
    kp.nazwa,
    kp.ilosc,
    kp.jednostka,
    kp.narzut_percent,
    kp.notatki,
    kp.created_at,
    kp.updated_at,

    -- Koszt jednostkowy (na 1 m², 1 szt, etc.) - tylko dla składowych auto
    COALESCE(r.suma_jedn, 0) AS r_jednostkowy,
    COALESCE(m.suma_jedn, 0) AS m_jednostkowy,

    -- Koszt całkowity R (auto + manual)
    COALESCE(r.suma_jedn, 0) * kp.ilosc + COALESCE(r.suma_manual, 0) AS r_robocizna,

    -- Koszt całkowity M (auto + manual)
    COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0) AS m_materialy,

    -- R + M
    (COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0) AS r_plus_m,

    -- Narzut i razem
    ((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * kp.narzut_percent / 100 AS narzut_wartosc,
    ((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
        + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * (1 + kp.narzut_percent / 100) AS razem

FROM kosztorys_pozycje kp

LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        -- Auto: suma(stawka × norma) - będzie pomnożone przez kp.ilosc
        SUM(CASE WHEN NOT is_manual THEN stawka * norma ELSE 0 END) AS suma_jedn,
        -- Manual: suma(stawka × ilosc) - już finalna wartość
        -- COALESCE na wypadek niespójnych danych (constraint powinien temu zapobiec)
        SUM(CASE WHEN is_manual THEN stawka * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_robocizna
    GROUP BY kosztorys_pozycja_id
) r ON r.kosztorys_pozycja_id = kp.id

LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        -- Auto: suma(cena × norma) - będzie pomnożone przez kp.ilosc
        SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
        -- Manual: suma(cena × ilosc) - już finalna wartość
        -- COALESCE na wypadek niespójnych danych (constraint powinien temu zapobiec)
        SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_materialy
    GROUP BY kosztorys_pozycja_id
) m ON m.kosztorys_pozycja_id = kp.id;

-- View: podsumowanie rewizji
-- WAŻNE: security_invoker = true wymusza RLS na views
CREATE OR REPLACE VIEW rewizje_summary
WITH (security_invoker = true)
AS
SELECT
    rew.id,
    rew.projekt_id,
    rew.numer,
    rew.nazwa,
    rew.is_locked,
    rew.locked_at,
    rew.created_at,
    COALESCE(stats.liczba_pozycji, 0) AS liczba_pozycji,
    COALESCE(stats.suma_r, 0) AS suma_r,
    COALESCE(stats.suma_m, 0) AS suma_m,
    COALESCE(stats.suma_razem, 0) AS suma_razem
FROM rewizje rew
LEFT JOIN (
    SELECT
        kp.rewizja_id,
        COUNT(kp.id) AS liczba_pozycji,
        SUM(COALESCE(r.suma_jedn, 0) * kp.ilosc + COALESCE(r.suma_manual, 0)) AS suma_r,
        SUM(COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0)) AS suma_m,
        SUM(((COALESCE(r.suma_jedn, 0) + COALESCE(m.suma_jedn, 0)) * kp.ilosc
            + COALESCE(r.suma_manual, 0) + COALESCE(m.suma_manual, 0)) * (1 + kp.narzut_percent / 100)) AS suma_razem
    FROM kosztorys_pozycje kp
    LEFT JOIN (
        SELECT kosztorys_pozycja_id,
            SUM(CASE WHEN NOT is_manual THEN stawka * norma ELSE 0 END) AS suma_jedn,
            SUM(CASE WHEN is_manual THEN stawka * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
        FROM kosztorys_skladowe_robocizna GROUP BY kosztorys_pozycja_id
    ) r ON r.kosztorys_pozycja_id = kp.id
    LEFT JOIN (
        SELECT kosztorys_pozycja_id,
            SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
            SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
        FROM kosztorys_skladowe_materialy GROUP BY kosztorys_pozycja_id
    ) m ON m.kosztorys_pozycja_id = kp.id
    GROUP BY kp.rewizja_id
) stats ON stats.rewizja_id = rew.id;
```

### 3.8 `supabase/migrations/008_functions.sql`
```sql
-- Auto pelny_kod dla kategorie
CREATE OR REPLACE FUNCTION trigger_generate_pelny_kod()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.pelny_kod := NEW.kod;
    ELSE
        SELECT pelny_kod || '.' || NEW.kod INTO NEW.pelny_kod
        FROM kategorie WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kategorie_pelny_kod
    BEFORE INSERT OR UPDATE OF kod, parent_id ON kategorie
    FOR EACH ROW EXECUTE FUNCTION trigger_generate_pelny_kod();

-- Auto numer rewizji
CREATE OR REPLACE FUNCTION trigger_auto_revision_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numer IS NULL THEN
        SELECT COALESCE(MAX(numer), -1) + 1 INTO NEW.numer
        FROM rewizje WHERE projekt_id = NEW.projekt_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rewizje_auto_numer
    BEFORE INSERT ON rewizje
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_revision_number();

-- Auto updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER produkty_updated_at BEFORE UPDATE ON produkty FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER dostawcy_updated_at BEFORE UPDATE ON dostawcy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER ceny_dostawcow_updated_at BEFORE UPDATE ON ceny_dostawcow FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER podwykonawcy_updated_at BEFORE UPDATE ON podwykonawcy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER stawki_podwykonawcow_updated_at BEFORE UPDATE ON stawki_podwykonawcow FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kategorie_updated_at BEFORE UPDATE ON kategorie FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER pozycje_biblioteka_updated_at BEFORE UPDATE ON pozycje_biblioteka FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER projekty_updated_at BEFORE UPDATE ON projekty FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER rewizje_updated_at BEFORE UPDATE ON rewizje FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_pozycje_updated_at BEFORE UPDATE ON kosztorys_pozycje FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_skladowe_r_updated_at BEFORE UPDATE ON kosztorys_skladowe_robocizna FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER kosztorys_skladowe_m_updated_at BEFORE UPDATE ON kosztorys_skladowe_materialy FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Trigger: blokada edycji locked rewizji
CREATE OR REPLACE FUNCTION trigger_check_revision_locked()
RETURNS TRIGGER AS $$
DECLARE
    revision_locked BOOLEAN;
BEGIN
    -- Sprawdź czy rewizja jest locked
    SELECT is_locked INTO revision_locked
    FROM rewizje WHERE id = COALESCE(NEW.rewizja_id, OLD.rewizja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie można modyfikować pozycji w zablokowanej rewizji';
    END IF;

    -- DELETE zwraca OLD, INSERT/UPDATE zwraca NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kosztorys_pozycje_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_pozycje
    FOR EACH ROW EXECUTE FUNCTION trigger_check_revision_locked();

-- Trigger: blokada edycji składowych w locked rewizji
CREATE OR REPLACE FUNCTION trigger_check_skladowe_locked()
RETURNS TRIGGER AS $$
DECLARE
    revision_locked BOOLEAN;
BEGIN
    -- Sprawdź przez kosztorys_pozycje → rewizje
    SELECT r.is_locked INTO revision_locked
    FROM kosztorys_pozycje kp
    JOIN rewizje r ON r.id = kp.rewizja_id
    WHERE kp.id = COALESCE(NEW.kosztorys_pozycja_id, OLD.kosztorys_pozycja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie można modyfikować składowych w zablokowanej rewizji';
    END IF;

    -- DELETE zwraca OLD, INSERT/UPDATE zwraca NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ksz_skladowe_r_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_skladowe_robocizna
    FOR EACH ROW EXECUTE FUNCTION trigger_check_skladowe_locked();

CREATE TRIGGER ksz_skladowe_m_check_locked
    BEFORE INSERT OR UPDATE OR DELETE ON kosztorys_skladowe_materialy
    FOR EACH ROW EXECUTE FUNCTION trigger_check_skladowe_locked();

-- Private schema dla security definer functions
CREATE SCHEMA IF NOT EXISTS private;

-- Deep copy rewizji z pozycjami i składowymi (PRIVATE - nie dostępne przez API)
-- SECURITY DEFINER - pomija RLS, dlatego w private schema
CREATE OR REPLACE FUNCTION private.copy_revision(
    source_rewizja_id UUID,
    new_nazwa VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_rewizja_id UUID;
    old_pozycja RECORD;
    new_pozycja_id UUID;
    source_org_id UUID;
BEGIN
    -- Walidacja uprawnień: sprawdź czy user ma dostęp do projektu
    SELECT p.organization_id INTO source_org_id
    FROM rewizje r
    JOIN projekty p ON p.id = r.projekt_id
    WHERE r.id = source_rewizja_id;

    IF source_org_id IS NULL THEN
        RAISE EXCEPTION 'Rewizja nie istnieje';
    END IF;

    IF source_org_id NOT IN (SELECT user_organizations()) THEN
        RAISE EXCEPTION 'Brak uprawnień do kopiowania tej rewizji';
    END IF;

    -- Create new revision
    INSERT INTO rewizje (projekt_id, nazwa, is_locked)
    SELECT projekt_id, COALESCE(new_nazwa, 'Kopia ' || nazwa), FALSE
    FROM rewizje WHERE id = source_rewizja_id
    RETURNING id INTO new_rewizja_id;

    -- Copy positions with their skladowe
    FOR old_pozycja IN
        SELECT * FROM kosztorys_pozycje WHERE rewizja_id = source_rewizja_id
    LOOP
        -- Copy position
        INSERT INTO kosztorys_pozycje (
            organization_id, rewizja_id, pozycja_biblioteka_id,
            lp, nazwa, ilosc, jednostka, narzut_percent, notatki
        ) VALUES (
            old_pozycja.organization_id, new_rewizja_id, old_pozycja.pozycja_biblioteka_id,
            old_pozycja.lp, old_pozycja.nazwa, old_pozycja.ilosc, old_pozycja.jednostka,
            old_pozycja.narzut_percent, old_pozycja.notatki
        ) RETURNING id INTO new_pozycja_id;

        -- Copy skladowe robocizna (z is_manual i ilosc)
        INSERT INTO kosztorys_skladowe_robocizna (
            kosztorys_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        )
        SELECT
            new_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        FROM kosztorys_skladowe_robocizna
        WHERE kosztorys_pozycja_id = old_pozycja.id;

        -- Copy skladowe materialy (z is_manual i ilosc)
        INSERT INTO kosztorys_skladowe_materialy (
            kosztorys_pozycja_id, lp, nazwa, produkt_id, dostawca_id,
            cena, norma, ilosc, jednostka, is_manual
        )
        SELECT
            new_pozycja_id, lp, nazwa, produkt_id, dostawca_id,
            cena, norma, ilosc, jednostka, is_manual
        FROM kosztorys_skladowe_materialy
        WHERE kosztorys_pozycja_id = old_pozycja.id;
    END LOOP;

    RETURN new_rewizja_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public wrapper (SECURITY INVOKER - wymusza RLS)
-- Dostępny przez API, deleguje do private.copy_revision
CREATE OR REPLACE FUNCTION copy_revision(
    source_rewizja_id UUID,
    new_nazwa VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
    SELECT private.copy_revision(source_rewizja_id, new_nazwa);
$$ LANGUAGE SQL SECURITY INVOKER;

-- Onboarding: auto-create organization for new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO organizations (nazwa, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Moja firma'),
        NEW.id::text
    )
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.9 `supabase/migrations/009_rls.sql`
```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE narzuty_domyslne ENABLE ROW LEVEL SECURITY;
ALTER TABLE produkty ENABLE ROW LEVEL SECURITY;
ALTER TABLE dostawcy ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceny_dostawcow ENABLE ROW LEVEL SECURITY;
ALTER TABLE podwykonawcy ENABLE ROW LEVEL SECURITY;
ALTER TABLE stawki_podwykonawcow ENABLE ROW LEVEL SECURITY;
ALTER TABLE pozycje_biblioteka ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteka_skladowe_robocizna ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteka_skladowe_materialy ENABLE ROW LEVEL SECURITY;
ALTER TABLE projekty ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewizje ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_pozycje ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_skladowe_robocizna ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosztorys_skladowe_materialy ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS & MEMBERS
-- =====================================================
CREATE POLICY "organizations_select" ON organizations FOR SELECT
    TO authenticated
    USING (id IN (SELECT user_organizations()));

CREATE POLICY "org_members_select" ON organization_members FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- ORG-OWNED TABLES (projekty, produkty, dostawcy, podwykonawcy)
-- =====================================================

-- Projekty
CREATE POLICY "projekty_select" ON projekty FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_insert" ON projekty FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_update" ON projekty FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_delete" ON projekty FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Produkty (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "produkty_select" ON produkty FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_insert" ON produkty FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_update" ON produkty FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_delete" ON produkty FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Dostawcy (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "dostawcy_select" ON dostawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_insert" ON dostawcy FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_update" ON dostawcy FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_delete" ON dostawcy FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Podwykonawcy (SELECT dla authenticated + anon dla danych systemowych)
CREATE POLICY "podwykonawcy_select" ON podwykonawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_insert" ON podwykonawcy FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_update" ON podwykonawcy FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_delete" ON podwykonawcy FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- CHILD TABLES (przez parent FK)
-- =====================================================

-- Rewizje (przez projekty.organization_id)
CREATE POLICY "rewizje_select" ON rewizje FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_insert" ON rewizje FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_update" ON rewizje FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_delete" ON rewizje FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projekty p
        WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- Ceny dostawców (przez dostawcy.organization_id)
CREATE POLICY "ceny_dostawcow_select" ON ceny_dostawcow FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND (d.organization_id IS NULL OR d.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "ceny_dostawcow_insert" ON ceny_dostawcow FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_update" ON ceny_dostawcow FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_delete" ON ceny_dostawcow FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM dostawcy d
        WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));

-- Stawki podwykonawców (przez podwykonawcy.organization_id)
CREATE POLICY "stawki_select" ON stawki_podwykonawcow FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND (p.organization_id IS NULL OR p.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "stawki_insert" ON stawki_podwykonawcow FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_update" ON stawki_podwykonawcow FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_delete" ON stawki_podwykonawcow FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM podwykonawcy p
        WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- Biblioteka składowe robocizna (przez pozycje_biblioteka)
CREATE POLICY "bib_skladowe_r_select" ON biblioteka_skladowe_robocizna FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_r_insert" ON biblioteka_skladowe_robocizna FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_update" ON biblioteka_skladowe_robocizna FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_delete" ON biblioteka_skladowe_robocizna FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- Biblioteka składowe materiały (przez pozycje_biblioteka)
CREATE POLICY "bib_skladowe_m_select" ON biblioteka_skladowe_materialy FOR SELECT
    TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_m_insert" ON biblioteka_skladowe_materialy FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_update" ON biblioteka_skladowe_materialy FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_delete" ON biblioteka_skladowe_materialy FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb
        WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- =====================================================
-- HYBRID TABLES (org_id = NULL dla szablonów systemowych)
-- =====================================================
CREATE POLICY "kategorie_select" ON kategorie FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_insert" ON kategorie FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_update" ON kategorie FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_delete" ON kategorie FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "pozycje_biblioteka_select" ON pozycje_biblioteka FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_insert" ON pozycje_biblioteka FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_update" ON pozycje_biblioteka FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_delete" ON pozycje_biblioteka FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "narzuty_select" ON narzuty_domyslne FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_insert" ON narzuty_domyslne FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_update" ON narzuty_domyslne FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_delete" ON narzuty_domyslne FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- =====================================================
-- KOSZTORYS TABLES
-- =====================================================
CREATE POLICY "kosztorys_pozycje_select" ON kosztorys_pozycje FOR SELECT
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_insert" ON kosztorys_pozycje FOR INSERT
    TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_update" ON kosztorys_pozycje FOR UPDATE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_delete" ON kosztorys_pozycje FOR DELETE
    TO authenticated
    USING (organization_id IN (SELECT user_organizations()));

-- Pattern: skladowe (through kosztorys_pozycje.organization_id)
CREATE POLICY "ksz_skladowe_r_select" ON kosztorys_skladowe_robocizna FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_insert" ON kosztorys_skladowe_robocizna FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_update" ON kosztorys_skladowe_robocizna FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_delete" ON kosztorys_skladowe_robocizna FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));

-- Same for skladowe_materialy
CREATE POLICY "ksz_skladowe_m_select" ON kosztorys_skladowe_materialy FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_insert" ON kosztorys_skladowe_materialy FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_update" ON kosztorys_skladowe_materialy FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_delete" ON kosztorys_skladowe_materialy FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp
        WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
```

### 3.10 `supabase/migrations/010_seed.sql`
```sql
-- Systemowe kategorie (organization_id = NULL)
INSERT INTO kategorie (organization_id, kod, pelny_kod, nazwa, poziom) VALUES
    (NULL, 'BUD', 'BUD', 'Budowlane', 1),
    (NULL, 'ELE', 'ELE', 'Elektryczne', 1),
    (NULL, 'SAN', 'SAN', 'Sanitarne', 1),
    (NULL, 'TEL', 'TEL', 'Teletechniczne', 1),
    (NULL, 'HVC', 'HVC', 'HVAC', 1);

-- Podkategorie BUD (przykład)
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '01', 'Prace rozbiórkowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '02', 'Prace murowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '03', 'Prace wykończeniowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
```

### 3.11 Business Logic: ALTER + Akceptacja

```sql
-- Nowe kolumny na istniejących tabelach
ALTER TABLE rewizje
    ADD COLUMN is_accepted BOOLEAN DEFAULT FALSE,
    ADD COLUMN accepted_at TIMESTAMPTZ;

ALTER TABLE projekty
    ADD COLUMN accepted_rewizja_id UUID REFERENCES rewizje(id);

-- Blokada odblokowania/cofnięcia akceptacji
CREATE FUNCTION trigger_prevent_unlock_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_accepted = TRUE AND NEW.is_locked = FALSE THEN
        RAISE EXCEPTION 'Nie mozna odblokowac zaakceptowanej rewizji';
    END IF;
    IF OLD.is_accepted = TRUE AND NEW.is_accepted = FALSE THEN
        RAISE EXCEPTION 'Nie mozna cofnac akceptacji rewizji';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rewizje_prevent_unlock_accepted
    BEFORE UPDATE ON rewizje
    FOR EACH ROW EXECUTE FUNCTION trigger_prevent_unlock_accepted();
```

### 3.12 Business Logic: Zamówienia (5 tabel)

```sql
CREATE TABLE zamowienia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    rewizja_id UUID NOT NULL REFERENCES rewizje(id),
    dostawca_id UUID NOT NULL REFERENCES dostawcy(id),
    numer VARCHAR(50) NOT NULL,  -- auto: ZAM/YYYY/NNN
    status zamowienie_status NOT NULL DEFAULT 'draft',
    data_zamowienia DATE,
    data_dostawy_planowana DATE,
    uwagi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT zamowienia_numer_unique UNIQUE(organization_id, numer)
);

CREATE TABLE zamowienie_pozycje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zamowienie_id UUID NOT NULL REFERENCES zamowienia(id) ON DELETE CASCADE,
    produkt_id UUID REFERENCES produkty(id) ON DELETE SET NULL,
    nazwa VARCHAR(255) NOT NULL,
    jednostka VARCHAR(20),
    ilosc_zamowiona DECIMAL(12,3) NOT NULL,
    cena_jednostkowa DECIMAL(12,2) NOT NULL,
    wartosc DECIMAL(14,2) GENERATED ALWAYS AS (ilosc_zamowiona * cena_jednostkowa) STORED,
    ilosc_dostarczona DECIMAL(12,3) DEFAULT 0,  -- trigger-updated SUM
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zamowienie_pozycje_zrodla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zamowienie_pozycja_id UUID NOT NULL REFERENCES zamowienie_pozycje(id) ON DELETE CASCADE,
    kosztorys_skladowa_m_id UUID NOT NULL REFERENCES kosztorys_skladowe_materialy(id),
    ilosc DECIMAL(12,4) NOT NULL
);

CREATE TABLE zamowienie_dostawy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zamowienie_id UUID NOT NULL REFERENCES zamowienia(id) ON DELETE CASCADE,
    data_dostawy DATE NOT NULL,
    numer_wz VARCHAR(100),
    uwagi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zamowienie_dostawy_pozycje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zamowienie_dostawa_id UUID NOT NULL REFERENCES zamowienie_dostawy(id) ON DELETE CASCADE,
    zamowienie_pozycja_id UUID NOT NULL REFERENCES zamowienie_pozycje(id) ON DELETE CASCADE,
    ilosc_dostarczona DECIMAL(12,3) NOT NULL
);
```

### 3.13 Business Logic: Umowy (4 tabele)

```sql
CREATE TABLE umowy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    rewizja_id UUID NOT NULL REFERENCES rewizje(id),
    podwykonawca_id UUID NOT NULL REFERENCES podwykonawcy(id),
    numer VARCHAR(50) NOT NULL,  -- auto: UMW/YYYY/NNN
    status umowa_status NOT NULL DEFAULT 'draft',
    data_podpisania DATE,
    warunki_platnosci TEXT,
    uwagi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT umowy_numer_unique UNIQUE(organization_id, numer)
);

CREATE TABLE umowa_pozycje (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umowa_id UUID NOT NULL REFERENCES umowy(id) ON DELETE CASCADE,
    pozycja_biblioteka_id UUID REFERENCES pozycje_biblioteka(id) ON DELETE SET NULL,
    nazwa VARCHAR(500) NOT NULL,
    jednostka VARCHAR(20),
    ilosc DECIMAL(12,3) NOT NULL,
    stawka DECIMAL(12,2) NOT NULL,
    wartosc DECIMAL(14,2) GENERATED ALWAYS AS (ilosc * stawka) STORED,
    ilosc_wykonana DECIMAL(12,3) DEFAULT 0,  -- trigger-updated SUM
    procent_wykonania DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN ilosc > 0 THEN ROUND(ilosc_wykonana / ilosc * 100, 2) ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE umowa_pozycje_zrodla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umowa_pozycja_id UUID NOT NULL REFERENCES umowa_pozycje(id) ON DELETE CASCADE,
    kosztorys_skladowa_r_id UUID NOT NULL REFERENCES kosztorys_skladowe_robocizna(id),
    ilosc DECIMAL(12,4) NOT NULL
);

CREATE TABLE umowa_wykonanie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    umowa_pozycja_id UUID NOT NULL REFERENCES umowa_pozycje(id) ON DELETE CASCADE,
    data_wpisu DATE NOT NULL,
    ilosc_wykonana DECIMAL(12,3) NOT NULL,
    uwagi TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.14 Business Logic: Realizacja

```sql
CREATE TABLE realizacja_wpisy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    zamowienie_id UUID REFERENCES zamowienia(id) ON DELETE SET NULL,
    umowa_id UUID REFERENCES umowy(id) ON DELETE SET NULL,
    typ realizacja_wpis_typ NOT NULL,
    opis VARCHAR(500),
    kwota_netto DECIMAL(12,2) NOT NULL,
    numer_faktury VARCHAR(100),
    data_faktury DATE,
    oplacone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.15 Business Logic: Triggery

```sql
-- Auto-sum: dostawy → ilosc_dostarczona na zamowienie_pozycje
CREATE FUNCTION trigger_update_zamowienie_dostarczona() ...
CREATE TRIGGER zam_dost_poz_update_sum
    AFTER INSERT OR UPDATE OR DELETE ON zamowienie_dostawy_pozycje
    FOR EACH ROW EXECUTE FUNCTION trigger_update_zamowienie_dostarczona();

-- Auto-sum: wykonanie → ilosc_wykonana na umowa_pozycje
CREATE FUNCTION trigger_update_umowa_wykonana() ...
CREATE TRIGGER umowa_wyk_update_sum
    AFTER INSERT OR UPDATE OR DELETE ON umowa_wykonanie
    FOR EACH ROW EXECUTE FUNCTION trigger_update_umowa_wykonana();

-- Auto-numer zamówień: ZAM/YYYY/NNN (skip jeśli numer podany)
CREATE FUNCTION trigger_auto_numer_zamowienia() ...
CREATE TRIGGER zamowienia_auto_numer BEFORE INSERT ON zamowienia ...

-- Auto-numer umów: UMW/YYYY/NNN (skip jeśli numer podany)
CREATE FUNCTION trigger_auto_numer_umowy() ...
CREATE TRIGGER umowy_auto_numer BEFORE INSERT ON umowy ...

-- updated_at (reuse istniejącego trigger_updated_at)
CREATE TRIGGER zamowienia_updated_at BEFORE UPDATE ON zamowienia ...
CREATE TRIGGER umowy_updated_at BEFORE UPDATE ON umowy ...
CREATE TRIGGER realizacja_wpisy_updated_at BEFORE UPDATE ON realizacja_wpisy ...
```

### 3.16 Business Logic: Funkcje draft + agregujące

```sql
-- Generowanie zamówień z zaakceptowanej rewizji (grupowanie per dostawca)
-- private.generate_zamowienia_draft(p_projekt_id, p_rewizja_id) → INTEGER (liczba zamówień)
-- Public wrapper: generate_zamowienia_draft() SECURITY INVOKER

-- Generowanie umów z zaakceptowanej rewizji (grupowanie per podwykonawca)
-- private.generate_umowy_draft(p_projekt_id, p_rewizja_id) → INTEGER (liczba umów)
-- Public wrapper: generate_umowy_draft() SECURITY INVOKER

-- Wywołanie z app:
-- supabase.rpc('generate_zamowienia_draft', { p_projekt_id, p_rewizja_id })
-- supabase.rpc('generate_umowy_draft', { p_projekt_id, p_rewizja_id })

-- UX: agregacja podwykonawców per kategoria/podkategoria
-- get_podwykonawcy_aggregated(p_branza, p_kategoria, p_podkategoria, p_search, p_limit, p_offset)
-- Łańcuch: podwykonawcy → stawki_podwykonawcow → pozycje_biblioteka → kategorie

-- UX: agregacja dostawców per kategoria/podkategoria
-- get_dostawcy_aggregated(p_branza, p_kategoria, p_podkategoria, p_search, p_limit, p_offset)
-- Łańcuch: dostawcy → ceny_dostawcow → produkty → biblioteka_skladowe_materialy → pozycje_biblioteka
```

> Pełne SQL dla funkcji: `docs/plans/2026-02-06-business-logic-db-migration.md`

---

## 4. Flow pracy

### Model kalkulacji:

```
Pozycja: "Malowanie ścian", ilość = 100 m²

Składowe robocizna (is_manual=false):
  - Malarz: norma=0.1 h/m², stawka=50 zł/h
    → koszt = 0.1 × 50 × 100 = 500 zł

Składowe materiały (is_manual=false):
  - Farba: norma=0.15 l/m², cena=40 zł/l
    → koszt = 0.15 × 40 × 100 = 600 zł

R = 500 zł, M = 600 zł
Narzut 30% = 330 zł
RAZEM = 1430 zł
```

**Wzory kalkulacji:**
```
is_manual=false → koszt = norma × cena × kp.ilosc
is_manual=true  → koszt = ilosc × cena
```

### Manual override (is_manual=true):

```
Przypadek: Malowanie 5 m², farba norma=0.15 l/m²
  Auto: 0.15 × 5 = 0.75 l
  Ale user kupuje wiadro: 10 l

User wpisuje ilosc=10 → is_manual=true
Koszt = 10 × 40 zł = 400 zł (nie 0.75 × 40 × 5 = 150 zł)

Zmiana metrażu 5→20 m²:
  - Składowe auto: przeliczane (norma × nowy_metraz)
  - Składowe manual: bez zmian (ilosc=10 zostaje)
```

### Dodawanie pozycji do kosztorysu:

```
1. User wybiera pozycję z biblioteki (pozycje_biblioteka)

2. System KOPIUJE składowe z szablonu:
   biblioteka_skladowe_robocizna → kosztorys_skladowe_robocizna
   biblioteka_skladowe_materialy → kosztorys_skladowe_materialy
   (is_manual=false, ilosc=NULL dla wszystkich)

3. System PODPOWIADA ceny:
   - Z cennika (ceny_dostawcow, stawki_podwykonawcow)
   - Lub z domyślnych w bibliotece (stawka_domyslna, cena_domyslna)

4. User EDYTUJE wartości w kosztorysie:
   - Zmienia stawkę/cenę
   - Zmienia normę
   - Zmienia ilość pozycji (kp.ilosc)
   - Zmienia narzut%
   - Wpisuje ręcznie ilosc składowej → is_manual=true

5. SAVE → wszystko zapisane w kosztorys_skladowe_*

6. User wraca jutro → dane są tam gdzie zostawił

7. LOCK rewizji → dane zamrożone, nie można edytować
```

### Zmiana metrażu pozycji (kp.ilosc):

```
Aplikacja przy zmianie kp.ilosc:
1. Dla składowych z is_manual=false:
   - Przelicz w view (norma × cena × nowy_ilosc)
   - Nie trzeba UPDATE (view liczy on-the-fly)

2. Dla składowych z is_manual=true:
   - Nie ruszaj (ilosc pozostaje bez zmian)
   - Koszt = ilosc × cena (stała wartość)
```

### Porównanie rewizji:

```sql
-- Porównanie rev.00 vs rev.01
SELECT
    kp0.nazwa,
    kp0.razem AS "rev.00",
    kp1.razem AS "rev.01",
    kp1.razem - kp0.razem AS "różnica"
FROM kosztorys_pozycje_view kp0
JOIN kosztorys_pozycje_view kp1
    ON kp0.pozycja_biblioteka_id = kp1.pozycja_biblioteka_id
JOIN rewizje r0 ON r0.id = kp0.rewizja_id
JOIN rewizje r1 ON r1.id = kp1.rewizja_id
WHERE r0.numer = 0 AND r1.numer = 1
  AND r0.projekt_id = r1.projekt_id;
```

### Kopiowanie rewizji:

```sql
-- Kopia rev.00 jako "Po negocjacjach"
SELECT copy_revision('uuid-rev-00', 'Po negocjacjach');
-- → Nowa rewizja z pełną kopią pozycji i składowych
```

---

## 5. Indeksy (Performance)

| Tabela | Index | Cel |
|--------|-------|-----|
| `organization_members` | `idx_org_members_user` | RLS lookup |
| `projekty` | `idx_projekty_org` | Filtrowanie po organizacji |
| `projekty` | `idx_projekty_slug` | Lookup po slug |
| `rewizje` | `idx_rewizje_projekt` | JOIN z projekty |
| `kosztorys_pozycje` | `idx_kosztorys_rewizja` | JOIN z rewizje |
| `kosztorys_pozycje` | `idx_kosztorys_pozycje_org` | RLS performance |
| `kosztorys_skladowe_robocizna` | `idx_ksz_skladowe_r_pozycja` | JOIN z pozycje |
| `kosztorys_skladowe_materialy` | `idx_ksz_skladowe_m_pozycja` | JOIN z pozycje |
| `ceny_dostawcow` | `idx_ceny_produkt` | Lookup ceny produktu |
| `pozycje_biblioteka` | `idx_pozycje_kod` | Prefix search (BUD.03.%) |

### Indeksy dla raportów (opcjonalne):
| Tabela | Index | Cel |
|--------|-------|-----|
| `kosztorys_skladowe_robocizna` | `idx_ksz_skladowe_r_podwykonawca` | Ile pracy dla podwykonawcy |
| `kosztorys_skladowe_materialy` | `idx_ksz_skladowe_m_produkt` | Ile użyć produktu |
| `kosztorys_skladowe_materialy` | `idx_ksz_skladowe_m_dostawca` | Zakupy od dostawcy |

### Indeksy Business Logic (27 nowych):

| Tabela | Index | Cel |
|--------|-------|-----|
| `zamowienia` | `idx_zamowienia_org`, `_projekt`, `_dostawca`, `_rewizja`, `_status` | RLS, filtrowanie, JOINy |
| `zamowienie_pozycje` | `idx_zam_pozycje_zamowienie`, `_produkt` | JOIN z zamowienia |
| `zamowienie_pozycje_zrodla` | `idx_zam_poz_zrodla_pozycja`, `_skladowa` | Traceability |
| `zamowienie_dostawy` | `idx_zam_dostawy_zamowienie` | JOIN z zamowienia |
| `zamowienie_dostawy_pozycje` | `idx_zam_dost_poz_dostawa`, `_pozycja` | Trigger SUM |
| `umowy` | `idx_umowy_org`, `_projekt`, `_podwykonawca`, `_rewizja`, `_status` | RLS, filtrowanie, JOINy |
| `umowa_pozycje` | `idx_umowa_pozycje_umowa`, `_poz_bib` | JOIN z umowy |
| `umowa_pozycje_zrodla` | `idx_umowa_poz_zrodla_pozycja`, `_skladowa` | Traceability |
| `umowa_wykonanie` | `idx_umowa_wykonanie_pozycja` | Trigger SUM |
| `realizacja_wpisy` | `idx_realizacja_org`, `_projekt`, `_zamowienie`, `_umowa`, `_typ` | RLS, filtrowanie |

---

## 6. Security Notes

### Views z RLS
Wszystkie views używają `security_invoker = true` aby wymuszać RLS policies:
- `kosztorys_pozycje_view` - respektuje RLS na `kosztorys_pozycje`
- `rewizje_summary` - respektuje RLS na `rewizje`

### Security Definer Functions
Funkcje SECURITY DEFINER są w `private` schema, niedostępne przez API:
- `private.copy_revision()` - deep copy rewizji
- `private.generate_zamowienia_draft()` - generowanie zamówień z zaakceptowanej rewizji
- `private.generate_umowy_draft()` - generowanie umów z zaakceptowanej rewizji

Public wrappers używają SECURITY INVOKER dla bezpieczeństwa.

### RLS Policies - Role
- `TO authenticated` - dla danych prywatnych (projekty, kosztorysy, zamówienia, umowy)
- `TO authenticated, anon` - dla danych publicznych/systemowych (kategorie, produkty z `organization_id IS NULL`)

### RLS Patterns (Business Logic)
| Pattern | Tabele | Opis |
|---------|--------|------|
| A (direct org_id) | zamowienia, umowy, realizacja_wpisy | Bezpośredni `organization_id IN (SELECT user_organizations())` |
| B (1 JOIN) | zamowienie_pozycje, zamowienie_dostawy, umowa_pozycje | Przez parent FK → org_id |
| B×2 (2 JOINy) | zamowienie_pozycje_zrodla, zamowienie_dostawy_pozycje, umowa_pozycje_zrodla, umowa_wykonanie | Przez 2 JOINy → org_id |

### Ochrona akceptacji
- `is_accepted = TRUE` → nie można odblokować rewizji (`is_locked = FALSE`)
- `is_accepted = TRUE` → nie można cofnąć akceptacji (`is_accepted = FALSE`)
- Trigger: `rewizje_prevent_unlock_accepted`

---

## 7. Weryfikacja

Po implementacji:

1. **Supabase Dashboard** → sprawdź tabele, RLS, triggers, views
2. **TypeScript types**:
   ```bash
   supabase gen types typescript --project-id <ID> > lib/supabase/database.types.ts
   ```
3. **Test kalkulacji (view) - auto**:
   ```sql
   -- Pozycja: 100 m², składowa: norma=0.15, cena=40, is_manual=false
   -- Oczekiwany koszt: 0.15 × 40 × 100 = 600 zł
   SELECT nazwa, ilosc, m_jednostkowy, m_materialy, razem
   FROM kosztorys_pozycje_view WHERE id = 'uuid';
   ```
4. **Test kalkulacji (view) - manual override**:
   ```sql
   -- Składowa: is_manual=true, ilosc=10, cena=40
   -- Oczekiwany koszt: 10 × 40 = 400 zł (norma ignorowana)
   UPDATE kosztorys_skladowe_materialy
   SET is_manual = true, ilosc = 10 WHERE id = 'skladowa-uuid';

   SELECT m_materialy FROM kosztorys_pozycje_view WHERE id = 'pozycja-uuid';
   -- Powinno zawierać 400 zł z tej składowej
   ```
4. **Test flow dodawania pozycji**:
   - Dodaj pozycję z biblioteki
   - Edytuj cenę/normę składowej
   - Zapisz
   - Odśwież → wartości zachowane
5. **Test locked revision**:
   ```sql
   -- Zablokuj rewizję
   UPDATE rewizje SET is_locked = TRUE WHERE id = 'uuid';
   -- Próba edycji powinna rzucić błąd
   UPDATE kosztorys_pozycje SET ilosc = 200 WHERE rewizja_id = 'uuid';
   -- ERROR: Nie można modyfikować pozycji w zablokowanej rewizji
   ```
6. **Test copy_revision**:
   ```sql
   SELECT copy_revision('uuid-rewizji', 'Nowa wersja');
   -- Sprawdź czy pozycje i składowe skopiowane
   -- Nowa rewizja powinna być UNLOCKED
   ```
7. **Test porównania rewizji**:
   ```sql
   SELECT * FROM rewizje_summary WHERE projekt_id = 'uuid';
   ```
8. **Test RLS**:
   - User A nie widzi projektów User B
   - Oba widzą systemowe kategorie (org_id IS NULL)
   - User nie może kopiować rewizji z cudzego projektu

---

## 8. Pliki do utworzenia

| Plik | Akcja |
|------|-------|
| `supabase/migrations/001_types.sql` | CREATE |
| `supabase/migrations/002_organizations.sql` | CREATE |
| `supabase/migrations/003_narzuty_domyslne.sql` | CREATE |
| `supabase/migrations/004_cennik.sql` | CREATE |
| `supabase/migrations/005_biblioteka.sql` | CREATE |
| `supabase/migrations/006_kosztorys.sql` | CREATE |
| `supabase/migrations/007_views.sql` | CREATE |
| `supabase/migrations/008_functions.sql` | CREATE |
| `supabase/migrations/009_rls.sql` | CREATE |
| `supabase/migrations/010_seed.sql` | CREATE |
| `lib/supabase/database.types.ts` | GENERATE |

---

## 9. Schemat Relacji (Business Logic)

```
projekty
├── rewizje (+ is_accepted, accepted_at)
│   ├── kosztorys_pozycje
│   │   ├── kosztorys_skladowe_materialy ──┐
│   │   └── kosztorys_skladowe_robocizna ──┤
│   │                                      │ zrodla (traceability)
│   ├── zamowienia ─── dostawcy            │
│   │   └── zamowienie_pozycje ◄───────────┤ zamowienie_pozycje_zrodla
│   │       └── zamowienie_dostawy         │
│   │           └── zamowienie_dostawy_pozycje (trigger → ilosc_dostarczona)
│   │                                      │
│   └── umowy ─── podwykonawcy             │
│       └── umowa_pozycje ◄────────────────┘ umowa_pozycje_zrodla
│           └── umowa_wykonanie (trigger → ilosc_wykonana)
│
└── realizacja_wpisy (faktury → zamowienie_id / umowa_id)

projekty.accepted_rewizja_id ──→ rewizje.id
```

---

## 10. Referencje

- **Wireframe data model**: `/home/artur/Projekty/wireframe/docs/DATA-MODEL.md`
- **Business logic**: `/home/artur/Projekty/wireframe/docs/BUSINESS-LOGIC.md` + `docs/BUSINESS-LOGIC.md`
- **Business logic migration plan**: `docs/plans/2026-02-06-business-logic-db-migration.md`
- **Mock data**: `/home/artur/Projekty/wireframe/js/data/*.js`
- **Supabase RLS docs**: Context7 `/supabase/supabase`
