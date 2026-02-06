# Pozycje - Filtrowanie kaskadowe i badge'e typu

**Data:** 2026-02-06
**Moduł:** Pozycje (`/pozycje`)
**Branch:** `ralph/pozycje-filters-ux`

## Problem

1. Przy wejściu na `/pozycje` wyświetla się długa lista wszystkich pozycji - nieoptymalne
2. Brak filtrowania po kategoriach/podkategoriach - tylko taby branż i search
3. Badge typ "Komplet"/"Robocizna"/"Materiał" - zbyt długie, brak rozróżnienia kolorystycznego

## Design

### 1. Stan domyślny

- Żadna branża NIE jest zaznaczona przy wejściu
- Tabela jest pusta
- Pod tabami branż wyświetla się komunikat: "Wybierz branżę aby wyświetlić pozycje"
- Dropdowny kategorii/podkategorii są ukryte
- `getPozycje()` nie jest wywoływane gdy brak branży

### 2. Kaskadowe dropdowny

Po kliknięciu branży (np. BUD):
- Tab staje się aktywny
- Pod tabami pojawiają się dwa selecty w jednej linii: `[Kategoria ▼]` `[Podkategoria ▼]`
- Tabela od razu pokazuje wszystkie pozycje danej branży
- Dropdown Kategoria: lista kategorii branży (np. "01 - Roboty rozbiórkowe")
- Dropdown Podkategoria: disabled dopóki nie wybierze się kategorii
- Oba mają opcję "Wszystkie" jako domyślną wartość
- Wybranie kategorii zawęża listę. Wybranie podkategorii zawęża dalej
- Zmiana branży resetuje oba dropdowny

### 3. Badge'e typu

| Wartość DB | Skrót | Kolor |
|------------|-------|-------|
| `komplet` | R+M | amber (bg-amber-500/10, text-amber-400, border-amber-500/20) |
| `robocizna` | R | blue (bg-blue-500/10, text-blue-400, border-blue-500/20) |
| `material` | M | green (bg-green-500/10, text-green-400, border-green-500/20) |

### 4. Kolumny tabeli

Bez zmian w strukturze. Kod pełny (BUD.01.01.001). Bez paginacji.

## Pliki do zmiany

- `app/(app)/pozycje/_components/pozycje-filters.tsx` - dropdowny, logika kaskadowa
- `app/(app)/pozycje/_components/pozycje-view.tsx` - obsługa pustego stanu
- `app/(app)/pozycje/_components/pozycje-columns.tsx` - nowe badge'e
- `app/(app)/pozycje/page.tsx` - przekazanie nowych filtrów
- `actions/pozycje.ts` - nowa akcja do pobierania kategorii dla dropdownów
