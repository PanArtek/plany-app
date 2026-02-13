# Redesign: Uproszczenie modelu robocizny (flat pricing)

> **Status:** PLAN — do implementacji
> **Data:** 2026-02-13
> **Cel:** Zamienić norma × stawka per składowa na flat cenę robocizny za jednostkę pozycji

---

## Motywacja

Obecny model rozbija robociznę na składowe (np. "Nałożenie gładzi warstwa 1: 0.15h × 18 zł/h"), co wymusza sztuczne rozbicie na komponenty. W praktyce **cena robocizny to flat kwota za jednostkę** (np. 26 zł/m²) wynikająca z doświadczenia rynkowego i negocjacji z podwykonawcą — nie z kalkulacji norma × stawka.

**Materiały zostają bez zmian** — tam norma × cena to fizyka (0.9 mb profilu × 8.50 zł/mb).

---

## 1. Obecny stan (co usuwamy)

### 1.1 Tabele do usunięcia

**`biblioteka_skladowe_robocizna`** (`005_biblioteka.sql:31-44`)
```sql
CREATE TABLE biblioteka_skladowe_robocizna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id) ON DELETE CASCADE,
    lp INTEGER NOT NULL DEFAULT 1,
    opis VARCHAR(500) NOT NULL,
    podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL,
    stawka_domyslna DECIMAL(12,2),           -- opcjonalna domyślna stawka
    norma_domyslna DECIMAL(12,4) DEFAULT 1,  -- zużycie na 1 jm (np. 0.1 h/m²)
    jednostka VARCHAR(20) DEFAULT 'h',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bib_skladowe_r_unique UNIQUE (pozycja_biblioteka_id, lp)
);
```

**`kosztorys_skladowe_robocizna`** (`006_kosztorys.sql:53-83`)
```sql
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
```

### 1.2 Obecna kalkulacja (view `kosztorys_pozycje_view` z `007_views.sql`)

```
Auto:   SUM(stawka × norma) per pozycja → suma_jedn
Manual: SUM(stawka × ilosc) per pozycja → suma_manual

R = suma_jedn × kp.ilosc + suma_manual
M = (analogicznie dla materiałów)
Razem = (R + M) × (1 + narzut_percent / 100)
```

**Przykład seed data (Gładź gipsowa):**
```
Składowa 1: 18 zł/h × 0.15 h/m² = 2.70 zł/m²
Składowa 2: 18 zł/h × 0.12 h/m² = 2.16 zł/m²
Składowa 3: 18 zł/h × 0.08 h/m² = 1.44 zł/m²
─────────────────────────────────────────────
Razem R: 6.30 zł/m² → × 650 m² = 4 095 zł
```

→ W nowym modelu: po prostu `cena_robocizny = 6.30 zł/m²` (albo 26 zł/m² bo tyle kosztuje rynkowo).

### 1.3 Powiązane elementy do usunięcia/modyfikacji

| Element | Lokalizacja | Akcja |
|---------|-------------|-------|
| RLS policies `bib_skladowe_r_*` (4 szt.) | `009_rls.sql:186-213` | DROP |
| RLS policies `ksz_skladowe_r_*` (4 szt.) | `009_rls.sql:304-331` | DROP |
| Trigger `ksz_skladowe_r_check_locked` | `008_functions.sql:111-113` | DROP |
| Trigger `kosztorys_skladowe_r_updated_at` | `008_functions.sql:56` | DROP |
| Index `idx_ksz_skladowe_r_pozycja` | `006_kosztorys.sql:123` | DROP (with table) |
| Index `idx_ksz_skladowe_r_podwykonawca` | `006_kosztorys.sql:124` | DROP (with table) |
| Constraint `bib_skladowe_r_unique` | `005_biblioteka.sql` | DROP (with table) |
| Constraint `ksz_skladowe_r_unique`, `ksz_skladowe_r_manual_ilosc` | `006_kosztorys.sql` | DROP (with table) |
| Funkcja `private.copy_revision()` | `008_functions.sql:124-193` | RECREATE (bez robocizny) |
| View `kosztorys_pozycje_view` | `007_views.sql:1-67` | RECREATE (nowa formuła) |
| View `rewizje_summary` | `014_acceptance_state_machine.sql:11-51` | RECREATE (nowa formuła) |
| Seed data robocizna | `016_seed_realistic_data.sql` | Nie ruszamy (historyczne) |

