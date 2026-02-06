# Pozycje UX Improvements

**Data:** 2026-02-06
**Branch:** `ralph/pozycje-ux-improvements`

## Cel

Poprawa UX strony Pozycje: breadcrumb zamiast tytulu, szersze taby branz, szersze filtry, paginacja server-side (15 pozycji/strona), lepszy layout elementow.

## Zmiany

### 1. Breadcrumb zamiast tytulu "Pozycje"

**Plik:** `app/(app)/pozycje/page.tsx`

- Usunac `<h1>Pozycje</h1>`
- Dodac komponent breadcrumb (non-clickable, display-only)
- Format: `Pozycje / BUD / 01 - Roboty rozbiórkowe / 01 - Rozkład podłogi`
- Kazdy segment pokazuje aktualny filtr
- Bez branza: tylko "Pozycje"
- Z branza: "Pozycje / BUD"
- Z kategoria: "Pozycje / BUD / 01 - Roboty rozbiórkowe"
- Z podkategoria: pelna sciezka
- Styl: `text-sm`, separatory `/` w `text-white/30`, aktywny segment `text-foreground`, wczesniejsze `text-white/50`
- Breadcrumb w jednym rzedzie z przyciskiem "Dodaj pozycje" (prawo)

### 2. Szersze taby branz (Row 2)

**Plik:** `pozycje-filters.tsx`

- Zwiekszyc padding: `px-6 py-2.5` (bylo `px-4 py-2`)
- Kontener na full width
- Taby `flex-1` - rownomiernie wypelniaja szerokosc
- Zachowac skroty (BUD, ELE, SAN, TEL, HVC)
- Zachowac styl amber glow na aktywnym

### 3. Filtry w jednym rzedzie (Row 3)

**Plik:** `pozycje-filters.tsx`

- Search input: `flex-1` (wypelnia reszte)
- Kategoria dropdown: `w-[320px]` (bylo `w-[260px]`)
- Podkategoria dropdown: `w-[320px]` (bylo `w-[260px]`)
- Wszystkie trzy side-by-side w jednym rzedzie
- Kategoria/podkategoria widoczne tylko gdy branza wybrana (jak teraz)

### 4. Paginacja server-side

**Pliki:** `actions/pozycje.ts`, `page.tsx`, `pozycje-view.tsx`, `pozycje-table.tsx`, nowy `pozycje-pagination.tsx`

#### Backend (actions/pozycje.ts):
- Dodac parametr `page` do `PozycjeFilters`
- Zmienic `getPozycje()` na paginowane zapytanie z `.range(from, to)` i `count: 'exact'`
- Zwracac `{ data: Pozycja[], totalCount: number, page: number, pageSize: number }`
- `pageSize = 15`

#### Frontend:
- `page.tsx`: przekazac `page` param z URL
- `pozycje-view.tsx`: przekazac totalCount do paginacji
- Nowy komponent `pozycje-pagination.tsx`:
  - Lewa strona: "Wyświetlanie 1-15 z 87"
  - Prawa strona: `[ < ] [ 1 ] [ 2 ] [ 3 ] ... [ 6 ] [ > ]`
  - Aktywna strona podswietlona amber
  - Nawigacja przez URL params (`?page=2`)

### 5. Layout - kolejnosc elementow

Finalna struktura strony:
```
Row 1: [Breadcrumb: Pozycje / BUD / kat / podkat]  ............  [+ Dodaj pozycje]
Row 2: [BUD] [ELE] [SAN] [TEL] [HVC]  (full-width, flex-1 each)
Row 3: [Search.....] [Kategoria ▼ 320px] [Podkategoria ▼ 320px]
       [Tabela - 15 pozycji]
Row N: [Wyswietlanie 1-15 z 87]  ............  [< 1 2 3 ... 6 >]
```

## Pliki do modyfikacji

1. `app/(app)/pozycje/page.tsx` - breadcrumb, page param
2. `app/(app)/pozycje/_components/pozycje-filters.tsx` - layout, wider tabs/dropdowns
3. `app/(app)/pozycje/_components/pozycje-view.tsx` - breadcrumb, pagination data
4. `app/(app)/pozycje/_components/pozycje-table.tsx` - bez zmian (moze drobne)
5. `app/(app)/pozycje/_components/pozycje-pagination.tsx` - NOWY
6. `actions/pozycje.ts` - server-side pagination
7. `lib/validations/pozycje.ts` - dodac `page` do filtra
