# Supabase Database Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up complete Supabase database schema with 17 tables, RLS policies, triggers, views, and functions for the PLANY App cost estimation system.

**Architecture:** Multi-tenant PostgreSQL with organization-based RLS. Kosztorys (estimate) is the source of truth - prices are copied from library/price lists and stored independently. Revisions are full copies with lock mechanism.

**Tech Stack:** Supabase (PostgreSQL), SQL migrations, TypeScript types generation

---

## Prerequisites

Before starting, ensure:
- Supabase CLI installed (`supabase --version`)
- Supabase project created and linked
- `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Task 1: Initialize Supabase Migrations Directory

**Files:**
- Create: `supabase/migrations/` directory structure

**Step 1: Check Supabase CLI is installed**

Run: `supabase --version`
Expected: Version number (e.g., `1.x.x`)

**Step 2: Initialize Supabase (if not done)**

Run: `supabase init`
Expected: Creates `supabase/` directory with `config.toml`

If already initialized, skip this step.

**Step 3: Link to remote project (if not done)**

Run: `supabase link --project-ref <PROJECT_ID>`
Expected: Successfully linked to project

**Step 4: Commit**

```bash
git add supabase/
git commit -m "chore: initialize supabase directory structure"
```

---

## Task 2: Create Types Migration (001)

**Files:**
- Create: `supabase/migrations/001_types.sql`

**Step 1: Create the migration file**

```sql
-- 001_types.sql
-- Custom ENUM types for PLANY App

CREATE TYPE position_type AS ENUM ('robocizna', 'material', 'komplet');
CREATE TYPE project_status AS ENUM ('draft', 'ofertowanie', 'realizacja', 'zamkniety', 'odrzucony');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE branza_kod AS ENUM ('BUD', 'ELE', 'SAN', 'TEL', 'HVC');
```

**Step 2: Apply migration locally**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify types exist**

Run: `supabase db execute "SELECT typname FROM pg_type WHERE typname IN ('position_type', 'project_status', 'org_role', 'branza_kod');"`
Expected: 4 rows returned

**Step 4: Commit**

```bash
git add supabase/migrations/001_types.sql
git commit -m "feat(db): add custom ENUM types"
```

---

## Task 3: Create Organizations Migration (002)

**Files:**
- Create: `supabase/migrations/002_organizations.sql`

**Step 1: Create the migration file**

```sql
-- 002_organizations.sql
-- Organizations and members (multi-tenancy foundation)

-- Organizacje (firmy/zespoly)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazwa VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Czlonkowie organizacji
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

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify tables exist**

Run: `supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('organizations', 'organization_members');"`
Expected: 2 rows returned

**Step 4: Commit**

```bash
git add supabase/migrations/002_organizations.sql
git commit -m "feat(db): add organizations and members tables"
```

---

## Task 4: Create Narzuty Domyslne Migration (003)

**Files:**
- Create: `supabase/migrations/003_narzuty_domyslne.sql`

**Step 1: Create the migration file**

```sql
-- 003_narzuty_domyslne.sql
-- Default markup percentages per branch (just hints!)

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

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied, 5 default records inserted

**Step 3: Verify seed data**

Run: `supabase db execute "SELECT branza_kod, narzut_percent FROM narzuty_domyslne WHERE organization_id IS NULL;"`
Expected: 5 rows with BUD=30, ELE=25, SAN=28, TEL=25, HVC=22

**Step 4: Commit**

```bash
git add supabase/migrations/003_narzuty_domyslne.sql
git commit -m "feat(db): add default markup rates table"
```

---

## Task 5: Create Cennik Migration (004)

**Files:**
- Create: `supabase/migrations/004_cennik.sql`

**Step 1: Create the migration file**

```sql
-- 004_cennik.sql
-- Price catalog tables (products, suppliers, subcontractors, rates)

-- Produkty (katalog materialow)
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

-- Ceny dostawcow (CENNIK = PODPOWIEDZ)
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