---

## 2. Nowy model

### 2.1 Biblioteka — nowe pole na `pozycje_biblioteka`

```sql
ALTER TABLE pozycje_biblioteka
  ADD COLUMN cena_robocizny DECIMAL(12,2);  -- flat zł/jm (np. 26 zł/m²), nullable = brak wyceny
```

**Semantyka:** Domyślna cena robocizny za 1 jednostkę pozycji. Nullable — pozycja może nie mieć jeszcze wyceny robocizny. Zastępuje sumę `stawka_domyslna × norma_domyslna` ze wszystkich składowych.

### 2.2 Kosztorys — nowe pola na `kosztorys_pozycje`

```sql
-- Typ źródła ceny robocizny
CREATE TYPE cena_robocizny_zrodlo AS ENUM ('biblioteka', 'podwykonawca', 'reczna');

ALTER TABLE kosztorys_pozycje
  ADD COLUMN cena_robocizny DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN cena_robocizny_zrodlowa DECIMAL(12,2),
  ADD COLUMN cena_robocizny_zrodlo cena_robocizny_zrodlo,
  ADD COLUMN podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL;
```

| Pole | Opis |
|------|------|
| `cena_robocizny` | **Aktualna cena** za 1 jm — edytowalna, source of truth |
| `cena_robocizny_zrodlowa` | **Zamrożona cena** z momentu dodania (snapshot) |
| `cena_robocizny_zrodlo` | Skąd pochodzi: `biblioteka` / `podwykonawca` / `reczna` |
| `podwykonawca_id` | Kto realizuje — raportowanie, auto-pricing, umowy |

**Override detection (pochodna):**
```sql
-- W view lub UI:
override = (cena_robocizny IS DISTINCT FROM cena_robocizny_zrodlowa)
```

### 2.3 Nowa kalkulacja (view)

```
R = kosztorys_pozycje.cena_robocizny × ilosc
M = SUM(materialy: norma × cena) × ilosc + SUM(manual materialy)
Razem = (R + M) × (1 + narzut_percent / 100)
```

**View eksponuje dodatkowo:**
- `cena_robocizny_zrodlowa` — do porównania z aktualną
- `cena_robocizny_zrodlo` — do badge'a w UI
- `podwykonawca_id` — do filtrowania/raportowania
- `is_override` = `(cena_robocizny IS DISTINCT FROM cena_robocizny_zrodlowa)` — computed

### 2.4 Tabela `stawki_podwykonawcow` — bez zmian strukturalnych

Obecna struktura:
```sql
stawki_podwykonawcow (
    id, podwykonawca_id, pozycja_biblioteka_id, stawka, aktywny, created_at
    -- UNIQUE (podwykonawca_id, pozycja_biblioteka_id)
)
```

Semantyka się **upraszcza**: `stawka` to teraz explicit flat cena za jm pozycji (co de facto już była — stawka 45 zł za m² ściany GK, nie za godzinę).

---

## 3. Migration plan — `017_flatten_labor_pricing.sql`

Jedna atomowa migracja. Kolejność operacji gwarantuje zero data loss.

