# Design: Wybór kategorii w formularzu pozycji

**Data:** 2026-02-05
**Status:** Zatwierdzony
**Branch:** `ralph/pozycje-kategoria-select`

## Problem

Formularz dodawania pozycji nie ma powiązania z kategoriami. Użytkownik musi ręcznie wpisywać cały kod (np. `BUD.03.01.001`), a `kategoria_id` jest zawsze `null`.

## Rozwiązanie

Trzy cascading selecty: Branża → Kategoria → Podkategoria, z auto-generowanym kodem pozycji.

## UI

```
┌─────────────────────────────────────────┐
│ Dodaj pozycję                           │
├─────────────────────────────────────────┤
│ Kategoria                               │
│ [Branża ▼] [Kategoria ▼] [Podkat. ▼]   │
│                                         │
│ Kod                                     │
│ [BUD.03.01.003] (disabled, auto)        │
│ ↳ Sugerowany następny numer             │
│                                         │
│ Nazwa                                   │
│ [________________________]              │
│                                         │
│ Jednostka          Typ                  │
│ [m² ▼]            [Komplet ▼]           │
│                                         │
│              [Anuluj] [Dodaj]           │
└─────────────────────────────────────────┘
```

## Reguły

- Pozycja **zawsze** przypisana do podkategorii (poziom 3)
- Kod pozycji = `{podkategoria.kod}.{autoNR}` (np. `BUD.03.01.003`)
- Numer pozycji (001-999) auto-generowany - następny wolny
- Kod jest disabled - użytkownik nie wpisuje ręcznie

## Przepływ danych

### Server Actions

1. **`getKategorieByPoziom(poziom, parentId?)`**
   - poziom 1: wszystkie branże
   - poziom 2: kategorie dla wybranej branży
   - poziom 3: podkategorie dla wybranej kategorii
   - Zwraca: `{ id, kod, nazwa }[]`

2. **`getNextPozycjaKod(kategoriaId)`**
   - Pobiera kod kategorii (np. `BUD.03.01`)
   - Znajduje max numer pozycji w tej kategorii
   - Zwraca pełny kod: `BUD.03.01.003`

### Hook `usePozycjaForm`

```typescript
interface UsePozycjaFormState {
  branzaId: string | null;
  kategoriaId: string | null;
  podkategoriaId: string | null;

  branze: Kategoria[];
  kategorie: Kategoria[];
  podkategorie: Kategoria[];

  suggestedKod: string | null;
  isLoadingKod: boolean;
}
```

**Zachowanie:**
- Przy zmianie branży → fetch kategorie, reset kategoriaId/podkategoriaId
- Przy zmianie kategorii → fetch podkategorie, reset podkategoriaId
- Przy zmianie podkategorii → fetch `getNextPozycjaKod`

### Zapis

- `kategoria_id` = wybrana podkategoria (poziom 3)
- `kod` = wygenerowany kod

## Zmiany w plikach

### Nowe pliki
- `hooks/use-pozycja-form.ts`

### Modyfikacje
- `actions/kategorie.ts` → dodać `getKategorieByPoziom()`, `getNextPozycjaKod()`
- `app/(app)/pozycje/_components/modals/pozycja-form-modal.tsx` → nowy UI
- `lib/validations/pozycje.ts` → usunąć regex walidację kodu

### Bez zmian
- `actions/pozycje.ts` → już obsługuje `kategoriaId`
- Schema bazy → `kategoria_id` już istnieje

## User Stories

| ID | Tytuł | Zależności |
|----|-------|------------|
| POZ-KAT-001 | Server Action getKategorieByPoziom | - |
| POZ-KAT-002 | Server Action getNextPozycjaKod | - |
| POZ-KAT-003 | Hook usePozycjaForm | POZ-KAT-001, POZ-KAT-002 |
| POZ-KAT-004 | UI modal z cascading selectami | POZ-KAT-003 |