-- Stawki podwykonawcow (CENNIK = PODPOWIEDZ)
CREATE TABLE stawki_podwykonawcow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podwykonawca_id UUID NOT NULL REFERENCES podwykonawcy(id) ON DELETE CASCADE,
    nazwa_stawki VARCHAR(255) NOT NULL,
    stawka DECIMAL(12,2) NOT NULL,
    jednostka VARCHAR(20) DEFAULT 'h',
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price lookups
CREATE INDEX idx_ceny_produkt ON ceny_dostawcow(produkt_id);
CREATE INDEX idx_ceny_dostawca ON ceny_dostawcow(dostawca_id);
CREATE INDEX idx_stawki_podwykonawca ON stawki_podwykonawcow(podwykonawca_id);
```

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify tables exist**

Run: `supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('produkty', 'dostawcy', 'ceny_dostawcow', 'podwykonawcy', 'stawki_podwykonawcow');"`
Expected: 5 rows returned

**Step 4: Commit**

```bash
git add supabase/migrations/004_cennik.sql
git commit -m "feat(db): add price catalog tables"
```

---

## Task 6: Create Biblioteka Migration (005)

**Files:**
- Create: `supabase/migrations/005_biblioteka.sql`

**Step 1: Create the migration file**

```sql
-- 005_biblioteka.sql
-- Library tables (categories, position templates, component templates)

-- Kategorie (hierarchia: branza -> kategoria -> podkategoria)
CREATE TABLE kategorie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES kategorie(id) ON DELETE CASCADE,
    kod VARCHAR(20) NOT NULL,
    pelny_kod VARCHAR(50),
    nazwa VARCHAR(255) NOT NULL,
    poziom INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT kategorie_kod_unique UNIQUE (organization_id, pelny_kod)
);

-- Pozycje biblioteka (SZABLONY)
CREATE TABLE pozycje_biblioteka (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    kategoria_id UUID REFERENCES kategorie(id) ON DELETE SET NULL,
    kod VARCHAR(50) NOT NULL,
    nazwa VARCHAR(500) NOT NULL,
    opis TEXT,
    jednostka VARCHAR(20) NOT NULL DEFAULT 'm2',
    typ position_type DEFAULT 'komplet',
    aktywny BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pozycje_kod_unique UNIQUE (organization_id, kod)
);

-- Skladowe robocizna w BIBLIOTECE (szablon, ceny opcjonalne)
CREATE TABLE biblioteka_skladowe_robocizna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    opis VARCHAR(500) NOT NULL,
    podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL,
    stawka_domyslna DECIMAL(12,2),
    norma_domyslna DECIMAL(12,4) DEFAULT 1,
    jednostka VARCHAR(20) DEFAULT 'h',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bib_skladowe_r_unique UNIQUE (pozycja_biblioteka_id, lp)
);

-- Skladowe materialy w BIBLIOTECE (szablon, ceny opcjonalne)
CREATE TABLE biblioteka_skladowe_materialy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    nazwa VARCHAR(255) NOT NULL,
    produkt_id UUID REFERENCES produkty(id) ON DELETE SET NULL,
    dostawca_id UUID REFERENCES dostawcy(id) ON DELETE SET NULL,
    cena_domyslna DECIMAL(12,2),
    norma_domyslna DECIMAL(12,4) DEFAULT 1,
    jednostka VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bib_skladowe_m_unique UNIQUE (pozycja_biblioteka_id, lp)
);

CREATE INDEX idx_pozycje_kategoria ON pozycje_biblioteka(kategoria_id);
CREATE INDEX idx_pozycje_kod ON pozycje_biblioteka(kod varchar_pattern_ops);
```

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify tables exist**

Run: `supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%biblioteka%' OR table_name = 'kategorie';"`
Expected: 4 rows (kategorie, pozycje_biblioteka, biblioteka_skladowe_robocizna, biblioteka_skladowe_materialy)

**Step 4: Commit**

```bash
git add supabase/migrations/005_biblioteka.sql
git commit -m "feat(db): add library tables for categories and position templates"
```

---

## Task 7: Create Kosztorys Migration (006)

**Files:**
- Create: `supabase/migrations/006_kosztorys.sql`

**Step 1: Create the migration file**

