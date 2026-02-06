# Migracja DB: Logika Biznesowa (Akceptacja + Zamowienia + Umowy + Realizacja)

**Data:** 2026-02-06
**Zakres:** Cala logika naraz — 10 tabel + 3 enumy + 3 kolumny ALTER + triggery + RLS + indeksy + funkcje
**Referencja:** `docs/BUSINESS-LOGIC.md`

---

## 1. Podsumowanie zmian

| Element | Typ | Ilosc |
|---------|-----|-------|
| Enumy | NOWE | 3 (zamowienie_status, umowa_status, realizacja_wpis_typ) |
| ALTER istniejacych tabel | MODIFY | 3 kolumny (rewizje +2, projekty +1) |
| Nowe tabele | CREATE | 10 |
| Triggery | NOWE | 6 (prevent_unlock, 2x updated_at, 2x auto_sum, auto_numer) |
| RLS policies | NOWE | ~40 (4 per tabela x 10 tabel) |
| Indeksy | NOWE | 27 |
| Funkcje private | NOWE | 2 (generate_zamowienia_draft, generate_umowy_draft) |
| Funkcje public | NOWE | 4 (2 wrappery + 2 agregujace UX) |

---

## 2. Enumy

```sql
CREATE TYPE zamowienie_status AS ENUM (
    'draft', 'wyslane', 'czesciowo', 'dostarczone', 'rozliczone'
);

CREATE TYPE umowa_status AS ENUM (
    'draft', 'wyslana', 'podpisana', 'wykonana', 'rozliczona'
);

CREATE TYPE realizacja_wpis_typ AS ENUM (
    'material', 'robocizna', 'inny'
);
```

---

## 3. ALTER istniejacych tabel

```sql
ALTER TABLE rewizje
    ADD COLUMN is_accepted BOOLEAN DEFAULT FALSE,
    ADD COLUMN accepted_at TIMESTAMPTZ;

ALTER TABLE projekty
    ADD COLUMN accepted_rewizja_id UUID REFERENCES rewizje(id);
```

---

## 4. Nowe tabele

### 4.1 Zamowienia (5 tabel)

```sql
CREATE TABLE zamowienia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    rewizja_id UUID NOT NULL REFERENCES rewizje(id),
    dostawca_id UUID NOT NULL REFERENCES dostawcy(id),
    numer VARCHAR(50) NOT NULL,
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
    ilosc_dostarczona DECIMAL(12,3) DEFAULT 0,
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

### 4.2 Umowy (4 tabele)

```sql
CREATE TABLE umowy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    projekt_id UUID NOT NULL REFERENCES projekty(id) ON DELETE CASCADE,
    rewizja_id UUID NOT NULL REFERENCES rewizje(id),
    podwykonawca_id UUID NOT NULL REFERENCES podwykonawcy(id),
    numer VARCHAR(50) NOT NULL,
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
    ilosc_wykonana DECIMAL(12,3) DEFAULT 0,
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

> **Uwaga:** `umowa_wykonanie` to dodatkowa tabela (nie ma jej w BUSINESS-LOGIC.md).
> Potrzebna jako zrodlo trigger-updated SUM dla `umowa_pozycje.ilosc_wykonana`.

### 4.3 Realizacja (1 tabela)

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

---

## 5. Triggery

### 5.1 Blokada odblokowania zaakceptowanej rewizji

```sql
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

### 5.2 updated_at (reuse istniejacego trigger_updated_at)

```sql
CREATE TRIGGER zamowienia_updated_at BEFORE UPDATE ON zamowienia
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER umowy_updated_at BEFORE UPDATE ON umowy
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER realizacja_wpisy_updated_at BEFORE UPDATE ON realizacja_wpisy
    FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
```

### 5.3 Auto-sum: dostawy -> ilosc_dostarczona

```sql
CREATE FUNCTION trigger_update_zamowienie_dostarczona()
RETURNS TRIGGER AS $$
DECLARE
    v_pozycja_id UUID;
BEGIN
    v_pozycja_id := COALESCE(NEW.zamowienie_pozycja_id, OLD.zamowienie_pozycja_id);

    UPDATE zamowienie_pozycje
    SET ilosc_dostarczona = COALESCE((
        SELECT SUM(ilosc_dostarczona)
        FROM zamowienie_dostawy_pozycje
        WHERE zamowienie_pozycja_id = v_pozycja_id
    ), 0)
    WHERE id = v_pozycja_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zam_dost_poz_update_sum
    AFTER INSERT OR UPDATE OR DELETE ON zamowienie_dostawy_pozycje
    FOR EACH ROW EXECUTE FUNCTION trigger_update_zamowienie_dostarczona();