```sql
-- ============================================
-- Migration 017: Flatten labor pricing model
-- ============================================
-- Zamiana: SUM(norma × stawka) per składowa → flat cena_robocizny per pozycja
-- BEZSTRATNA: migruje istniejące dane przed usunięciem tabel

-- -----------------------------------------------
-- KROK 1: Nowe typy i kolumny (niedestrukcyjne)
-- -----------------------------------------------

CREATE TYPE cena_robocizny_zrodlo AS ENUM ('biblioteka', 'podwykonawca', 'reczna');

-- Biblioteka: flat cena robocizny
ALTER TABLE pozycje_biblioteka
  ADD COLUMN cena_robocizny DECIMAL(12,2);

-- Kosztorys: flat cena + metadata
ALTER TABLE kosztorys_pozycje
  ADD COLUMN cena_robocizny DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN cena_robocizny_zrodlowa DECIMAL(12,2),
  ADD COLUMN cena_robocizny_zrodlo cena_robocizny_zrodlo,
  ADD COLUMN podwykonawca_id UUID REFERENCES podwykonawcy(id) ON DELETE SET NULL;

-- -----------------------------------------------
-- KROK 2: Migracja danych — BIBLIOTEKA
-- -----------------------------------------------
-- cena_robocizny = SUM(stawka_domyslna × norma_domyslna) ze składowych
UPDATE pozycje_biblioteka pb
SET cena_robocizny = sub.suma
FROM (
    SELECT pozycja_biblioteka_id,
           SUM(COALESCE(stawka_domyslna, 0) * COALESCE(norma_domyslna, 0)) AS suma
    FROM biblioteka_skladowe_robocizna
    GROUP BY pozycja_biblioteka_id
) sub
WHERE pb.id = sub.pozycja_biblioteka_id;

-- -----------------------------------------------
-- KROK 3: Disable lock trigger (migracja locked rewizji)
-- -----------------------------------------------
ALTER TABLE kosztorys_pozycje DISABLE TRIGGER kosztorys_pozycje_check_locked;

-- -----------------------------------------------
-- KROK 4: Migracja danych — KOSZTORYS
-- -----------------------------------------------
-- Dwa tryby: auto (norma-based) i manual (fixed-total)
--
-- is_manual=false: SUM(stawka × norma) → per-unit cost
-- is_manual=true:  SUM(stawka × ilosc) / kp.ilosc → convert total to per-unit
--
-- Oba dają cenę za 1 jednostkę pozycji (zł/m², zł/szt, etc.)

UPDATE kosztorys_pozycje kp
SET
    cena_robocizny = sub.cena_per_unit,
    cena_robocizny_zrodlowa = sub.cena_per_unit,
    cena_robocizny_zrodlo = 'biblioteka'
FROM (
    SELECT
        kr.kosztorys_pozycja_id,
        -- Auto: suma(stawka × norma) = koszt per jm
        -- Manual: suma(stawka × ilosc) / kp.ilosc = total → per jm
        COALESCE(
            SUM(CASE WHEN NOT kr.is_manual THEN kr.stawka * kr.norma ELSE 0 END)
            + CASE WHEN kp2.ilosc > 0 THEN
                SUM(CASE WHEN kr.is_manual THEN kr.stawka * COALESCE(kr.ilosc, 0) ELSE 0 END) / kp2.ilosc
              ELSE 0 END,
            0
        ) AS cena_per_unit
    FROM kosztorys_skladowe_robocizna kr
    JOIN kosztorys_pozycje kp2 ON kp2.id = kr.kosztorys_pozycja_id
    GROUP BY kr.kosztorys_pozycja_id, kp2.ilosc
) sub
WHERE kp.id = sub.kosztorys_pozycja_id;

-- Migruj podwykonawca_id z pierwszej składowej (jeśli istnieje)
UPDATE kosztorys_pozycje kp
SET podwykonawca_id = sub.podwykonawca_id
FROM (
    SELECT DISTINCT ON (kosztorys_pozycja_id)
        kosztorys_pozycja_id,
        podwykonawca_id
    FROM kosztorys_skladowe_robocizna
    WHERE podwykonawca_id IS NOT NULL
    ORDER BY kosztorys_pozycja_id, lp
) sub
WHERE kp.id = sub.kosztorys_pozycja_id;

-- -----------------------------------------------
-- KROK 5: Re-enable lock trigger
-- -----------------------------------------------
ALTER TABLE kosztorys_pozycje ENABLE TRIGGER kosztorys_pozycje_check_locked;

-- -----------------------------------------------
-- KROK 6: DROP + RECREATE views
-- -----------------------------------------------
DROP VIEW IF EXISTS rewizje_summary;
DROP VIEW IF EXISTS kosztorys_pozycje_view;

-- Nowy kosztorys_pozycje_view: R jest teraz flat × ilosc
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

    -- Robocizna: flat cena × ilosc
    kp.cena_robocizny AS r_jednostkowy,
    kp.cena_robocizny * kp.ilosc AS r_robocizna,

    -- Metadata robocizny
    kp.cena_robocizny_zrodlowa,
    kp.cena_robocizny_zrodlo,
    kp.podwykonawca_id,
    (kp.cena_robocizny IS DISTINCT FROM kp.cena_robocizny_zrodlowa) AS r_is_override,

    -- Materiały: bez zmian (norma × cena)
    COALESCE(m.suma_jedn, 0) AS m_jednostkowy,
    COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0) AS m_materialy,

    -- R + M
    kp.cena_robocizny * kp.ilosc
        + COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0) AS r_plus_m,

    -- Narzut i razem
    (kp.cena_robocizny * kp.ilosc
        + COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0)) * kp.narzut_percent / 100 AS narzut_wartosc,
    (kp.cena_robocizny * kp.ilosc
        + COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0)) * (1 + kp.narzut_percent / 100) AS razem

FROM kosztorys_pozycje kp
LEFT JOIN (
    SELECT
        kosztorys_pozycja_id,
        SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
        SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
    FROM kosztorys_skladowe_materialy
    GROUP BY kosztorys_pozycja_id
) m ON m.kosztorys_pozycja_id = kp.id;

-- Nowy rewizje_summary: R z kosztorys_pozycje.cena_robocizny
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
    rew.is_accepted,
    rew.accepted_at,
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
        SUM(kp.cena_robocizny * kp.ilosc) AS suma_r,
        SUM(COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0)) AS suma_m,
        SUM((kp.cena_robocizny * kp.ilosc
            + COALESCE(m.suma_jedn, 0) * kp.ilosc + COALESCE(m.suma_manual, 0))
            * (1 + kp.narzut_percent / 100)) AS suma_razem
    FROM kosztorys_pozycje kp
    LEFT JOIN (
        SELECT kosztorys_pozycja_id,
            SUM(CASE WHEN NOT is_manual THEN cena * norma ELSE 0 END) AS suma_jedn,
            SUM(CASE WHEN is_manual THEN cena * COALESCE(ilosc, 0) ELSE 0 END) AS suma_manual
        FROM kosztorys_skladowe_materialy GROUP BY kosztorys_pozycja_id
    ) m ON m.kosztorys_pozycja_id = kp.id
    GROUP BY kp.rewizja_id
) stats ON stats.rewizja_id = rew.id;

-- -----------------------------------------------
-- KROK 7: RECREATE private.copy_revision() — bez robocizny
-- -----------------------------------------------
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

    INSERT INTO rewizje (projekt_id, nazwa, is_locked)
    SELECT projekt_id, COALESCE(new_nazwa, 'Kopia ' || nazwa), FALSE
    FROM rewizje WHERE id = source_rewizja_id
    RETURNING id INTO new_rewizja_id;

    FOR old_pozycja IN
        SELECT * FROM kosztorys_pozycje WHERE rewizja_id = source_rewizja_id
    LOOP
        INSERT INTO kosztorys_pozycje (
            organization_id, rewizja_id, pozycja_biblioteka_id,
            lp, nazwa, ilosc, jednostka, narzut_percent, notatki,
            cena_robocizny, cena_robocizny_zrodlowa, cena_robocizny_zrodlo, podwykonawca_id
        ) VALUES (
            old_pozycja.organization_id, new_rewizja_id, old_pozycja.pozycja_biblioteka_id,
            old_pozycja.lp, old_pozycja.nazwa, old_pozycja.ilosc, old_pozycja.jednostka,
            old_pozycja.narzut_percent, old_pozycja.notatki,
            old_pozycja.cena_robocizny, old_pozycja.cena_robocizny_zrodlowa,
            old_pozycja.cena_robocizny_zrodlo, old_pozycja.podwykonawca_id
        ) RETURNING id INTO new_pozycja_id;

        -- Copy skladowe materialy (bez zmian)
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

-- -----------------------------------------------
-- KROK 8: DROP triggers, RLS policies, tables
-- -----------------------------------------------

-- Triggers
DROP TRIGGER IF EXISTS ksz_skladowe_r_check_locked ON kosztorys_skladowe_robocizna;
DROP TRIGGER IF EXISTS kosztorys_skladowe_r_updated_at ON kosztorys_skladowe_robocizna;

-- RLS policies (biblioteka)
DROP POLICY IF EXISTS "bib_skladowe_r_select" ON biblioteka_skladowe_robocizna;
DROP POLICY IF EXISTS "bib_skladowe_r_insert" ON biblioteka_skladowe_robocizna;
DROP POLICY IF EXISTS "bib_skladowe_r_update" ON biblioteka_skladowe_robocizna;
DROP POLICY IF EXISTS "bib_skladowe_r_delete" ON biblioteka_skladowe_robocizna;

-- RLS policies (kosztorys)
DROP POLICY IF EXISTS "ksz_skladowe_r_select" ON kosztorys_skladowe_robocizna;
DROP POLICY IF EXISTS "ksz_skladowe_r_insert" ON kosztorys_skladowe_robocizna;
DROP POLICY IF EXISTS "ksz_skladowe_r_update" ON kosztorys_skladowe_robocizna;
DROP POLICY IF EXISTS "ksz_skladowe_r_delete" ON kosztorys_skladowe_robocizna;

-- Tabele (CASCADE usunie indeksy i constraints)
DROP TABLE IF EXISTS kosztorys_skladowe_robocizna CASCADE;
DROP TABLE IF EXISTS biblioteka_skladowe_robocizna CASCADE;
```

