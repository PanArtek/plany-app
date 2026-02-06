# PLANY App - Plan Migracji z Wireframe

## Przegląd Faz

| Faza | Nazwa | Stories | Status | Branch |
|------|-------|---------|--------|--------|
| 1 | Database Setup | 11 | **COMPLETE** | `ralph/phase1-database-setup` |
| 2 | UI Base + Layout | 13 | **COMPLETE** | `ralph/phase2-ui-base` |
| 3 | Kategorie + Pozycje | 13 | **COMPLETE** | `ralph/phase3-kategorie-pozycje` |
| 3b | Składowe (Materiały) | 4 | **COMPLETE** | `ralph/phase3b-skladowe` |
| 4 | Materiały + Dostawcy | 13 | **COMPLETE** | `ralph/phase4-materialy-dostawcy` |
| 5 | Podwykonawcy | 10 | **COMPLETE** | `ralph/phase5-podwykonawcy` |
| 6 | Business Logic DB | 12 | **COMPLETE** | `ralph/business-logic-db-migration` |
| 7 | Projekty + Rewizje | 10 | **COMPLETE** | `ralph/phase7-projekty` |
| 8 | Kosztorys CORE | ~20 | Pending | `ralph/phase8-kosztorys` |
| 8b | Kalkulatory | ~8 | Pending | `ralph/phase8b-kalkulatory` |
| 9 | Akceptacja + State Machine | ~6 | Pending | `ralph/phase9-akceptacja` |
| 10 | Zamówienia | ~12 | Pending | `ralph/phase10-zamowienia` |
| 11 | Umowy | ~10 | Pending | `ralph/phase11-umowy` |
| 12 | Realizacja Dashboard | ~8 | Pending | `ralph/phase12-realizacja` |

---

## Zależności między fazami

```
FAZA 1 (Database)              ✅ COMPLETE
    ↓
FAZA 2 (UI Base)               ✅ COMPLETE
    ↓
FAZA 3 (Kategorie + Pozycje)   ✅ COMPLETE ← fundamenty dla wszystkiego
    ↓
FAZA 3b (Składowe)             ✅ COMPLETE
    ↓
┌───────────────┬───────────────┐
↓               ↓               ↓
FAZA 4        FAZA 5          ← oba ✅ COMPLETE
(Materiały)   (Podwykonawcy)
└───────────────┴───────────────┘
                ↓
FAZA 6 (Business Logic DB)     ✅ COMPLETE ← enumy, zamówienia, umowy, realizacja
                ↓
FAZA 7 (Projekty + Rewizje)    ✅ COMPLETE
                ↓
FAZA 8 (Kosztorys CORE)        ⏳ Pending ← wymaga 3,4,5,6,7
        ↓               ↘
FAZA 8b (Kalkulatory)    FAZA 9 (Akceptacja)  ← niezależne
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            FAZA 10 (Zamówienia)    FAZA 11 (Umowy)  ← równoległe
                    └───────────┬───────────┘
                                ↓
                    FAZA 12 (Realizacja Dashboard)
```

---

## FAZA 1: Database Setup (COMPLETE)

**Branch:** `ralph/phase1-database-setup` → merged to main
**Stories:** 11/11 COMPLETE

17 tabel fundamentu: organizations, organization_members, kategorie, narzuty_domyslne, produkty, dostawcy, ceny_dostawcow, podwykonawcy, stawki_podwykonawcow, pozycje_biblioteka, biblioteka_skladowe_robocizna, biblioteka_skladowe_materialy, projekty, rewizje, kosztorys_pozycje, kosztorys_skladowe_robocizna, kosztorys_skladowe_materialy

---

## FAZA 2: UI Base + Layout (COMPLETE)

**Branch:** `ralph/phase2-ui-base` → merged to main
**Stories:** 13/13 COMPLETE

App shell, sidebar, dark theme, placeholder pages for all routes.

---

