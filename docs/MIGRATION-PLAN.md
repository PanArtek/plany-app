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
| 7 | Projekty + Rewizje | ~10 | Pending | `ralph/phase6-projekty` |
| 8 | Kosztorys (CORE) | ~20 | Pending | `ralph/phase7-kosztorys` |
| 9 | Kalkulatory | ~8 | Pending | `ralph/phase8-kalkulatory` |

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
FAZA 7 (Projekty + Rewizje)    ⏳ Pending
                ↓
FAZA 8 (Kosztorys CORE)        ⏳ Pending ← wymaga 3,4,5,6,7
                ↓
FAZA 9 (Kalkulatory)           ⏳ Pending
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

## FAZA 7: Projekty + Rewizje (Pending)

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
- PROJ-009: Lock/unlock revision + akceptacja
- PROJ-010: Seed projekty + rewizje data from wireframe

**Źródło:** `wireframe/js/views/projekty.js`

---

## FAZA 8: Kosztorys (CORE) (Pending)

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

## FAZA 9: Kalkulatory (Pending)

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
