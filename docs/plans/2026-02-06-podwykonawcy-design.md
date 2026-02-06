# Faza 5: Podwykonawcy - Design

> Data: 2026-02-06
> Branch: `ralph/phase5-podwykonawcy`
> Base: `main`

## Przegląd

Moduł zarządzania podwykonawcami (ekipami roboczymi) z cennikiem stawek powiązanych z pozycjami bibliotecznymi. Wzorzec 1:1 z modułem Dostawcy.

## Decyzje projektowe

### Cennik stawek - powiązanie z pozycjami (Opcja A)

**Problem:** Obecna tabela `stawki_podwykonawcow` ma `nazwa_stawki` (free-form tekst), wireframe zakłada powiązanie z `pozycja_biblioteka`.

**Decyzja:** Przebudować tabelę - zamienić `nazwa_stawki` + `jednostka` na `pozycja_biblioteka_id` FK.

**Uzasadnienie:**
- Spójność z modułem Kosztorys (automatyczne pobieranie stawek po pozycji)
- Analogia Dostawcy→ceny_dostawcow→produkty = Podwykonawcy→stawki→pozycje
- Jednostka brana z pozycji bibliotecznej (nie duplikowana)

### Migracja DB

```sql
-- Przebudowa stawki_podwykonawcow
ALTER TABLE stawki_podwykonawcow
  DROP COLUMN nazwa_stawki,
  DROP COLUMN jednostka,
  ADD COLUMN pozycja_biblioteka_id UUID NOT NULL REFERENCES pozycje_biblioteka(id),
  ADD CONSTRAINT stawki_podwykonawcow_unique UNIQUE(podwykonawca_id, pozycja_biblioteka_id);

CREATE INDEX idx_stawki_pozycja_bib ON stawki_podwykonawcow(pozycja_biblioteka_id);
```

## Struktura plików

```
app/(app)/podwykonawcy/
├── page.tsx                          # Server Component
└── _components/
    ├── podwykonawcy-view.tsx         # Client - 4 panel states
    ├── podwykonawcy-table.tsx        # TanStack Table
    ├── podwykonawcy-filters.tsx      # Search + showInactive
    ├── podwykonawcy-pagination.tsx   # Pagination
    └── panels/
        ├── podwykonawca-detail-panel.tsx   # Detal + cennik inline
        ├── podwykonawca-form-panel.tsx     # Add/Edit podwykonawca
        ├── stawka-form-panel.tsx           # Add/Edit stawka (select pozycja)
        └── delete-confirm-panel.tsx        # Potwierdzenie usunięcia

actions/podwykonawcy.ts              # Server Actions
lib/validations/podwykonawcy.ts      # Zod schemas
```

## Server Actions

| Action | Opis |
|--------|------|
| `getPodwykonawcy(filters)` | Lista z count stawek, paginacja 15/page |
| `getPodwykonawca(id)` | Pojedynczy rekord |
| `getPodwykonawcaStawki(id)` | Cennik z JOIN na pozycje_biblioteka (kod, nazwa, jednostka) |
| `getPodwykonawcaPozycje(id)` | Pozycje używające tego podwykonawcy (via biblioteka_skladowe_robocizna) |
| `createPodwykonawca(input)` | Walidacja + insert + revalidate |
| `updatePodwykonawca(id, input)` | Walidacja + update + revalidate |
| `deletePodwykonawca(id)` | Sprawdzenie zależności + delete |
| `createStawka(input)` | Dodanie pozycji do cennika |
| `updateStawka(id, input)` | Edycja stawki |
| `deleteStawka(id)` | Usunięcie z cennika |

## Zod Schemas

```typescript
// lib/validations/podwykonawcy.ts
createPodwykonawcaSchema: { nazwa*, specjalizacja?, kontakt?, aktywny }
updatePodwykonawcaSchema: all optional
createStawkaSchema: { podwykonawcaId*, pozycjaBibliotekaId*, stawka* }
updateStawkaSchema: { stawka? }
podwykonawcyFiltersSchema: { search?, showInactive?, page? }
```

## Różnice vs Dostawcy

| Aspekt | Dostawcy | Podwykonawcy |
|--------|----------|-------------|
| Pole wyróżniające | `kod` (krótki kod) | `specjalizacja` (opis) |
| Cennik linkuje do | `produkty` (via ceny_dostawcow) | `pozycje_biblioteka` (via stawki) |
| Używany w | `biblioteka_skladowe_materialy` | `biblioteka_skladowe_robocizna` |
| Typowa jednostka | m², szt, mb | m², h |

## Detail panel

```
┌──────────────────────────────────────┐
│ Ekipa GK "Budmont"                   │
│ specjalizacja: GK, Tynki, Sufity     │  [Edit] [Delete]
├──────────────────────────────────────┤
│ Dane kontaktowe                       │
│ tel: 501 234 567, budmont@email.pl    │
├──────────────────────────────────────┤
│ Cennik stawek (5)      [+ Dodaj]     │
│ BUD.02.001   Demontaż ścian   25 zł/m² │
│ BUD.03.01.001 Ściana GK 12.5 42 zł/m² │
│ ...                                   │
├──────────────────────────────────────┤
│ Używany w pozycjach (3)              │
│ BUD.02.001  Demontaż ścian GK       │
│ BUD.03.01.001  Ściana GK 12.5mm     │
│ ...                                   │
└──────────────────────────────────────┘
```

## User Stories

| ID | Tytuł | Zależy od | Priorytet |
|----|-------|-----------|-----------|
| US-001 | Migracja DB: przebudowa stawki_podwykonawcow | - | 1 |
| US-002 | Zod schemas + typy | US-001 | 2 |
| US-003 | Server Actions: CRUD podwykonawcy + stawki | US-002 | 2 |
| US-004 | Strona: page + view + filters + table | US-003 | 3 |
| US-005 | Pagination | US-004 | 3 |
| US-006 | Detail panel z cennikiem inline | US-003, US-004 | 4 |
| US-007 | Form panel (add/edit podwykonawca) | US-004 | 4 |
| US-008 | Stawka form panel (select pozycja) | US-006 | 5 |
| US-009 | Delete confirm panel + walidacja zależności | US-006 | 5 |
| US-010 | Seed data: 5 podwykonawców + stawki | US-001 | 6 |

## Seed data

5 podwykonawców z wireframe:
- Ekipa GK "Budmont" (specjalizacja: GK, Tynki, Sufity)
- Tynki-Expres (Tynki maszynowe)
- Malarze Pro (Malowanie, tapetowanie)
- Płytkarze OK (Glazura, gres)
- Elektro-Mont (Instalacje elektryczne)

~11 stawek powiązanych z pozycjami bibliotecznymi.
