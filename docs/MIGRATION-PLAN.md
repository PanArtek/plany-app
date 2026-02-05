# PLANY App - Plan Migracji z Wireframe

## Przegląd Faz

| Faza | Nazwa | Stories | Status | Branch |
|------|-------|---------|--------|--------|
| 1 | Database Setup | 11 | **CURRENT** | `ralph/phase1-database-setup` |
| 2 | UI Base + Layout | ~8 | Pending | `ralph/phase2-ui-base` |
| 3 | Kategorie + Pozycje | ~12 | Pending | `ralph/phase3-kategorie-pozycje` |
| 4 | Materiały + Dostawcy | ~10 | Pending | `ralph/phase4-materialy-dostawcy` |
| 5 | Podwykonawcy | ~6 | Pending | `ralph/phase5-podwykonawcy` |
| 6 | Projekty + Rewizje | ~10 | Pending | `ralph/phase6-projekty` |
| 7 | Kosztorys (CORE) | ~20 | Pending | `ralph/phase7-kosztorys` |
| 8 | Kalkulatory | ~8 | Pending | `ralph/phase8-kalkulatory` |

---

## Zależności między fazami

```
FAZA 1 (Database)
    ↓
FAZA 2 (UI Base)
    ↓
FAZA 3 (Kategorie + Pozycje)  ← fundamenty dla wszystkiego
    ↓
┌───────────────┬───────────────┬───────────────┐
↓               ↓               ↓               ↓
FAZA 4        FAZA 5          FAZA 6
(Materiały)   (Podwykonawcy)  (Projekty)
└───────────────┴───────────────┴───────────────┘
                        ↓
                   FAZA 7 (Kosztorys) ← wymaga 3,4,5,6
                        ↓
                   FAZA 8 (Kalkulatory)
```

---

## FAZA 1: Database Setup (CURRENT)

**PRD:** `scripts/ralph/prd.json`
**Branch:** `ralph/phase1-database-setup`

### Stories (11):
| ID | Title | Status |
|----|-------|--------|
| DB-001 | Create supabase migrations directory | Pending |
| DB-002 | SQL for kategorie table | Pending |
| DB-003 | SQL for produkty and dostawcy tables | Pending |
| DB-004 | SQL for ceny_dostawcow table | Pending |
| DB-005 | SQL for podwykonawcy and stawki tables | Pending |
| DB-006 | SQL for pozycje_biblioteka table | Pending |
| DB-007 | SQL for projekty and rewizje tables | Pending |
| DB-008 | SQL for kosztorys_pozycje table | Pending |
| DB-009 | Combined SQL file (000_all_tables.sql) | Pending |
| DB-010 | TypeScript types placeholder | Pending |
| DB-011 | Update Supabase clients | Pending |

### MANUAL STEP after DB-009:
```bash
# 1. Copy supabase/migrations/000_all_tables.sql to Supabase SQL Editor
# 2. Run the SQL
# 3. Generate types:
supabase gen types typescript --project-id tormvuvlcujetkagmwtc > lib/supabase/database.types.ts
```

### Tabele:
```sql
kategorie           -- Hierarchia: branża → kategoria → podkategoria
produkty            -- Katalog materiałów (SKU jako klucz)
dostawcy            -- Dostawcy materiałów
ceny_dostawcow      -- Cenniki dostawców
podwykonawcy        -- Ekipy robocze
stawki_podwykonawcow -- Cenniki podwykonawców
pozycje_biblioteka  -- Biblioteka pozycji z skladowe (JSONB)
projekty            -- Projekty z slug
rewizje             -- Rewizje kosztorysów (locked/unlocked)
kosztorys_pozycje   -- Pozycje w kosztorysie z overrides (JSONB)
```

---

## FAZA 2: UI Base + Layout

**Branch:** `ralph/phase2-ui-base`

### Planowane Stories (~8):
- UI-001: Install shadcn components (button, card, dialog, table, tabs, toast, input, select, badge)
- UI-002: Configure dark theme (Tailwind config, CSS variables)
- UI-003: Add fonts (JetBrains Mono, Plus Jakarta Sans)
- UI-004: Create root layout with ThemeProvider
- UI-005: Create app shell with sidebar navigation
- UI-006: Create sidebar component with 8 nav links
- UI-007: Create header component
- UI-008: Create placeholder pages for all routes

### Routes:
```
/kategorie
/pozycje
/materialy
/dostawcy
/podwykonawcy
/kalkulatory
/projekty
/kosztorys
```

---

## FAZA 3: Kategorie + Pozycje

**Branch:** `ralph/phase3-kategorie-pozycje`

### Planowane Stories (~12):
- KAT-001: Server Actions for kategorie CRUD
- KAT-002: Kategorie page with tabs for 5 branż
- KAT-003: Kategoria cards with expand/collapse
- KAT-004: Podkategorie inside cards
- KAT-005: Add/Edit/Delete kategoria modals
- KAT-006: Seed kategorie data from wireframe
- POZ-001: Server Actions for pozycje_biblioteka CRUD
- POZ-002: Pozycje page with filters (branża, kategoria, search)
- POZ-003: Pozycje table with TanStack Table
- POZ-004: Position detail panel with skladowe
- POZ-005: Seed pozycje data from wireframe
- POZ-006: Link pozycje to kategorie

**Źródło:** `wireframe/js/views/kategorie.js`, `wireframe/js/views/pozycje.js`

---

