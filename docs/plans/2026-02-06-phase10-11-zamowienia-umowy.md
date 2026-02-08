# Phase 10/11: Zamówienia + Umowy

## Overview

UI and server action layer for zamówienia (material orders to suppliers) and umowy (subcontractor contracts). Database schema is already fully implemented — this phase covers only the application layer.

## Prerequisites

- Phase 9 (Akceptacja): COMPLETE
- DB tables: zamowienia, zamowienie_pozycje, zamowienie_pozycje_zrodla, zamowienie_dostawy, zamowienie_dostawy_pozycje, umowy, umowa_pozycje, umowa_pozycje_zrodla, umowa_wykonanie, realizacja_wpisy
- DB functions: generate_zamowienia_draft, generate_umowy_draft, trigger_auto_numer_zamowienia, trigger_auto_numer_umowy, trigger_update_zamowienie_dostarczona, trigger_update_umowa_wykonana
- DB enums: zamowienie_status (draft/wyslane/czesciowo/dostarczone/rozliczone), umowa_status (draft/wyslana/podpisana/wykonana/rozliczona)

---

## 1. Routing & Shared Layout

### New structure

```
app/(app)/projekty/[projektId]/
├── layout.tsx                          ← NEW: project header + tab bar
├── _components/
│   └── project-tabs.tsx                ← 'use client' tab bar (usePathname)
├── kosztorys/
│   └── page.tsx                        ← existing (no changes to logic)
├── zamowienia/
│   └── page.tsx                        ← NEW
└── umowy/
    └── page.tsx                        ← NEW
```

### Layout (layout.tsx)

Server component. Fetches `getProjekt(projektId)` and renders:
1. **Project header** — project name + StatusBadge
2. **Tab bar** — three links:
   - **Kosztorys** — always active
   - **Zamówienia** — disabled + tooltip when status !== `realizacja`/`zamkniety`
   - **Umowy** — same

Active tab: amber underline (consistent with app UI). Disabled tabs: `text-white/20`, `pointer-events-none`, tooltip "Zaakceptuj rewizję".

Tab bar uses `usePathname()` to detect active tab → small `'use client'` wrapper (`project-tabs.tsx`).

### Impact on existing kosztorys

Project header moves to layout → kosztorys-view loses project name duplication. Revision selector, table, locked banner stay unchanged.

---

## 2. Draft Generation Flow

### Auto-generation on acceptance (hybrid)

In `actions/acceptance.ts`, after successful transition to `realizacja`:

```typescript
await supabase.rpc('generate_zamowienia_draft', { p_projekt_id, p_rewizja_id: rewizjaId });
await supabase.rpc('generate_umowy_draft', { p_projekt_id, p_rewizja_id: rewizjaId });
```