### 3.1 Weryfikacja migracji

Po migracji sprawdzić:
```sql
-- Czy dane się zachowały?
SELECT id, nazwa, cena_robocizny FROM pozycje_biblioteka WHERE cena_robocizny IS NOT NULL LIMIT 10;

-- Czy view działa?
SELECT id, nazwa, r_jednostkowy, r_robocizna, m_materialy, razem
FROM kosztorys_pozycje_view LIMIT 10;

-- Czy sumy się zgadzają (porównanie z pre-migration snapshot)?
SELECT id, suma_r, suma_m, suma_razem FROM rewizje_summary;
```

---

## 4. Wpływ na kod — kompletna lista plików

### 4.1 Server Actions

| Plik | Zmiana | Szczegóły |
|------|--------|-----------|
| `actions/skladowe.ts` | **USUNĄĆ** 3 funkcje R | `createSkladowaRobocizna`, `updateSkladowaRobocizna`, `deleteSkladowaRobocizna` + interfejs `SkladowaRobocizna` |
| `actions/kosztorys.ts` | **PRZEPISAĆ** | `addPositionFromLibrary` (linie 591-621: usunąć copy robocizna składowych, dodać kopiowanie `cena_robocizny`), `getKosztorysPozycjaDetail` (linie 307-315: usunąć fetch skladoweR, 342-349: usunąć fetch bibliotekaSkladoweR), **USUNĄĆ** `updateKosztorysSkladowaR` (707-737), `resetSkladowaR` (775-792), **PRZEPISAĆ** `resetPozycjaToLibrary` (868-881: usunąć R matching, dodać reset cena_robocizny) |
| `actions/kosztorys.ts` | **USUNĄĆ** interfejsy | `SkladowaR` (68-78), `BibliotekaSkladowaR` (98-105) |
| `actions/pozycje.ts` | **MODYFIKOWAĆ** | Usunąć `biblioteka_skladowe_robocizna(*)` z selectów, dodać `cena_robocizny` do select/create/update |
| `actions/podwykonawcy.ts` | **MODYFIKOWAĆ** | `getPodwykonawcaPozycje` (175-198): query na `stawki_podwykonawcow` zamiast `biblioteka_skladowe_robocizna` |