```

### 5.4 Auto-sum: wykonanie -> ilosc_wykonana

```sql
CREATE FUNCTION trigger_update_umowa_wykonana()
RETURNS TRIGGER AS $$
DECLARE
    v_pozycja_id UUID;
BEGIN
    v_pozycja_id := COALESCE(NEW.umowa_pozycja_id, OLD.umowa_pozycja_id);

    UPDATE umowa_pozycje
    SET ilosc_wykonana = COALESCE((
        SELECT SUM(ilosc_wykonana)
        FROM umowa_wykonanie
        WHERE umowa_pozycja_id = v_pozycja_id
    ), 0)
    WHERE id = v_pozycja_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER umowa_wyk_update_sum
    AFTER INSERT OR UPDATE OR DELETE ON umowa_wykonanie
    FOR EACH ROW EXECUTE FUNCTION trigger_update_umowa_wykonana();
```

### 5.5 Auto-numer zamowien

```sql
CREATE FUNCTION trigger_auto_numer_zamowienia()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT := EXTRACT(YEAR FROM COALESCE(NEW.data_zamowienia, NOW()))::TEXT;
    v_next INTEGER;
BEGIN
    IF NEW.numer IS NULL OR NEW.numer = '' THEN
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(numer, '/', 3) AS INTEGER)
        ), 0) + 1
        INTO v_next
        FROM zamowienia
        WHERE organization_id = NEW.organization_id
        AND numer LIKE 'ZAM/' || v_year || '/%';

        NEW.numer := 'ZAM/' || v_year || '/' || LPAD(v_next::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zamowienia_auto_numer
    BEFORE INSERT ON zamowienia
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_numer_zamowienia();
```

### 5.6 Auto-numer umow

```sql
CREATE FUNCTION trigger_auto_numer_umowy()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT := EXTRACT(YEAR FROM COALESCE(NEW.data_podpisania, NOW()))::TEXT;
    v_next INTEGER;
BEGIN
    IF NEW.numer IS NULL OR NEW.numer = '' THEN
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(numer, '/', 3) AS INTEGER)
        ), 0) + 1
        INTO v_next
        FROM umowy
        WHERE organization_id = NEW.organization_id
        AND numer LIKE 'UMW/' || v_year || '/%';

        NEW.numer := 'UMW/' || v_year || '/' || LPAD(v_next::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER umowy_auto_numer
    BEFORE INSERT ON umowy
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_numer_umowy();
```

---

## 6. Indeksy

```sql
-- Zamowienia
CREATE INDEX idx_zamowienia_org ON zamowienia(organization_id);
CREATE INDEX idx_zamowienia_projekt ON zamowienia(projekt_id);
CREATE INDEX idx_zamowienia_dostawca ON zamowienia(dostawca_id);
CREATE INDEX idx_zamowienia_rewizja ON zamowienia(rewizja_id);
CREATE INDEX idx_zamowienia_status ON zamowienia(status);

-- Zamowienie pozycje
CREATE INDEX idx_zam_pozycje_zamowienie ON zamowienie_pozycje(zamowienie_id);
CREATE INDEX idx_zam_pozycje_produkt ON zamowienie_pozycje(produkt_id);

-- Zamowienie pozycje zrodla
CREATE INDEX idx_zam_poz_zrodla_pozycja ON zamowienie_pozycje_zrodla(zamowienie_pozycja_id);
CREATE INDEX idx_zam_poz_zrodla_skladowa ON zamowienie_pozycje_zrodla(kosztorys_skladowa_m_id);

-- Zamowienie dostawy
CREATE INDEX idx_zam_dostawy_zamowienie ON zamowienie_dostawy(zamowienie_id);

-- Zamowienie dostawy pozycje
CREATE INDEX idx_zam_dost_poz_dostawa ON zamowienie_dostawy_pozycje(zamowienie_dostawa_id);
CREATE INDEX idx_zam_dost_poz_pozycja ON zamowienie_dostawy_pozycje(zamowienie_pozycja_id);

-- Umowy
CREATE INDEX idx_umowy_org ON umowy(organization_id);
CREATE INDEX idx_umowy_projekt ON umowy(projekt_id);
CREATE INDEX idx_umowy_podwykonawca ON umowy(podwykonawca_id);
CREATE INDEX idx_umowy_rewizja ON umowy(rewizja_id);
CREATE INDEX idx_umowy_status ON umowy(status);

-- Umowa pozycje
CREATE INDEX idx_umowa_pozycje_umowa ON umowa_pozycje(umowa_id);
CREATE INDEX idx_umowa_pozycje_poz_bib ON umowa_pozycje(pozycja_biblioteka_id);

-- Umowa pozycje zrodla
CREATE INDEX idx_umowa_poz_zrodla_pozycja ON umowa_pozycje_zrodla(umowa_pozycja_id);
CREATE INDEX idx_umowa_poz_zrodla_skladowa ON umowa_pozycje_zrodla(kosztorys_skladowa_r_id);

-- Umowa wykonanie
CREATE INDEX idx_umowa_wykonanie_pozycja ON umowa_wykonanie(umowa_pozycja_id);

-- Realizacja wpisy
CREATE INDEX idx_realizacja_org ON realizacja_wpisy(organization_id);
CREATE INDEX idx_realizacja_projekt ON realizacja_wpisy(projekt_id);
CREATE INDEX idx_realizacja_zamowienie ON realizacja_wpisy(zamowienie_id);
CREATE INDEX idx_realizacja_umowa ON realizacja_wpisy(umowa_id);
CREATE INDEX idx_realizacja_typ ON realizacja_wpisy(typ);
```

---

## 7. RLS Policies

### Pattern A: tabele z organization_id (zamowienia, umowy, realizacja_wpisy)

```sql
-- Przyklad: zamowienia (identycznie dla umowy i realizacja_wpisy)
ALTER TABLE zamowienia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zamowienia_select" ON zamowienia
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "zamowienia_insert" ON zamowienia
    FOR INSERT TO authenticated
    WITH CHECK (organization_id IN (SELECT user_organizations()));
CREATE POLICY "zamowienia_update" ON zamowienia
    FOR UPDATE TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
CREATE POLICY "zamowienia_delete" ON zamowienia
    FOR DELETE TO authenticated
    USING (organization_id IN (SELECT user_organizations()));
```

### Pattern B: tabele child (przez FK do parenta)

```sql
-- Przyklad: zamowienie_pozycje (przez zamowienia.organization_id)
ALTER TABLE zamowienie_pozycje ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zam_pozycje_select" ON zamowienie_pozycje
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM zamowienia z
        WHERE z.id = zamowienie_id
        AND z.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "zam_pozycje_insert" ON zamowienie_pozycje
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM zamowienia z
        WHERE z.id = zamowienie_id
        AND z.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "zam_pozycje_update" ON zamowienie_pozycje
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM zamowienia z
        WHERE z.id = zamowienie_id
        AND z.organization_id IN (SELECT user_organizations())
    ));
