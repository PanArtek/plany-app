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
CREATE TABLE stawki_podwykonawcow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podwykonawca_id UUID NOT NULL REFERENCES podwykonawcy(id) ON DELETE CASCADE,
    nazwa_stawki VARCHAR(255) NOT NULL,  -- np. "Malowanie standard"
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
