# Phase 12: Realizacja Dashboard

## Overview

Dashboard finansowy realizacji projektu. Dwa panele: KPI sidebar (stale widoczny, lewy) + tabela wpisow/faktur (prawy, scrollowalny). Wzorowany na layoucie kosztorysu z sidebar branzowym.

**Route:** `/projekty/[projektId]/realizacja`
**DB:** `realizacja_wpisy` (already exists from Phase 6 migration)
**Branch:** `ralph/phase12-realizacja`

---

## Layout

```
┌──────────────────────────────────────────────────────┐
│  Projekt: Biuro XYZ     [Kosztorys] [Zam] [Umowy] [Realizacja]  │
├─────────────┬────────────────────────────────────────┤
│  SIDEBAR    │  TOOLBAR: [Typ ▾] [Oplacone ▾] [Szukaj]  [+ Dodaj] │
│  (~320px)   ├────────────────────────────────────────┤
│             │                                        │
│  ┌─BUDZET─┐│  ☐ │ Typ   │ Opis  │ Nr fakt │ Data │ Powiaz │ Kwota │
│  │Plan vs  ││  ☑ │ MAT   │ Farba │ FV/001  │ 03.02│ ZAM/01 │ 12500 │
│  │Rzecz.   ││  ☐ │ ROB   │ Malow │ FV/002  │ 05.02│ UMW/01 │  8000 │
│  │per typ  ││  ...                                   │
│  │% bars   ││                                        │
│  └─────────┘│                                        │
│  ┌─ZAMOW──┐│                                        │
│  │5 zamow. ││                                        │
│  │per stat ││                                        │
│  └─────────┘│                                        │
│  ┌─UMOWY──┐│────────────────────────────────────────│
│  │4 umowy  ││  RAZEM:                    620 500 zl  │
│  │% wykon ││                                        │
│  └─────────┘│                                        │
└─────────────┴────────────────────────────────────────┘
```

---

## Sidebar Sections

### 1. Budzet (Planowane vs Rzeczywiste)

| Kategoria | Planowane | Rzeczywiste | % |
|-----------|-----------|-------------|---|
| Materialy | rewizje_summary.suma_m | SUM(realizacja_wpisy WHERE typ='material') | bar |
| Robocizna | rewizje_summary.suma_r | SUM(realizacja_wpisy WHERE typ='robocizna') | bar |
| Inne | — | SUM(realizacja_wpisy WHERE typ='inny') | — |
| RAZEM | rewizje_summary.suma_razem | SUM(wszystkie wpisy) | bar |

Progress bar colors:
- Green (<80%)
- Amber (80-100%)
- Red (>100% = overbudget)

### 2. Zamowienia mini-summary

- Total count
- Count per status (using existing ZAMOWIENIE_STATUS_CONFIG colors)
- Total wartosc from zamowienie_pozycje
- Click arrow → navigate to zamowienia tab

### 3. Umowy mini-summary

- Total count
- Count per status (using existing UMOWA_STATUS_CONFIG colors)
- Average % wykonania
- Total wartosc from umowa_pozycje
- Click arrow → navigate to umowy tab

---

## Wpisy Table

### Columns

| Column | Type | Sort | Notes |
|--------|------|------|-------|
| Oplacone | Checkbox | yes | Inline toggle, calls toggleOplacone() |
| Typ | Badge | yes | material=blue, robocizna=amber, inny=zinc |
| Opis | Text | no | Truncated |
| Numer faktury | Mono | yes | — |
| Data faktury | Date | yes | DD.MM.YYYY, default sort desc |
| Powiazanie | Link | yes | "ZAM/2026/001" or "UMW/2026/003" or "—" |
| Kwota netto | Number | yes | Right-aligned, formatted "12 500,00 zl" |

### Filters

- Typ: Wszystkie / Material / Robocizna / Inny
- Oplacone: Wszystkie / Oplacone / Nieoplacone
- Search: by opis, numer_faktury

