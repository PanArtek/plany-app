# Pozycje & Kategorie UX v2

**Data:** 2026-02-05
**Zakres:** Uproszczenie UX, lepsza typografia, nawigacja hierarchiczna

## Zmiany - Pozycje

### Tabela - nowe kolumny

| Kolumna | Szerokość | Styl |
|---------|-----------|------|
| Kod | `w-[140px]` | `font-mono text-amber-500` |
| Nazwa | `flex-1` | `font-normal text-foreground` |
| Jednostka | `w-[80px]` | `font-mono text-white/50` |
| Typ | `w-[100px]` | badge amber |
| Cena | `w-[120px]` | `font-mono font-medium` align-right |
| Akcje | `w-[80px]` | ikony edit/delete, **widoczne na hover wiersza** |

**Usunięte:** kolumny Kategoria i Podkategoria

### Typografia - nowoczesny minimalizm

Zasada: jeden rozmiar (`text-sm`), hierarchia przez wagę i kolor.

| Element | Przed | Po |
|---------|-------|-----|
| Nagłówki | `text-xs uppercase tracking-wider` | `text-sm font-medium text-muted-foreground` |
| Kod | `text-sm font-medium text-amber-500` | bez zmian |
| Nazwa | `text-sm font-medium` | `text-sm font-normal text-foreground` |
| Jednostka | `text-sm text-muted-foreground` | `text-sm font-mono text-white/50` |
| Cena | `text-sm` | `text-sm font-mono font-medium` |

### Kolumna akcji

- Dwa icon-buttons: `Pencil` + `Trash2`
- Rozmiar: `h-7 w-7`, variant `ghost`
- Widoczność: **tylko na hover wiersza** (`opacity-0 group-hover:opacity-100`)

## Zmiany - Kategorie

### Taby branż - pełne nazwy

**Przed:** `BUD | ELE | SAN | TEL | HVC`

**Po:** `Budowlana | Elektryczna | Sanitarna | Teletechnika | HVAC`

Styl pozostaje: glass container, amber glow na aktywnym.

### Nawigacja hierarchiczna

```
[Taby: Budowlana | Elektryczna | Sanitarna | Teletechnika | HVAC]

[Dropdown: Wszystkie kategorie ▼]
           - Ściany działowe
           - Sufity podwieszane
           - Podłogi
           - ...

[Grid podkategorii - 3 kolumny]
```

**Flow:**
1. Wybór branży (tab)
2. Wybór kategorii (dropdown) - domyślnie "Wszystkie"
3. Grid pokazuje:
   - "Wszystkie" → karty kategorii
   - Konkretna kategoria → karty podkategorii

### Grid layout

```css
grid grid-cols-3 gap-4
```

Karty mniejsze - `p-3` zamiast `p-4`.

### Brak wersji mobile

Aplikacja desktop-only - bez responsywności dla mobile.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `pozycje-columns.tsx` | Usunąć kategoria/podkategoria, dodać akcje, nowa typografia |
| `pozycje-table.tsx` | Dodać `group` class, hover state dla akcji |
| `branza-tabs.tsx` | Pełne nazwy branż |
| `kategorie-view.tsx` | Dodać dropdown kategorii, zmienić layout |
| `kategorie-list.tsx` | Grid 3 kolumny |
| `kategoria-card.tsx` | Mniejszy padding, dostosowanie do grida |

## Acceptance Criteria

- [ ] Tabela pozycji ma 6 kolumn (bez kategoria/podkategoria, z akcjami)
- [ ] Ikony akcji widoczne tylko na hover wiersza
- [ ] Typografia: jeden rozmiar, hierarchia przez wagę/kolor
- [ ] Taby branż pokazują pełne nazwy
- [ ] Dropdown do wyboru kategorii
- [ ] Grid 3 kolumny dla kart
- [ ] `npm run build` przechodzi