## FAZA 4: Materiały + Dostawcy

**Branch:** `ralph/phase4-materialy-dostawcy`

### Planowane Stories (~10):
- MAT-001: Server Actions for produkty CRUD
- MAT-002: Materialy page with filters
- MAT-003: Materialy table with cheapest price aggregation
- MAT-004: Material detail modal with all supplier prices
- MAT-005: Seed produkty data from wireframe
- DOST-001: Server Actions for dostawcy CRUD
- DOST-002: Dostawcy page with filters
- DOST-003: Dostawcy table
- DOST-004: Dostawca detail with cennik
- DOST-005: Seed dostawcy + ceny data from wireframe

**Źródło:** `wireframe/js/views/materialy.js`, `wireframe/js/views/dostawcy.js`

---

## FAZA 5: Podwykonawcy

**Branch:** `ralph/phase5-podwykonawcy`

### Planowane Stories (~6):
- PODW-001: Server Actions for podwykonawcy CRUD
- PODW-002: Podwykonawcy page with filters
- PODW-003: Podwykonawcy table
- PODW-004: Podwykonawca detail with stawki
- PODW-005: Server Actions for stawki CRUD
- PODW-006: Seed podwykonawcy + stawki data from wireframe

**Źródło:** `wireframe/js/views/podwykonawcy.js`

---

## FAZA 6: Projekty + Rewizje

**Branch:** `ralph/phase6-projekty`

### Planowane Stories (~10):
- PROJ-001: Server Actions for projekty CRUD
- PROJ-002: Projekty page with grid cards
- PROJ-003: Project card component
- PROJ-004: Create project modal
- PROJ-005: Edit project modal
- PROJ-006: Server Actions for rewizje CRUD
- PROJ-007: Revision selector dropdown
- PROJ-008: Create new revision
- PROJ-009: Lock/unlock revision
- PROJ-010: Seed projekty + rewizje data from wireframe

**Źródło:** `wireframe/js/views/projekty.js`

---

## FAZA 7: Kosztorys (CORE)

**Branch:** `ralph/phase7-kosztorys`

### Planowane Stories (~20):
- KSZ-001: Kosztorys page layout (3-column: sidebar, table, detail)
- KSZ-002: Server Actions for kosztorys_pozycje CRUD
- KSZ-003: Kosztorys table with TanStack Table
- KSZ-004: Position grouping by branża/kategoria
- KSZ-005: KPI summary bar (wartość, marża, zysk, cena/m²)
- KSZ-006: Sidebar with branża tree and sums
- KSZ-007: Position detail panel
- KSZ-008: Skladowe display (robocizna + materialy)
- KSZ-009: Implement calculatePosition() utility
- KSZ-010: Implement getEffectiveSkladowe() with overrides
- KSZ-011: Inline cell editing (double-click)
- KSZ-012: Keyboard navigation (Tab, Arrows, Enter)
- KSZ-013: Undo/Redo (Ctrl+Z/Y)
- KSZ-014: Add new position
- KSZ-015: Delete selected positions
- KSZ-016: Override stawka/cena in detail panel
- KSZ-017: Change podwykonawca/dostawca in detail panel
- KSZ-018: Reset overrides
- KSZ-019: Locked revision banner + disabled editing
- KSZ-020: Client view toggle (hide R/M/Narzut)

**Źródło:** `wireframe/js/views/kosztorys.js` (najsłożniejszy moduł!)
**Utils:** `wireframe/docs/BUSINESS-LOGIC.md`

---

## FAZA 8: Kalkulatory

**Branch:** `ralph/phase8-kalkulatory`

### Planowane Stories (~8):
- KALK-001: Kalkulatory page with cards
- KALK-002: Calculator modal framework
- KALK-003: Malowanie calculator
- KALK-004: Płytki calculator
- KALK-005: Sufit GK calculator
- KALK-006: Ściany GK calculator
- KALK-007: Calculator results display
- KALK-008: Add calculator result to kosztorys

**Źródło:** `wireframe/js/views/kalkulatory.js`

---

## Jak używać Ralph

### Uruchomienie dla aktualnej fazy:
```bash
cd /home/artur/Projekty/plany-app
./scripts/ralph/ralph.sh --tool claude 15
```

### Po zakończeniu fazy:
1. Zarchiwizuj do `scripts/ralph/archive/YYYY-MM-DD-phase-name/`
2. Zaktualizuj ten dokument (zmień status fazy)
3. Stwórz nowy `prd.json` dla następnej fazy

---

## Źródła dokumentacji

| Dokument | Ścieżka |
|----------|---------|
| Data Model | `/home/artur/Projekty/wireframe/docs/DATA-MODEL.md` |
| Business Logic | `/home/artur/Projekty/wireframe/docs/BUSINESS-LOGIC.md` |
| Modules | `/home/artur/Projekty/wireframe/docs/MODULES.md` |
| Mock Data | `/home/artur/Projekty/wireframe/js/data/*.js` |
| Views | `/home/artur/Projekty/wireframe/js/views/*.js` |

---

## Kluczowe zasady

- **Wszystkie ceny są NETTO** - nie konwertuj na brutto
- **Kod hierarchii** (BUD.03.01.001) jest fundamentem całej aplikacji
- **Server Actions** zamiast API routes (Next.js 15 pattern)
- **Zustand** tylko dla UI state (expanded cards, filters) - dane w Supabase
- **Dark theme** - industrial AutoCAD style