```sql
-- 006_kosztorys.sql
-- Cost estimation tables (projects, revisions, positions, components)

-- Projekty
CREATE TABLE projekty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nazwa VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    klient VARCHAR(255),
    adres TEXT,
    powierzchnia DECIMAL(10,2),
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
    numer INTEGER NOT NULL,
    nazwa VARCHAR(100),
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
    ilosc DECIMAL(12,3) NOT NULL DEFAULT 1,
    jednostka VARCHAR(20),
    narzut_percent DECIMAL(5,2) NOT NULL DEFAULT 30,
    notatki TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT kosztorys_lp_unique UNIQUE (rewizja_id, lp)
);

-- Skladowe robocizna w KOSZTORYSIE (ZRODLO PRAWDY!)
CREATE TABLE kosztorys_skladowe_robocizna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kosztorys_pozycja_id UUID NOT NULL REFERENCES kosztorys_pozycje(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    opis VARCHAR(500) NOT NULL,
    podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL,
    stawka DECIMAL(12,2) NOT NULL,
    norma DECIMAL(12,4) NOT NULL DEFAULT 1,
    ilosc DECIMAL(12,4),
    jednostka VARCHAR(20) DEFAULT 'h',
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ksz_skladowe_r_unique UNIQUE (kosztorys_pozycja_id, lp),
    CONSTRAINT ksz_skladowe_r_manual_ilosc CHECK (
        (is_manual = FALSE) OR (is_manual = TRUE AND ilosc IS NOT NULL)
    )
);

-- Skladowe materialy w KOSZTORYSIE (ZRODLO PRAWDY!)
CREATE TABLE kosztorys_skladowe_materialy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kosztorys_pozycja_id UUID NOT NULL REFERENCES kosztorys_pozycje(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    nazwa VARCHAR(255) NOT NULL,
    produkt_id UUID REFERENCES produkty(id) ON DELETE SET NULL,
    dostawca_id UUID REFERENCES dostawcy(id) ON DELETE SET NULL,
    cena DECIMAL(12,2) NOT NULL,
    norma DECIMAL(12,4) NOT NULL DEFAULT 1,
    ilosc DECIMAL(12,4),
    jednostka VARCHAR(20),
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ksz_skladowe_m_unique UNIQUE (kosztorys_pozycja_id, lp),
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
CREATE INDEX idx_kosztorys_pozycje_org ON kosztorys_pozycje(organization_id);

-- Indexes for reporting
CREATE INDEX idx_ksz_skladowe_r_podwykonawca ON kosztorys_skladowe_robocizna(podwykonawca_id);
CREATE INDEX idx_ksz_skladowe_m_produkt ON kosztorys_skladowe_materialy(produkt_id);
CREATE INDEX idx_ksz_skladowe_m_dostawca ON kosztorys_skladowe_materialy(dostawca_id);
```

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify tables exist**

Run: `supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projekty', 'rewizje', 'kosztorys_pozycje', 'kosztorys_skladowe_robocizna', 'kosztorys_skladowe_materialy');"`
Expected: 5 rows returned

**Step 4: Commit**

```bash
git add supabase/migrations/006_kosztorys.sql
git commit -m "feat(db): add cost estimation tables"
```

---

## Task 8: Create Views Migration (007)

**Files:**
- Create: `supabase/migrations/007_views.sql`

**Step 1: Create the migration file**