CREATE POLICY "zam_pozycje_delete" ON zamowienie_pozycje
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM zamowienia z
        WHERE z.id = zamowienie_id
        AND z.organization_id IN (SELECT user_organizations())
    ));
```

### Pattern B x2: tabele 2 poziomy glebiej (przez 2 JOINy)

```sql
-- Przyklad: zamowienie_pozycje_zrodla (przez zam_pozycje -> zamowienia.org_id)
ALTER TABLE zamowienie_pozycje_zrodla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zam_poz_zrodla_select" ON zamowienie_pozycje_zrodla
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM zamowienie_pozycje zp
        JOIN zamowienia z ON z.id = zp.zamowienie_id
        WHERE zp.id = zamowienie_pozycja_id
        AND z.organization_id IN (SELECT user_organizations())
    ));
-- INSERT/UPDATE/DELETE analogicznie z WITH CHECK / USING
```

### Pelna mapa RLS

| Tabela | Pattern | Przez |
|--------|---------|-------|
| zamowienia | A (direct) | organization_id |
| zamowienie_pozycje | B (1 JOIN) | -> zamowienia.org_id |
| zamowienie_pozycje_zrodla | B (2 JOINy) | -> zam_pozycje -> zamowienia.org_id |
| zamowienie_dostawy | B (1 JOIN) | -> zamowienia.org_id |
| zamowienie_dostawy_pozycje | B (2 JOINy) | -> zam_dostawy -> zamowienia.org_id |
| umowy | A (direct) | organization_id |
| umowa_pozycje | B (1 JOIN) | -> umowy.org_id |
| umowa_pozycje_zrodla | B (2 JOINy) | -> umowa_pozycje -> umowy.org_id |
| umowa_wykonanie | B (2 JOINy) | -> umowa_pozycje -> umowy.org_id |
| realizacja_wpisy | A (direct) | organization_id |

---

## 8. Funkcje: generowanie draftow

### 8.1 private.generate_zamowienia_draft

```sql
CREATE FUNCTION private.generate_zamowienia_draft(
    p_projekt_id UUID,
    p_rewizja_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_org_id UUID;
    v_dostawca RECORD;
    v_zamowienie_id UUID;
    v_count INTEGER := 0;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM projekty WHERE id = p_projekt_id;

    IF NOT EXISTS (
        SELECT 1 FROM rewizje
        WHERE id = p_rewizja_id
        AND is_accepted = TRUE
    ) THEN
        RAISE EXCEPTION 'Rewizja nie jest zaakceptowana';
    END IF;

    FOR v_dostawca IN (
        SELECT DISTINCT ksm.dostawca_id
        FROM kosztorys_skladowe_materialy ksm
        JOIN kosztorys_pozycje kp ON kp.id = ksm.kosztorys_pozycja_id
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksm.dostawca_id IS NOT NULL
    ) LOOP
        INSERT INTO zamowienia (organization_id, projekt_id, rewizja_id, dostawca_id)
        VALUES (v_org_id, p_projekt_id, p_rewizja_id, v_dostawca.dostawca_id)
        RETURNING id INTO v_zamowienie_id;

        INSERT INTO zamowienie_pozycje (
            zamowienie_id, produkt_id, nazwa, jednostka,
            ilosc_zamowiona, cena_jednostkowa
        )
        SELECT
            v_zamowienie_id,
            ksm.produkt_id,
            COALESCE(p.nazwa, ksm.nazwa),
            COALESCE(p.jednostka, ksm.jednostka),
            SUM(CASE WHEN ksm.is_manual
                THEN ksm.ilosc
                ELSE ksm.norma * kp.ilosc
            END),
            ksm.cena
        FROM kosztorys_skladowe_materialy ksm
        JOIN kosztorys_pozycje kp ON kp.id = ksm.kosztorys_pozycja_id
        LEFT JOIN produkty p ON p.id = ksm.produkt_id
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksm.dostawca_id = v_dostawca.dostawca_id
        GROUP BY ksm.produkt_id, COALESCE(p.nazwa, ksm.nazwa),
                 COALESCE(p.jednostka, ksm.jednostka), ksm.cena;

        INSERT INTO zamowienie_pozycje_zrodla (
            zamowienie_pozycja_id, kosztorys_skladowa_m_id, ilosc
        )
        SELECT
            zp.id,
            ksm.id,
            CASE WHEN ksm.is_manual
                THEN ksm.ilosc
                ELSE ksm.norma * kp.ilosc
            END
        FROM kosztorys_skladowe_materialy ksm
        JOIN kosztorys_pozycje kp ON kp.id = ksm.kosztorys_pozycja_id
        JOIN zamowienie_pozycje zp ON zp.zamowienie_id = v_zamowienie_id
            AND zp.produkt_id = ksm.produkt_id
            AND zp.cena_jednostkowa = ksm.cena
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksm.dostawca_id = v_dostawca.dostawca_id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2 private.generate_umowy_draft

```sql
CREATE FUNCTION private.generate_umowy_draft(
    p_projekt_id UUID,
    p_rewizja_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_org_id UUID;
    v_podwykonawca RECORD;
    v_umowa_id UUID;
    v_count INTEGER := 0;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM projekty WHERE id = p_projekt_id;

    IF NOT EXISTS (
        SELECT 1 FROM rewizje
        WHERE id = p_rewizja_id
        AND is_accepted = TRUE
    ) THEN
        RAISE EXCEPTION 'Rewizja nie jest zaakceptowana';
    END IF;

    FOR v_podwykonawca IN (
        SELECT DISTINCT ksr.podwykonawca_id
        FROM kosztorys_skladowe_robocizna ksr
        JOIN kosztorys_pozycje kp ON kp.id = ksr.kosztorys_pozycja_id
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksr.podwykonawca_id IS NOT NULL
    ) LOOP
        INSERT INTO umowy (organization_id, projekt_id, rewizja_id, podwykonawca_id)
        VALUES (v_org_id, p_projekt_id, p_rewizja_id, v_podwykonawca.podwykonawca_id)
        RETURNING id INTO v_umowa_id;

        INSERT INTO umowa_pozycje (
            umowa_id, pozycja_biblioteka_id, nazwa, jednostka,
            ilosc, stawka
        )
        SELECT
            v_umowa_id,
            kp.pozycja_biblioteka_id,
            kp.nazwa,
            kp.jednostka,
            SUM(CASE WHEN ksr.is_manual
                THEN ksr.ilosc
                ELSE ksr.norma * kp.ilosc
            END),
            ksr.stawka
        FROM kosztorys_skladowe_robocizna ksr
        JOIN kosztorys_pozycje kp ON kp.id = ksr.kosztorys_pozycja_id
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksr.podwykonawca_id = v_podwykonawca.podwykonawca_id
        GROUP BY kp.pozycja_biblioteka_id, kp.nazwa, kp.jednostka, ksr.stawka;

        INSERT INTO umowa_pozycje_zrodla (
            umowa_pozycja_id, kosztorys_skladowa_r_id, ilosc
        )
        SELECT
            up.id,
            ksr.id,
            CASE WHEN ksr.is_manual
                THEN ksr.ilosc
                ELSE ksr.norma * kp.ilosc
            END
        FROM kosztorys_skladowe_robocizna ksr
        JOIN kosztorys_pozycje kp ON kp.id = ksr.kosztorys_pozycja_id
        JOIN umowa_pozycje up ON up.umowa_id = v_umowa_id
            AND up.pozycja_biblioteka_id = kp.pozycja_biblioteka_id
            AND up.stawka = ksr.stawka
        WHERE kp.rewizja_id = p_rewizja_id
        AND ksr.podwykonawca_id = v_podwykonawca.podwykonawca_id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.3 Public wrappery

```sql
CREATE FUNCTION generate_zamowienia_draft(p_projekt_id UUID, p_rewizja_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN private.generate_zamowienia_draft(p_projekt_id, p_rewizja_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE FUNCTION generate_umowy_draft(p_projekt_id UUID, p_rewizja_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN private.generate_umowy_draft(p_projekt_id, p_rewizja_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

**Wywolanie z app:** `supabase.rpc('generate_zamowienia_draft', { p_projekt_id, p_rewizja_id })`

---

## 9. Funkcje UX: agregacja per kategoria

### 9.1 get_podwykonawcy_aggregated

Lancuch: `podwykonawcy -> stawki_podwykonawcow -> pozycje_biblioteka -> kategorie`

```sql
CREATE FUNCTION get_podwykonawcy_aggregated(
    p_branza TEXT DEFAULT NULL,
    p_kategoria TEXT DEFAULT NULL,
    p_podkategoria TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 25,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id UUID,
    nazwa VARCHAR(255),
    specjalizacja VARCHAR(100),
    kontakt TEXT,
    aktywny BOOLEAN,
    pozycje_count BIGINT,
    najnizsza_stawka NUMERIC,
    najwyzsza_stawka NUMERIC,
    total_count BIGINT
) LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT
            p.id,
            p.nazwa,
            p.specjalizacja,
            p.kontakt,
            p.aktywny,
            COUNT(DISTINCT sp.pozycja_biblioteka_id) AS pozycje_count,
            MIN(sp.stawka) AS najnizsza_stawka,
            MAX(sp.stawka) AS najwyzsza_stawka
        FROM podwykonawcy p
        LEFT JOIN stawki_podwykonawcow sp ON sp.podwykonawca_id = p.id
            AND sp.aktywny = TRUE
        LEFT JOIN pozycje_biblioteka pb ON pb.id = sp.pozycja_biblioteka_id
        WHERE (p_search IS NULL OR (
            p.nazwa ILIKE '%' || p_search || '%'
            OR p.specjalizacja ILIKE '%' || p_search || '%'
        ))
        AND (p_branza IS NULL OR pb.kod LIKE p_branza || '.%' OR pb.kod = p_branza)
        AND (p_kategoria IS NULL OR pb.kod LIKE p_kategoria || '.%' OR pb.kod = p_kategoria)
        AND (p_podkategoria IS NULL OR pb.kod LIKE p_podkategoria || '.%' OR pb.kod = p_podkategoria)
        GROUP BY p.id, p.nazwa, p.specjalizacja, p.kontakt, p.aktywny
    )
    SELECT
        f.id, f.nazwa, f.specjalizacja, f.kontakt, f.aktywny,
        f.pozycje_count, f.najnizsza_stawka, f.najwyzsza_stawka,
        COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.nazwa
    LIMIT p_limit OFFSET p_offset;
END;
$$;
```

### 9.2 get_dostawcy_aggregated

Lancuch: `dostawcy -> ceny_dostawcow -> produkty -> biblioteka_skladowe_materialy -> pozycje_biblioteka`

```sql
CREATE FUNCTION get_dostawcy_aggregated(
    p_branza TEXT DEFAULT NULL,
    p_kategoria TEXT DEFAULT NULL,
    p_podkategoria TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 25,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id UUID,
    nazwa VARCHAR(255),
    kod VARCHAR(50),
    kontakt TEXT,
    aktywny BOOLEAN,
    produkty_count BIGINT,
    pozycje_count BIGINT,
    najnizsza_cena NUMERIC,
    total_count BIGINT
) LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT
            d.id,
            d.nazwa,
            d.kod,
            d.kontakt,
            d.aktywny,
            COUNT(DISTINCT cd.produkt_id) AS produkty_count,
            COUNT(DISTINCT bsm.pozycja_biblioteka_id) AS pozycje_count,
            MIN(cd.cena_netto) AS najnizsza_cena
        FROM dostawcy d
        LEFT JOIN ceny_dostawcow cd ON cd.dostawca_id = d.id
            AND cd.aktywny = TRUE
        LEFT JOIN biblioteka_skladowe_materialy bsm ON bsm.produkt_id = cd.produkt_id
        LEFT JOIN pozycje_biblioteka pb ON pb.id = bsm.pozycja_biblioteka_id
        WHERE (p_search IS NULL OR (
            d.nazwa ILIKE '%' || p_search || '%'
            OR d.kod ILIKE '%' || p_search || '%'
        ))
        AND (p_branza IS NULL OR pb.kod LIKE p_branza || '.%' OR pb.kod = p_branza)
        AND (p_kategoria IS NULL OR pb.kod LIKE p_kategoria || '.%' OR pb.kod = p_kategoria)
        AND (p_podkategoria IS NULL OR pb.kod LIKE p_podkategoria || '.%' OR pb.kod = p_podkategoria)
        GROUP BY d.id, d.nazwa, d.kod, d.kontakt, d.aktywny
    )
    SELECT
        f.id, f.nazwa, f.kod, f.kontakt, f.aktywny,
        f.produkty_count, f.pozycje_count, f.najnizsza_cena,
        COUNT(*) OVER() AS total_count
    FROM filtered f
    ORDER BY f.nazwa
    LIMIT p_limit OFFSET p_offset;
END;
$$;
```

---

## 10. Decyzje architektoniczne

| Decyzja | Wybor | Dlaczego |
|---------|-------|----------|
| Wszystko w jednej migracji | Tak | Spojnosc, atomowosc |
| realizacja_wpis_typ enum | Osobny enum zamiast TEXT | Trzy wartosci, czyste typowanie |
| umowa_wykonanie (dodatkowa tabela) | Tak | Zrodlo danych dla trigger-updated SUM ilosc_wykonana |
| wartosc, procent_wykonania | GENERATED STORED | Zawsze spojne, zero logiki w app |
| ilosc_dostarczona | Trigger-updated SUM z zamowienie_dostawy_pozycje | Szybki odczyt, automatyczna aktualizacja |
| Auto-numer ZAM/UMW | Trigger BEFORE INSERT, skip jesli numer podany | Elastycznosc — auto lub reczny |
| RLS 3-poziomowe tabele | 2 JOINy (czyste FK, bez redundancji org_id) | Dane male, indeksy wystarczaja |
| Funkcje generate_*_draft | private + public wrapper | Spojne z istniejacym copy_revision |
| Blokada cofniecia is_accepted | Dodatkowa regula w trigger | Permanentnosc akceptacji |
| UX grupowanie | Funkcje agregujace z filtrami branza/kategoria/podkategoria | Spojne z istniejacym get_materialy_aggregated |

---

## 11. Kolejnosc w pliku migracji

```
1. Enumy (zamowienie_status, umowa_status, realizacja_wpis_typ)
2. ALTER istniejacych tabel (rewizje, projekty)
3. Funkcja trigger_prevent_unlock_accepted + trigger
4. Tabele zamowien (5 tabel)
5. Tabele umow (4 tabele)
6. Tabela realizacja_wpisy
7. Indeksy (27)
8. RLS (10 tabel x 4 policies = 40 policies)
9. Triggery updated_at + auto_numer + auto_sum (6)
10. Funkcje trigger (auto_sum, auto_numer)
11. Funkcje private.generate_* + public wrappery
12. Funkcje UX (get_podwykonawcy_aggregated, get_dostawcy_aggregated)
```

---

## 12. Schemat relacji (nowe tabele)

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
