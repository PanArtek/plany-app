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