### 4.2 Validation schemas

| Plik | Zmiana | Szczegóły |
|------|--------|-----------|
| `lib/validations/skladowe.ts` | **USUNĄĆ** | `createSkladowaRobociznaSchema`, `CreateSkladowaRobociznaInput`, `jednostkaRobociznaOptions` |
| `lib/validations/kosztorys.ts` | **USUNĄĆ** `updateSkladowaRSchema`, **DODAĆ** `updateCenaRobociznySchema` | `z.object({ cena_robocizny: z.number().min(0), podwykonawca_id: z.string().uuid().nullable().optional() })` |
| `lib/validations/pozycje.ts` | **DODAĆ** | `cena_robocizny` do schematu pozycji biblioteka |

### 4.3 UI Components

| Plik | Zmiana | Szczegóły |
|------|--------|-----------|
| `app/(app)/pozycje/_components/panels/skladowa-panel.tsx` | **USUNĄĆ** branch R | Usunąć `TYPE_CONFIG.robocizna`, `robociznaForm`, `onSubmitRobocizna`, `pricePreview` dla R. Zostaje ONLY materiały |
| `app/(app)/pozycje/_components/skladowe-section.tsx` | **UPROŚCIĆ** | Sekcja only for materiały. Robocizna renderowana osobno (proste pole `cena_robocizny` na `pozycja-detail-panel`) |
| `app/(app)/pozycje/_components/pozycja-detail-panel.tsx` | **DODAĆ** pole cena_robocizny | Usunąć sekcję biblioteka_skladowe_robocizna, dodać edytowalne pole `cena_robocizny` z formatką walutową |
| `app/(app)/projekty/[projektId]/kosztorys/_components/panels/pozycja-detail-panel.tsx` | **PRZEPISAĆ** sekcję R | Usunąć listę `SkladowaRRow` (401-484), sekcję robocizna (273-297). Dodać inline editable `cena_robocizny` z badge źródła i przyciskiem reset |
| `app/(app)/projekty/[projektId]/kosztorys/_components/library-drawer.tsx` | **ZMIENIĆ** badge | `R:{count}` → `R:{formatCurrency(pos.cenaRobocizny)}` |
| `app/(app)/projekty/[projektId]/kosztorys/_components/kosztorys-table.tsx` | **BEZ ZMIAN** | Kolumna R nadal pokazuje `r_jednostkowy` z view — formuła się zmieniła, ale output name ten sam |

