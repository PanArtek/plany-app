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
| 8 | Kosztorys CORE | 14 | **COMPLETE** | `ralph/phase8a-kosztorys-foundation` |
| 8b | Kosztorys Interactions | 13 | **COMPLETE** | `ralph/phase8b-kosztorys-interactions` |
| 9 | Akceptacja + State Machine | 9 | **COMPLETE** | `ralph/phase9-akceptacja` |
| 10/11 | Zamówienia + Umowy | 13 | **COMPLETE** | `ralph/phase10-11-zamowienia-umowy` |
| 12 | Realizacja Dashboard | 13 | **COMPLETE** | `ralph/phase12-realizacja` |

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
FAZA 8 (Kosztorys CORE)        ✅ COMPLETE
        ↓               ↘
FAZA 8b (Kosztorys Interactions) ✅ COMPLETE    FAZA 9 (Akceptacja)  ✅ COMPLETE
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            FAZA 10 (Zamówienia)    FAZA 11 (Umowy)  ✅ COMPLETE
                    └───────────┬───────────┘
                                ↓
                    FAZA 12 (Realizacja Dashboard)    ✅ COMPLETE
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

## FAZA 8: Kosztorys Foundation (COMPLETE)

**Branch:** `ralph/phase8a-kosztorys-foundation` → merged to main (PR #9)
**Stories:** 14/14 COMPLETE
**Design doc:** `docs/plans/2026-02-06-phase8a-kosztorys-foundation.md`

### Co zrobiono:
- Kosztorys page layout (sidebar branża tree + main table)
- Server Actions for kosztorys CRUD (pozycje + składowe)
- KPI summary bar (wartość, R, M, narzut, cena/m²)
- Sidebar branża tree (collapsible, counts per branża)
- TanStack Table with grouping
- Position detail panel (składowe R + M)
- Add position from library (COPY pattern)
- Locked revision banner + disabled editing
- Seed kosztorys data

---

## FAZA 8b: Kosztorys Interactions (COMPLETE)

**Branch:** `ralph/phase8b-kosztorys-interactions` → merged to main (PR #11)
**Stories:** 13/13 COMPLETE
**Design doc:** `docs/plans/2026-02-06-phase8b-kosztorys-interactions.md`

### Co zrobiono:
- Inline cell editing (double-click on ilość, cena, stawka, narzut)
- Keyboard navigation (arrows, tab, enter, escape)
- Row selection + context toolbar (multi-select with Shift/Ctrl)
- Bulk actions: delete selected, change narzut
- Override stawka/cena in detail panel
- Change preferred dostawca/podwykonawca
- Client view toggle (hide R/M/Narzut columns)
- Undo/Redo (Ctrl+Z/Y, stack 20)

---

## FAZA 9: Akceptacja + State Machine (COMPLETE)

**Branch:** `ralph/phase9-akceptacja` → merged to main (PR #10)
**Stories:** 9/9 COMPLETE
**Design doc:** `docs/plans/2026-02-06-phase9-akceptacja.md`

### Co zrobiono:
- Status transition actions (state machine validation)
- Accept revision action (is_accepted, accepted_at, status=realizacja)
- Status change UI (contextual buttons per status)
- Auto-generate draft zamówień (Postgres function)
- Auto-generate draft umów (Postgres function)
- Locked project UI indicators
- Project status badges and workflow

---

## FAZA 10/11: Zamówienia + Umowy (COMPLETE)

**Branch:** `ralph/phase10-11-zamowienia-umowy` → merged to main (PR #12)
**Stories:** 13/13 COMPLETE
**Design doc:** `docs/plans/2026-02-06-phase10-11-zamowienia-umowy.md`

### Co zrobiono:
- Zamówienia: full CRUD, validation schemas, status config, table with filters
- Zamówienia: detail panel, status workflow (draft→wysłane→częściowo→dostarczone→rozliczone)
- Zamówienia: dostawy tracking, pozycje management
- Umowy: full CRUD, validation schemas, status config, table with filters
- Umowy: detail panel, status workflow (draft→wysłana→podpisana→wykonana→rozliczona)
- Umowy: wykonanie tracking, pozycje management
- Project tabs integration (zamówienia + umowy tabs)
- Seed data for both modules

---

## FAZA 12: Realizacja Dashboard (COMPLETE)

**Branch:** `ralph/phase12-realizacja` → merged to main (PR #13)
**Stories:** 13/13 COMPLETE
**Design doc:** `docs/plans/2026-02-06-phase12-realizacja-dashboard.md`

### Co zrobiono:
- Postgres function `get_realizacja_stats` (budget aggregation from rewizje_summary, realizacja_wpisy, zamówienia, umowy)
- Validation schemas (wpisCreateSchema, wpisFormSchema with zodResolver compatibility)
- Typ config (material=blue, robocizna=amber, inny=zinc)
- 8 Server Actions (stats, wpisy CRUD, toggle opłacone, select options)
- Two-column layout: KPI sidebar + wpisy table
- Budget sidebar with progress bars (green/amber/red)
- Zamówienia/umowy sections with per-status counts and navigation links
- TanStack Table with 7 columns, sorting, RAZEM footer
- Inline opłacone toggle with useTransition
- SlidePanel form for create/edit with typ toggle group and powiązanie select
- Detail panel with inline delete confirmation
- Empty state with CTA
- Seed data (6 wpisy: 2 material, 2 robocizna, 2 inny)

### Redesign: Checklista tab (PR #14)

**Branch:** `ralph/realizacja-dashboard-redesign` → merged to main (PR #14)
**Stories:** 5/5 COMPLETE
**Design doc:** `docs/plans/2026-02-08-realizacja-dashboard-redesign.md`

Redesign realizacji z expense trackera na operational hub:
- **Checklista tab** (domyślna) — przegląd zamówień do wysłania i umów do podpisania
  - Sekcja "Zamówienia materiałów" z done/total counter i wierszami-linkami
  - Sekcja "Umowy z podwykonawcami" z done/total counter i % wykonania
  - Status badges z kolorami z status-config
  - Done items: faded + green checkmark; undone: arrow icon
- **Tab switcher** z URL state (`?tab=checklista|wpisy`)
- **Progress bars** w sidebarze (amber, done/total) dla zamówień i umów
- Server Actions: `getZamowieniaChecklista()`, `getUmowyChecklista()` z agregacją wartości

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