### Footer

Summary row: total kwota_netto for current filter.

---

## SlidePanel: Dodaj/Edytuj Wpis

Fields:
- Typ * (radio: Material / Robocizna / Inny)
- Kwota netto * (number input)
- Numer faktury (optional string)
- Data faktury (optional date)
- Opis (optional string, max 500)
- Powiazanie (optional): select type (Zamowienie/Umowa/Brak) → select entity
- Oplacone (checkbox)

---

## Postgres Function

### `get_realizacja_stats(p_projekt_id UUID)`

Returns JSON:
```json
{
  "budzet": {
    "planowane_r": 380000,
    "planowane_m": 650000,
    "planowane_razem": 1339000,
    "rzeczywiste_r": 195000,
    "rzeczywiste_m": 423000,
    "rzeczywiste_inne": 15000,
    "rzeczywiste_razem": 633000
  },
  "zamowienia": {
    "total": 5,
    "per_status": {"draft": 1, "wyslane": 0, "czesciowo": 1, "dostarczone": 3, "rozliczone": 0},
    "wartosc_total": 520000
  },
  "umowy": {
    "total": 4,
    "per_status": {"draft": 1, "wyslana": 0, "podpisana": 2, "wykonana": 1, "rozliczona": 0},
    "avg_procent_wykonania": 43,
    "wartosc_total": 310000
  }
}
```

Data sources:
- budzet.planowane: `rewizje_summary` WHERE id = projekty.accepted_rewizja_id
- budzet.rzeczywiste: `realizacja_wpisy` GROUP BY typ
- zamowienia: `zamowienia` + `zamowienie_pozycje` for wartosc
- umowy: `umowy` + `umowa_pozycje` for wartosc + avg procent_wykonania

---

## Server Actions

| Action | Purpose |
|--------|---------|
| `getRealizacjaStats(projektId)` | RPC call to get_realizacja_stats |
| `getRealizacjaWpisy(projektId, filters?)` | PostgREST query with joins for zamowienia/umowy numer |
| `createRealizacjaWpis(input)` | Insert + revalidate |
| `updateRealizacjaWpis(id, input)` | Update + revalidate |
| `deleteRealizacjaWpis(id)` | Delete + revalidate |
| `toggleOplacone(id, value)` | Flip boolean + revalidate |

---

## File Structure

```
app/(app)/projekty/[projektId]/realizacja/
  page.tsx
  _components/
    realizacja-view.tsx
    realizacja-sidebar.tsx
    wpisy-table.tsx
    wpisy-empty.tsx
    panels/
      wpis-form-panel.tsx
      wpis-detail-panel.tsx

actions/realizacja.ts
lib/validations/realizacja.ts
lib/realizacja/typ-config.ts
```

---

## User Stories

| ID | Title | Priority | DependsOn |
|----|-------|----------|-----------|
| REAL-001 | Create get_realizacja_stats Postgres function | 1 | — |
| REAL-002 | Server Actions for realizacja | 1 | REAL-001 |
| REAL-003 | Validation schemas | 1 | — |
| REAL-004 | Add Realizacja tab to project-tabs.tsx | 1 | — |
| REAL-005 | Realizacja page + view with sidebar/table layout | 2 | REAL-002, REAL-003, REAL-004 |
| REAL-006 | Realizacja sidebar (budget + zamowienia + umowy sections) | 2 | REAL-005 |
| REAL-007 | Wpisy table with TanStack Table, filters, sorting | 2 | REAL-005 |
| REAL-008 | Wpis form panel (create + edit SlidePanel) | 3 | REAL-007 |
| REAL-009 | Wpis detail panel (view + delete) | 3 | REAL-007 |
| REAL-010 | Inline oplacone toggle + table footer sum | 3 | REAL-007 |
| REAL-011 | Empty state component | 3 | REAL-005 |
| REAL-012 | Seed test data for realizacja_wpisy | 4 | REAL-002 |
