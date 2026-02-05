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