### 4.4 Utilities

| Plik | Zmiana | Szczegóły |
|------|--------|-----------|
| `lib/utils/pozycje.ts` | **UPROŚCIĆ** | `obliczCenePozycji`: `robocizna = pozycja.cena_robocizny ?? 0` (zamiast reduce po składowych) |

### 4.5 Tests

| Plik | Zmiana | Szczegóły |
|------|--------|-----------|
| `tests/pozycja-robocizna.test.ts` | **PRZEPISAĆ** | Test: pozycja ma `cena_robocizny`, podwykonawca linkowany przez `stawki_podwykonawcow` |
| `tests/pozycja-do-kosztorysu.test.ts` | **PRZEPISAĆ** | Test: view kalkulacja z flat `cena_robocizny` zamiast składowych R |
| `tests/helpers/setup.ts` | **USUNĄĆ** | `createBibliotekaSkladowaR`, `createKosztorysSkladowaR` helpery |

---

## 5. Flow: Dodanie pozycji z biblioteki do kosztorysu (nowy)

```
1. User wybiera pozycję z library-drawer
2. addPositionFromLibrary():
   a. INSERT kosztorys_pozycje z:
      - cena_robocizny = COALESCE(
          cheapestSubcontractorRate,  -- stawki_podwykonawcow.stawka
          pozycja_biblioteka.cena_robocizny,  -- biblioteka default
          0  -- brak wyceny
        )
      - cena_robocizny_zrodlowa = [ta sama wartość]
      - cena_robocizny_zrodlo = 'podwykonawca' | 'biblioteka'
      - podwykonawca_id = cheapest subcontractor (jeśli istnieje)
   b. INSERT kosztorys_skladowe_materialy (BEZ ZMIAN)
3. View automatycznie wylicza R = cena_robocizny × ilosc
```

### 5.1 Priorytet cenowy (addPositionFromLibrary)

```
1. stawki_podwykonawcow (najtańszy aktywny) → zrodlo='podwykonawca'
2. pozycje_biblioteka.cena_robocizny         → zrodlo='biblioteka'
3. 0 (brak wyceny)                           → zrodlo='reczna'
```

---

## 6. Automatyzacje (roadmap)

### P1: Auto-pricing materiałów (trigger na `ceny_dostawcow`)

**Opis:** Trigger na INSERT/UPDATE `ceny_dostawcow` → aktualizuje `kosztorys_skladowe_materialy.cena` w UNLOCKED rewizjach, gdzie `dostawca_id` + `produkt_id` się zgadzają.

**Wartość:** Zmiana cennika dostawcy automatycznie aktualizuje otwarte kosztorysy.

**Uwagi:** Tylko unlocked rewizje. Locked = zamrożone.

### P1: Kalkulator → Pozycja (generowanie z parametrów)