```sql
-- 007_views.sql
-- Calculated views for cost positions and revision summaries

-- View: kosztorys_pozycje z wyliczonymi R, M, Razem
-- Wzor kalkulacji z obsluga manual override:
--   is_manual=false -> koszt = norma * cena * kp.ilosc
--   is_manual=true  -> koszt = ilosc * cena (user override)
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

    -- Koszt jednostkowy (na 1 m2, 1 szt, etc.) - tylko dla skladowych auto
    COALESCE(r.suma_jedn, 0) AS r_jednostkowy,
    COALESCE(m.suma_jedn, 0) AS m_jednostkowy,

    -- Koszt calkowity R (auto + manual)
    COALESCE(r.suma_jedn, 0) * kp.ilosc + COALESCE(r.suma_manual, 0) AS r_robocizna,

    -- Koszt calkowity M (auto + manual)
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
        SUM(CASE WHEN NOT is_manual THEN stawka * norma ELSE 0 END) AS suma_jedn,
        SUM(CASE WHEN is_manual THEN stawka * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_robocizna
    GROUP BY kosztorys_pozycja_id
) r ON r.kosztorys_pozycja_id = kp.id

LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
        SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_materialy
    GROUP BY kosztorys_pozycja_id
) m ON m.kosztorys_pozycja_id = kp.id;

-- View: podsumowanie rewizji
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

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify views exist**

Run: `supabase db execute "SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name IN ('kosztorys_pozycje_view', 'rewizje_summary');"`
Expected: 2 rows returned

**Step 4: Commit**

```bash
git add supabase/migrations/007_views.sql
git commit -m "feat(db): add calculated views for cost positions"
```

---

## Task 9: Create Functions Migration (008)

**Files:**
- Create: `supabase/migrations/008_functions.sql`

**Step 1: Create the migration file**

```sql
-- 008_functions.sql
-- Triggers and functions

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
    SELECT is_locked INTO revision_locked
    FROM rewizje WHERE id = COALESCE(NEW.rewizja_id, OLD.rewizja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie mozna modyfikowac pozycji w zablokowanej rewizji';
    END IF;

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

-- Trigger: blokada edycji skladowych w locked rewizji
CREATE OR REPLACE FUNCTION trigger_check_skladowe_locked()
RETURNS TRIGGER AS $$
DECLARE
    revision_locked BOOLEAN;
BEGIN
    SELECT r.is_locked INTO revision_locked
    FROM kosztorys_pozycje kp
    JOIN rewizje r ON r.id = kp.rewizja_id
    WHERE kp.id = COALESCE(NEW.kosztorys_pozycja_id, OLD.kosztorys_pozycja_id);

    IF revision_locked = TRUE THEN
        RAISE EXCEPTION 'Nie mozna modyfikowac skladowych w zablokowanej rewizji';
    END IF;

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

-- Deep copy rewizji z pozycjami i skladowymi (PRIVATE)
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
    -- Walidacja uprawnien
    SELECT p.organization_id INTO source_org_id
    FROM rewizje r
    JOIN projekty p ON p.id = r.projekt_id
    WHERE r.id = source_rewizja_id;

    IF source_org_id IS NULL THEN
        RAISE EXCEPTION 'Rewizja nie istnieje';
    END IF;

    IF source_org_id NOT IN (SELECT user_organizations()) THEN
        RAISE EXCEPTION 'Brak uprawnien do kopiowania tej rewizji';
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
        INSERT INTO kosztorys_pozycje (
            organization_id, rewizja_id, pozycja_biblioteka_id,
            lp, nazwa, ilosc, jednostka, narzut_percent, notatki
        ) VALUES (
            old_pozycja.organization_id, new_rewizja_id, old_pozycja.pozycja_biblioteka_id,
            old_pozycja.lp, old_pozycja.nazwa, old_pozycja.ilosc, old_pozycja.jednostka,
            old_pozycja.narzut_percent, old_pozycja.notatki
        ) RETURNING id INTO new_pozycja_id;

        INSERT INTO kosztorys_skladowe_robocizna (
            kosztorys_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        )
        SELECT
            new_pozycja_id, lp, opis, podwykonawca_id,
            stawka, norma, ilosc, jednostka, is_manual
        FROM kosztorys_skladowe_robocizna
        WHERE kosztorys_pozycja_id = old_pozycja.id;

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

-- Public wrapper (SECURITY INVOKER)
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

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify triggers exist**

Run: `supabase db execute "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' LIMIT 10;"`
Expected: Multiple triggers listed

**Step 4: Commit**

```bash
git add supabase/migrations/008_functions.sql
git commit -m "feat(db): add triggers and functions"
```

---

## Task 10: Create RLS Policies Migration (009)

**Files:**
- Create: `supabase/migrations/009_rls.sql`

**Step 1: Create the migration file**

```sql
-- 009_rls.sql
-- Row Level Security policies

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

-- ORGANIZATIONS & MEMBERS
CREATE POLICY "organizations_select" ON organizations FOR SELECT
    TO authenticated USING (id IN (SELECT user_organizations()));

CREATE POLICY "org_members_select" ON organization_members FOR SELECT
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- PROJEKTY (full CRUD)
CREATE POLICY "projekty_select" ON projekty FOR SELECT
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_insert" ON projekty FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_update" ON projekty FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "projekty_delete" ON projekty FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- PRODUKTY (SELECT for all, CUD for org members)
CREATE POLICY "produkty_select" ON produkty FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_insert" ON produkty FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_update" ON produkty FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "produkty_delete" ON produkty FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- DOSTAWCY
CREATE POLICY "dostawcy_select" ON dostawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_insert" ON dostawcy FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_update" ON dostawcy FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "dostawcy_delete" ON dostawcy FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- PODWYKONAWCY
CREATE POLICY "podwykonawcy_select" ON podwykonawcy FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_insert" ON podwykonawcy FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_update" ON podwykonawcy FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "podwykonawcy_delete" ON podwykonawcy FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- REWIZJE (through projekty)
CREATE POLICY "rewizje_select" ON rewizje FOR SELECT
    TO authenticated USING (EXISTS (
        SELECT 1 FROM projekty p WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_insert" ON rewizje FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM projekty p WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_update" ON rewizje FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM projekty p WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "rewizje_delete" ON rewizje FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM projekty p WHERE p.id = projekt_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- CENY DOSTAWCOW (through dostawcy)
CREATE POLICY "ceny_dostawcow_select" ON ceny_dostawcow FOR SELECT
    TO authenticated, anon USING (EXISTS (
        SELECT 1 FROM dostawcy d WHERE d.id = dostawca_id
        AND (d.organization_id IS NULL OR d.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "ceny_dostawcow_insert" ON ceny_dostawcow FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM dostawcy d WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_update" ON ceny_dostawcow FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM dostawcy d WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ceny_dostawcow_delete" ON ceny_dostawcow FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM dostawcy d WHERE d.id = dostawca_id
        AND d.organization_id IN (SELECT user_organizations())
    ));

-- STAWKI PODWYKONAWCOW (through podwykonawcy)
CREATE POLICY "stawki_select" ON stawki_podwykonawcow FOR SELECT
    TO authenticated, anon USING (EXISTS (
        SELECT 1 FROM podwykonawcy p WHERE p.id = podwykonawca_id
        AND (p.organization_id IS NULL OR p.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "stawki_insert" ON stawki_podwykonawcow FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM podwykonawcy p WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_update" ON stawki_podwykonawcow FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM podwykonawcy p WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "stawki_delete" ON stawki_podwykonawcow FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM podwykonawcy p WHERE p.id = podwykonawca_id
        AND p.organization_id IN (SELECT user_organizations())
    ));

-- BIBLIOTEKA SKLADOWE ROBOCIZNA (through pozycje_biblioteka)
CREATE POLICY "bib_skladowe_r_select" ON biblioteka_skladowe_robocizna FOR SELECT
    TO authenticated, anon USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_r_insert" ON biblioteka_skladowe_robocizna FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_update" ON biblioteka_skladowe_robocizna FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_r_delete" ON biblioteka_skladowe_robocizna FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- BIBLIOTEKA SKLADOWE MATERIALY (through pozycje_biblioteka)
CREATE POLICY "bib_skladowe_m_select" ON biblioteka_skladowe_materialy FOR SELECT
    TO authenticated, anon USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND (pb.organization_id IS NULL OR pb.organization_id IN (SELECT user_organizations()))
    ));
CREATE POLICY "bib_skladowe_m_insert" ON biblioteka_skladowe_materialy FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_update" ON biblioteka_skladowe_materialy FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "bib_skladowe_m_delete" ON biblioteka_skladowe_materialy FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM pozycje_biblioteka pb WHERE pb.id = pozycja_biblioteka_id
        AND pb.organization_id IN (SELECT user_organizations())
    ));

-- HYBRID TABLES (org_id = NULL for system templates)
CREATE POLICY "kategorie_select" ON kategorie FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_insert" ON kategorie FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_update" ON kategorie FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kategorie_delete" ON kategorie FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "pozycje_biblioteka_select" ON pozycje_biblioteka FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_insert" ON pozycje_biblioteka FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_update" ON pozycje_biblioteka FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "pozycje_biblioteka_delete" ON pozycje_biblioteka FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

CREATE POLICY "narzuty_select" ON narzuty_domyslne FOR SELECT
    TO authenticated, anon
    USING (organization_id IS NULL OR organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_insert" ON narzuty_domyslne FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_update" ON narzuty_domyslne FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "narzuty_delete" ON narzuty_domyslne FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- KOSZTORYS POZYCJE
CREATE POLICY "kosztorys_pozycje_select" ON kosztorys_pozycje FOR SELECT
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_insert" ON kosztorys_pozycje FOR INSERT
    TO authenticated WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_update" ON kosztorys_pozycje FOR UPDATE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "kosztorys_pozycje_delete" ON kosztorys_pozycje FOR DELETE
    TO authenticated USING (organization_id IN (SELECT user_organizations()));

-- KOSZTORYS SKLADOWE ROBOCIZNA (through kosztorys_pozycje)
CREATE POLICY "ksz_skladowe_r_select" ON kosztorys_skladowe_robocizna FOR SELECT
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_insert" ON kosztorys_skladowe_robocizna FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_update" ON kosztorys_skladowe_robocizna FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_r_delete" ON kosztorys_skladowe_robocizna FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));

-- KOSZTORYS SKLADOWE MATERIALY (through kosztorys_pozycje)
CREATE POLICY "ksz_skladowe_m_select" ON kosztorys_skladowe_materialy FOR SELECT
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_insert" ON kosztorys_skladowe_materialy FOR INSERT
    TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_update" ON kosztorys_skladowe_materialy FOR UPDATE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "ksz_skladowe_m_delete" ON kosztorys_skladowe_materialy FOR DELETE
    TO authenticated USING (EXISTS (
        SELECT 1 FROM kosztorys_pozycje kp WHERE kp.id = kosztorys_pozycja_id
        AND kp.organization_id IN (SELECT user_organizations())
    ));
```

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied successfully

**Step 3: Verify RLS is enabled**

Run: `supabase db execute "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"`
Expected: 17 rows with rowsecurity = true

**Step 4: Commit**

```bash
git add supabase/migrations/009_rls.sql
git commit -m "feat(db): add RLS policies for all tables"
```

---

## Task 11: Create Seed Data Migration (010)

**Files:**
- Create: `supabase/migrations/010_seed.sql`

**Step 1: Create the migration file**

```sql
-- 010_seed.sql
-- System seed data (organization_id = NULL)

-- Systemowe kategorie (branze)
INSERT INTO kategorie (organization_id, kod, pelny_kod, nazwa, poziom) VALUES
    (NULL, 'BUD', 'BUD', 'Budowlane', 1),
    (NULL, 'ELE', 'ELE', 'Elektryczne', 1),
    (NULL, 'SAN', 'SAN', 'Sanitarne', 1),
    (NULL, 'TEL', 'TEL', 'Teletechniczne', 1),
    (NULL, 'HVC', 'HVC', 'HVAC', 1);

-- Podkategorie BUD
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '01', 'Prace rozbiórkowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '02', 'Prace murowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
INSERT INTO kategorie (organization_id, parent_id, kod, nazwa, poziom)
SELECT NULL, id, '03', 'Prace wykonczeniowe', 2 FROM kategorie WHERE pelny_kod = 'BUD';
```

**Step 2: Apply migration**

Run: `supabase db reset`
Expected: Migration applied, seed data inserted

**Step 3: Verify seed data**

Run: `supabase db execute "SELECT pelny_kod, nazwa, poziom FROM kategorie ORDER BY pelny_kod;"`
Expected: 8 rows (5 branches + 3 BUD subcategories)

**Step 4: Commit**

```bash
git add supabase/migrations/010_seed.sql
git commit -m "feat(db): add system seed data for categories"
```

---

## Task 12: Generate TypeScript Types

**Files:**
- Create: `lib/supabase/database.types.ts`

**Step 1: Push migrations to remote (if not done)**

Run: `supabase db push`
Expected: All migrations applied to remote database

**Step 2: Generate TypeScript types**

Run: `supabase gen types typescript --project-id <PROJECT_ID> > lib/supabase/database.types.ts`

Replace `<PROJECT_ID>` with your actual Supabase project ID.

Expected: File created with all table types

**Step 3: Verify types file is valid**

Run: `npx tsc lib/supabase/database.types.ts --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add lib/supabase/database.types.ts
git commit -m "feat(db): generate TypeScript types from Supabase schema"
```

---

## Task 13: Verify Calculation Logic (View)

**Files:**
- None (verification only)

**Step 1: Insert test data via SQL**

```sql
-- Create test org and user membership (bypass RLS for test)
INSERT INTO organizations (id, nazwa, slug) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org');

-- Create project
INSERT INTO projekty (id, organization_id, nazwa, slug) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Project', 'test-project');

-- Create revision
INSERT INTO rewizje (id, projekt_id, numer, nazwa) VALUES
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 0, 'Rev 0');

-- Create position (100 m2, 30% markup)
INSERT INTO kosztorys_pozycje (id, organization_id, rewizja_id, lp, nazwa, ilosc, jednostka, narzut_percent) VALUES
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 1, 'Malowanie scian', 100, 'm2', 30);

-- Add labor component (auto: 0.1 h/m2 * 50 zl/h = 5 zl/m2)
INSERT INTO kosztorys_skladowe_robocizna (kosztorys_pozycja_id, lp, opis, stawka, norma, is_manual) VALUES
    ('44444444-4444-4444-4444-444444444444', 1, 'Malarz', 50, 0.1, FALSE);

-- Add material component (auto: 0.15 l/m2 * 40 zl/l = 6 zl/m2)
INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, is_manual) VALUES
    ('44444444-4444-4444-4444-444444444444', 1, 'Farba', 40, 0.15, FALSE);
```

Run: `supabase db execute "<SQL_ABOVE>"`

**Step 2: Verify calculation**

```sql
SELECT
    nazwa, ilosc,
    r_jednostkowy, m_jednostkowy,
    r_robocizna, m_materialy,
    r_plus_m, narzut_wartosc, razem
FROM kosztorys_pozycje_view
WHERE id = '44444444-4444-4444-4444-444444444444';
```

Run: `supabase db execute "<SQL_ABOVE>"`

Expected:
- r_jednostkowy = 5 (0.1 * 50)
- m_jednostkowy = 6 (0.15 * 40)
- r_robocizna = 500 (5 * 100)
- m_materialy = 600 (6 * 100)
- r_plus_m = 1100
- narzut_wartosc = 330 (1100 * 0.30)
- razem = 1430 (1100 * 1.30)

**Step 3: Test manual override**

```sql
-- Add manual material (10 units * 40 zl = 400 zl fixed)
INSERT INTO kosztorys_skladowe_materialy (kosztorys_pozycja_id, lp, nazwa, cena, norma, ilosc, is_manual) VALUES
    ('44444444-4444-4444-4444-444444444444', 2, 'Wiadro farby', 40, 1, 10, TRUE);
```

Run: `supabase db execute "<SQL_ABOVE>"`

**Step 4: Verify manual override included**

```sql
SELECT m_materialy, r_plus_m, razem
FROM kosztorys_pozycje_view
WHERE id = '44444444-4444-4444-4444-444444444444';
```

Expected:
- m_materialy = 1000 (600 auto + 400 manual)
- r_plus_m = 1500
- razem = 1950 (1500 * 1.30)

**Step 5: Cleanup test data**

```sql
DELETE FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Task 14: Verify Locked Revision Trigger

**Files:**
- None (verification only)

**Step 1: Create test data**

```sql
INSERT INTO organizations (id, nazwa, slug) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org');
INSERT INTO projekty (id, organization_id, nazwa, slug) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test', 'test');
INSERT INTO rewizje (id, projekt_id, numer, is_locked) VALUES
    ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 0, TRUE);