## FAZA 3: Kategorie + Pozycje (COMPLETE)

**Branch:** `ralph/phase3-kategorie-pozycje` → merged to main
**Stories:** 13/13 COMPLETE

Kategorie CRUD (tabs, cards, expand/collapse), Pozycje CRUD (filters, table, detail panel, składowe).

---

## FAZA 4: Materiały + Dostawcy (COMPLETE)

**Branch:** `ralph/phase4-materialy-dostawcy` → merged to main
**Stories:** 13/13 COMPLETE

Materiały CRUD, Dostawcy CRUD z cennikiem, detail panels, seed data.

---

## FAZA 5: Podwykonawcy (COMPLETE)

**Branch:** `ralph/phase5-podwykonawcy` → merged to main
**Stories:** 10/10 COMPLETE

Podwykonawcy CRUD z stawkami powiązanymi z pozycje_biblioteka, detail panel.

---

## FAZA 6: Business Logic DB Migration (COMPLETE)

**Branch:** `ralph/business-logic-db-migration` → merged to main (PR #7)
**Stories:** 12/12 COMPLETE
**Design doc:** `docs/plans/2026-02-06-business-logic-db-migration.md`

### Co zrobiono:
- 3 nowe enumy (zamowienie_status, umowa_status, realizacja_wpis_typ)
- ALTER rewizje (+is_accepted, +accepted_at), projekty (+accepted_rewizja_id)
- 10 nowych tabel (zamówienia 5 + umowy 4 + realizacja 1)
- 27 indeksów
- 40 RLS policies (4 per tabela × 10 tabel)
- Triggery: prevent_unlock, updated_at, auto_numer (ZAM/UMW), auto_sum
- Funkcje: generate_zamowienia_draft, generate_umowy_draft
- Funkcje UX: get_podwykonawcy_aggregated, get_dostawcy_aggregated
- TypeScript types regenerated

---

## FAZA 7: Projekty + Rewizje (COMPLETE)

**Branch:** `ralph/phase7-projekty` → merged to main
**Stories:** 10/10 COMPLETE

Projekty CRUD (table, filters, pagination, status badges), Rewizje CRUD (create, lock/unlock, selector), detail panel, form panel, delete confirmation, seed data.

---

## FAZA 8: Kosztorys CORE (Pending)

**Branch:** `ralph/phase8-kosztorys`
**Route:** `/projekty/[id]/kosztorys`

### Planowane Stories (~20):
- KSZ-001: Kosztorys page layout (3-column: sidebar, table, detail)
- KSZ-002: Server Actions for kosztorys CRUD
- KSZ-003: KPI summary bar (wartość, marża, zysk, cena/m²)
- KSZ-004: Sidebar branża tree (collapsible, counts)
- KSZ-005: Main table with TanStack Table (grouping)
- KSZ-006: Position detail panel (składowe R + M)
- KSZ-007: calculatePosition utility (formula)
- KSZ-008: getEffectiveSkladowe utility (3-tier price discovery)
- KSZ-009: Add position from library (COPY pattern)
- KSZ-010: Inline cell editing (double-click)
- KSZ-011: Keyboard navigation (arrows, tab, enter)
- KSZ-012: Undo/Redo (Ctrl+Z/Y, stack 20)
- KSZ-013: Delete selected positions (multi-select)
- KSZ-014: Override stawka/cena in detail panel
- KSZ-015: Change preferred dostawca/podwykonawca
- KSZ-016: Locked revision banner + disabled editing
- KSZ-017: Client view toggle (hide R/M/Narzut)
- KSZ-018: Add inline position (new row)
- KSZ-019: Row selection + context toolbar
- KSZ-020: Seed kosztorys data

**Źródło:** `wireframe/js/views/kosztorys.js` (najsłożniejszy moduł!)

---

## FAZA 8b: Kalkulatory (Pending)

**Branch:** `ralph/phase8b-kalkulatory`
**Route:** `/kalkulatory`
**Niezależny** - może być realizowany równolegle z Phase 9-12.

### Planowane Stories (~8):
- KALK-001: Kalkulatory page with cards
- KALK-002: Calculator SlidePanel framework
- KALK-003: Kalkulator Malowanie
- KALK-004: Kalkulator Płytki
- KALK-005: Kalkulator Sufit GK
- KALK-006: Kalkulator Ściany GK
- KALK-007: Wyniki kalkulacji (tabela)
- KALK-008: Dodaj do kosztorysu

**Źródło:** `wireframe/js/views/kalkulatory.js`

---

## FAZA 9: Akceptacja + State Machine (Pending)

**Branch:** `ralph/phase9-akceptacja`
**Route:** rozszerzenie `/projekty/[id]`
**DB:** Already done (is_accepted, accepted_at, accepted_rewizja_id, triggers)

### Planowane Stories (~6):
- AKC-001: Status transition actions (state machine validation)
- AKC-002: Accept revision action (is_accepted, accepted_at, status=realizacja)
- AKC-003: Status change UI (contextual buttons per status)
- AKC-004: Auto-generate draft zamówień (Postgres function)
- AKC-005: Auto-generate draft umów (Postgres function)
- AKC-006: Locked project UI indicators

---

## FAZA 10: Zamówienia (Pending)

**Branch:** `ralph/phase10-zamowienia`
**Route:** `/projekty/[id]/zamowienia`
**DB:** 5 tabel already exist

### Planowane Stories (~12):
- ZAM-001: Server Actions for zamowienia CRUD
- ZAM-002: Validation schemas
- ZAM-003: Zamówienia list page (table, filters, pagination)
- ZAM-004: Zamówienie detail panel (pozycje + dostawy)
- ZAM-005: Status badges (draft/wysłane/częściowo/dostarczone/rozliczone)
- ZAM-006: Status change actions (state machine)
- ZAM-007: Zamówienie pozycje view
- ZAM-008: Dodaj dostawę (SlidePanel + auto-update)
- ZAM-009: Dostawa detail
- ZAM-010: Link z projektu (mini-lista + navigate)
- ZAM-011: Edycja zamówienia draft (editable only in draft)
- ZAM-012: Podsumowanie zamówień w projekcie

---

## FAZA 11: Umowy (Pending)

**Branch:** `ralph/phase11-umowy`
**Route:** `/projekty/[id]/umowy`
**DB:** 4 tabele already exist

### Planowane Stories (~10):
- UMW-001: Server Actions for umowy CRUD
- UMW-002: Validation schemas
- UMW-003: Umowy list page (table + % wykonania)
- UMW-004: Umowa detail panel (załącznik cennikowy + wpisy)
- UMW-005: Status badges (draft/wysłana/podpisana/wykonana/rozliczona)
- UMW-006: Status change actions (state machine)
- UMW-007: Załącznik cennikowy (pozycje + ilość_wykonana + %)
- UMW-008: Dodaj wpis wykonania (SlidePanel)
- UMW-009: Link z projektu
- UMW-010: Podsumowanie umów w projekcie

---

## FAZA 12: Realizacja Dashboard (Pending)

**Branch:** `ralph/phase12-realizacja`
**Route:** `/projekty/[id]/realizacja`
**DB:** `realizacja_wpisy` already exists

### Planowane Stories (~8):
- REAL-001: Server Actions for realizacja (stats + wpisy CRUD)
- REAL-002: Dashboard page (KPI cards + breakdown)
- REAL-003: Postgres function get_realizacja_stats
- REAL-004: Wpisy list (faktury table)
- REAL-005: Dodaj wpis form (SlidePanel)
- REAL-006: Zamówienia/umowy summary mini-section
- REAL-007: Opłacone toggle (inline checkbox)
- REAL-008: Link z projektu (mini KPI + navigate)

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