**Opis:** Kalkulator Siniat generuje listę materiałów + robociznę z parametrów technicznych (typ ściany, wysokość, izolacja). Output → `pozycje_biblioteka` + `biblioteka_skladowe_materialy` + `cena_robocizny`.

**Wartość:** Eliminuje ręczne tworzenie pozycji dla standardowych systemów.

### P2: Bulk revalorization (% podwyżka robocizny/materiałów)

**Opis:** Zaznacz pozycje w kosztorysie → "Podnieś R o X%" / "Podnieś M o X%". Działa na `cena_robocizny` lub `kosztorys_skladowe_materialy.cena`.

**Wartość:** Szybka aktualizacja cen bez ręcznej edycji per pozycja.

### P2: Smart defaults robocizny (średnia z kategorii)

**Opis:** Nowa pozycja bez `cena_robocizny` → podpowiedź z średniej cen robocizny w tej kategorii (`AVG(cena_robocizny) WHERE kategoria_id = X`).

**Wartość:** Baseline wyceny nawet bez cennika podwykonawców.

### P3: Kosztorys intelligence (historyczne ceny, alerty odchyleń)

**Opis:** Dashboard z trendami cen per pozycja/kategoria. Alert gdy nowa wycena odbiega > 20% od średniej historycznej.

**Wartość:** Kontrola kosztów i wychwytywanie anomalii.

---

## 7. Pytania/decyzje

| # | Pytanie | Rekomendacja | Status |
|---|---------|--------------|--------|
| 1 | Czy `podwykonawca_id` na `kosztorys_pozycje`? | TAK — kluczowe dla raportów i automatyzacji | **PRZYJĘTE** w planie |
| 2 | Czy usunąć `position_type` ENUM ('robocizna', 'material', 'komplet')? | NIE — typ nadal ma sens (pozycja może być only-material, np. dostawa), zachowujemy | Do weryfikacji |
| 3 | Czy migracja seed data (016)? | NIE ruszamy — to historyczne dane, migracja 017 obsługuje runtime data | **PRZYJĘTE** |
| 4 | Czy `cena_robocizny` na bibliotece nullable czy DEFAULT 0? | NULLABLE — 0 oznacza "darmowe", NULL oznacza "nie wycenione" | **PRZYJĘTE** |
| 5 | Czy `cena_robocizny_zrodlo` required na kosztorys? | TAK + DEFAULT — 'reczna' gdy user wpisuje ręcznie | Do ustalenia default |
| 6 | Co z istniejącymi pozycjami bez składowych R? | `cena_robocizny = 0`, `zrodlowa = 0`, `zrodlo = 'biblioteka'` | **PRZYJĘTE** |

---

## 8. Diagram: Przed vs Po

### PRZED
```
pozycje_biblioteka
├── biblioteka_skladowe_robocizna[]  ← USUWAMY
│   ├── stawka_domyslna × norma_domyslna
│   └── (repeat per component)
└── biblioteka_skladowe_materialy[]  ← BEZ ZMIAN

kosztorys_pozycje (ilosc, narzut_percent)
├── kosztorys_skladowe_robocizna[]   ← USUWAMY
│   ├── stawka × norma (auto) | stawka × ilosc (manual)
│   └── R = SUM(...) × ilosc + SUM(manual)
└── kosztorys_skladowe_materialy[]   ← BEZ ZMIAN

View: R = aggregate(składowe_R), M = aggregate(składowe_M)
Razem = (R + M) × (1 + narzut%)
```

### PO
```
pozycje_biblioteka
├── cena_robocizny: 26.00 zł/m²     ← NOWE (flat)
└── biblioteka_skladowe_materialy[]  ← BEZ ZMIAN

kosztorys_pozycje (ilosc, narzut_percent)
├── cena_robocizny: 26.00            ← NOWE (edytowalne)
├── cena_robocizny_zrodlowa: 26.00   ← NOWE (frozen snapshot)
├── cena_robocizny_zrodlo: 'podwykonawca' ← NOWE (audit trail)
├── podwykonawca_id: UUID            ← NOWE (kto realizuje)
└── kosztorys_skladowe_materialy[]   ← BEZ ZMIAN

View: R = cena_robocizny × ilosc, M = aggregate(składowe_M)
Razem = (R + M) × (1 + narzut%)
```