INSERT INTO kosztorys_pozycje (id, organization_id, rewizja_id, lp, nazwa, ilosc) VALUES
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 1, 'Test', 1);
```

**Step 2: Try to update locked revision position**

```sql
UPDATE kosztorys_pozycje SET ilosc = 200 WHERE id = '44444444-4444-4444-4444-444444444444';
```

Expected: ERROR "Nie mozna modyfikowac pozycji w zablokowanej rewizji"

**Step 3: Cleanup**

```sql
DELETE FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111';
```

---

## Task 15: Push to Remote and Final Verification

**Files:**
- None

**Step 1: Push all migrations to remote**

Run: `supabase db push`
Expected: All 10 migrations applied

**Step 2: Verify in Supabase Dashboard**

- Go to https://supabase.com/dashboard
- Navigate to your project
- Check Table Editor: 17 tables should exist
- Check Authentication > Policies: RLS policies visible

**Step 3: Run build to ensure no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(db): complete Supabase database setup with RLS and triggers"
```

---

## Summary

| Migration | Tables/Objects |
|-----------|----------------|
| 001_types | 4 ENUM types |
| 002_organizations | organizations, organization_members, user_organizations() |
| 003_narzuty_domyslne | narzuty_domyslne + seed data |
| 004_cennik | produkty, dostawcy, ceny_dostawcow, podwykonawcy, stawki_podwykonawcow |
| 005_biblioteka | kategorie, pozycje_biblioteka, biblioteka_skladowe_* |
| 006_kosztorys | projekty, rewizje, kosztorys_pozycje, kosztorys_skladowe_* |
| 007_views | kosztorys_pozycje_view, rewizje_summary |
| 008_functions | triggers (updated_at, pelny_kod, auto_numer, locked checks), copy_revision(), handle_new_user() |
| 009_rls | RLS policies for all 17 tables |
| 010_seed | System categories (BUD, ELE, SAN, TEL, HVC) |

**Total: 17 tables, 2 views, 60+ RLS policies, 15+ triggers**