Errors ignored (don't block acceptance). Drafts may be empty if no materials/labor.

### Empty state fallback

If user opens zamówienia/umowy and list is empty:
- Empty state illustration + "Generuj zamówienia z rewizji R{n}" button
- Calls same RPC, revalidatePath → table appears

### Re-generation

If user reverts to `ofertowanie`, changes revision, re-accepts:
- Old drafts (status=draft) deleted by RPC
- New drafts generated
- Orders/contracts with status > draft untouched

---

## 3. Zamówienia — Table & Detail Panel

### Table columns

| Column | Source | Format |
|--------|--------|--------|
| Numer | zamowienia.numer | `ZAM/2026/001` mono |
| Dostawca | join dostawcy.nazwa | text |
| Status | zamowienia.status | colored badge |
| Pozycje | count zamowienie_pozycje | number |
| Wartość | sum zamowienie_pozycje.wartosc | `XX XXX zł` |
| Dostarczone | Σ dostarczona / Σ zamówiona | `12/20 szt` or progress % |

### Status badge colors

- **draft** → zinc/gray
- **wyslane** → blue
- **czesciowo** → amber
- **dostarczone** → emerald
- **rozliczone** → dark gray

### Detail Panel (SlidePanel variant="wide")

**Header:** Numer + StatusBadge

**Section "Dane zamówienia":**
- Dostawca (nazwa)
- Data zamówienia
- Planowana data dostawy
- Uwagi

**Section "Pozycje" — mini table:**

| Produkt | Ilość | Cena j. | Wartość | Dostarczone |
|---------|-------|---------|---------|-------------|
| Płyta GK 12.5mm | 150 szt | 32,50 zł | 4 875,00 zł | 100/150 |

**Section "Dostawy" — list:**
Each delivery as a card block: date + WZ number + notes. Click expands delivery items.

**Section "Akcje" — contextual buttons:**

| Status | Buttons |
|--------|---------|
| draft | "Wyślij" (blue) + "Usuń" (red ghost) |
| wyslane | "Dodaj dostawę" (amber) |
| czesciowo | "Dodaj dostawę" (amber) + "Oznacz jako dostarczone" (green ghost) |
| dostarczone | "Rozlicz" (gray) |
| rozliczone | none |

"Dodaj dostawę" opens inline form: date, WZ number, notes + table of pozycje with quantity inputs.

---

## 4. Umowy — Table & Detail Panel

### Table columns

| Column | Source | Format |
|--------|--------|--------|
| Numer | umowy.numer | `UMW/2026/001` mono |
| Podwykonawca | join podwykonawcy.nazwa | text |
| Status | umowy.status | colored badge |
| Pozycje | count umowa_pozycje | number |
| Wartość | sum umowa_pozycje.wartosc | `XX XXX zł` |
| Wykonanie | avg procent_wykonania | progress bar + `XX%` |

### Status badge colors

- **draft** → zinc/gray
- **wyslana** → blue
- **podpisana** → amber
- **wykonana** → emerald
- **rozliczona** → dark gray

### Detail Panel

**Header:** Numer + StatusBadge

**Section "Dane umowy":**
- Podwykonawca (nazwa, specjalizacja)
- Data podpisania (if signed)
- Warunki płatności
- Uwagi

**Section "Załącznik cennikowy" — mini table:**

| Pozycja | Jedn. | Ilość | Stawka | Wartość | Wykonano | % |
|---------|-------|-------|--------|---------|----------|---|
| Montaż GK | m² | 200 | 45,00 zł | 9 000 zł | 120/200 | 60% |

Each row has progress bar in `%` column. Click row → inline form "Dodaj wpis wykonania" (date, quantity, notes).

**Section "Akcje":**

| Status | Buttons |
|--------|---------|
| draft | "Wyślij" (blue) + "Usuń" (red ghost) |
| wyslana | "Oznacz jako podpisana" (amber) |
| podpisana | "Dodaj wykonanie" (per pozycja) + "Oznacz jako wykonana" (green ghost) |
| wykonana | "Rozlicz" (gray) |
| rozliczona | none |

Key difference vs zamówienia: execution tracking is **per pozycja** (click row in table), not per separate delivery entity. Simpler UX.

---

## 5. Server Actions & Validation

### actions/zamowienia.ts

```typescript
// Queries
getZamowienia(projektId)               // list with join dostawca + count/sum
getZamowienie(id)                       // details + pozycje + dostawy
generateZamowieniaDraft(projektId)      // RPC generate_zamowienia_draft

// Mutations
updateZamowienie(id, input)             // edit draft only (dates, notes)
deleteZamowienie(id)                    // draft only
changeZamowienieStatus(id, newStatus)   // TS-side transition validation

// Dostawy
addDostawa(zamowienieId, input)         // date, numer_wz, notes + pozycje[{id, ilosc}]
```

### actions/umowy.ts

```typescript
// Queries
getUmowy(projektId)                     // list with join podwykonawca + count/sum/avg%
getUmowa(id)                            // details + pozycje + wykonanie
generateUmowyDraft(projektId)           // RPC generate_umowy_draft

// Mutations
updateUmowa(id, input)                  // edit draft (dates, conditions, notes)
deleteUmowa(id)                         // draft only
changeUmowaStatus(id, newStatus)        // TS-side transition validation

// Wykonanie
addWykonanie(umowaPozycjaId, input)     // data_wpisu, ilosc_wykonana, uwagi
```

### Validation schemas

**lib/validations/zamowienia.ts:**
- `zamowienieEditSchema` — data_zamowienia (date), data_dostawy_planowana (date, optional), uwagi (string, optional)
- `dostawaSchema` — data_dostawy (date, required), numer_wz (string, optional), uwagi (optional), pozycje: array of `{ zamowienie_pozycja_id: uuid, ilosc: number > 0 }`

**lib/validations/umowy.ts:**
- `umowaEditSchema` — data_podpisania (date, optional), warunki_platnosci (string, optional), uwagi (optional)
- `wykonanieSchema` — data_wpisu (date, required), ilosc_wykonana (number > 0), uwagi (optional)

### Status transitions — no Postgres RPC needed

Simple `UPDATE SET status` in server action with TS-side allowed transitions map. No complex side-effects — the only automation is `czesciowo`/`dostarczone` triggered by delivery sums, which DB triggers already handle.

---

## 6. File Map

### New files (~14)

```
app/(app)/projekty/[projektId]/
├── layout.tsx
├── _components/
│   └── project-tabs.tsx
├── zamowienia/
│   ├── page.tsx
│   └── _components/
│       ├── zamowienia-view.tsx
│       ├── zamowienia-table.tsx
│       ├── zamowienia-empty.tsx
│       └── panels/
│           ├── zamowienie-detail-panel.tsx
│           └── dostawa-form.tsx
└── umowy/
    ├── page.tsx
    └── _components/
        ├── umowy-view.tsx
        ├── umowy-table.tsx
        ├── umowy-empty.tsx
        └── panels/
            ├── umowa-detail-panel.tsx
            └── wykonanie-form.tsx

lib/
├── validations/zamowienia.ts
├── validations/umowy.ts
├── zamowienia/status-config.ts
└── umowy/status-config.ts

actions/
├── zamowienia.ts
└── umowy.ts
```

### Modified files (~3)

```
actions/acceptance.ts                    ← add auto-generate after acceptance
app/(app)/projekty/[projektId]/kosztorys/_components/kosztorys-view.tsx
    ← remove project header duplication (moved to layout)
```

### Summary

- ~14 new files (pages, components, actions, validations, configs)
- ~3 modified files
- 0 new migrations (DB ready)
