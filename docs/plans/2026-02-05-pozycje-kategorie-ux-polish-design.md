# Pozycje & Kategorie UX Polish

**Data:** 2026-02-05
**Zakres:** Poprawa UX/UI modułów Pozycje i Kategorie - spójność z Minimalist Dark

## Problemy do rozwiązania

1. **Tabela** - brak hover states, tekst się ucina, kolumny za ciasne
2. **Panel szczegółów** - kolory niespójne (emerald, blue, purple) - powinien być amber accent
3. **Taby BUD/ELE/SAN/TEL/HVC** - flat, brak aktywnego stanu z glow
4. **Brak glass-effect** na cardach i tabeli
5. **Panel szczegółów** - powinien być SlidePanel, nie stały 60% panel
6. **Mobile** - layout 40/60 nie działa

## Design System - Unified Amber

### Color Mapping

| Element | Current | New |
|---------|---------|-----|
| Robocizna sum | `text-emerald-400` | `text-amber-400` |
| Materiały sum | `text-blue-400` | `text-amber-400/70` |
| Typ badge (all) | green/blue/purple | `bg-amber-500/10 text-amber-400` |
| Selected row | `bg-muted` | `bg-amber-500/10 border-l-2 border-amber-500` |

## Layout Change

### Before
```
[Filters bar                    ]
[Table 40%  ][Detail Panel 60% ]
```

### After
```
[BranzaTabs with glass          ]
[Search input      ][+ Dodaj   ]
[Full-width Table with glass    ]
         ↓ click row
    [SlidePanel slides from right]
```

## Component Specifications

### 1. Table (pozycje-table.tsx)

**Glass Container:**
```css
background: rgba(26, 26, 36, 0.6);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
```

**Header Row:**
```css
background: rgba(255,255,255,0.03);
border-bottom: 1px solid rgba(255,255,255,0.05);
position: sticky;
top: 0;
```

**Data Rows:**
```css
/* Hover */
background: rgba(255,255,255,0.05);

/* Selected */
background: rgba(245,158,11,0.1);
border-left: 2px solid #F59E0B;
box-shadow: inset 0 0 20px rgba(245,158,11,0.05);
```

**Column Widths:**
| Kolumna | Szerokość |
|---------|-----------|
| Kod | `w-[140px]` |
| Nazwa | `flex-1 min-w-[250px]` |
| Jednostka | `w-[80px]` |
| Typ | `w-[100px]` |
| Cena | `w-[120px]` |

### 2. BranzaTabs (glass + glow)

**Container:**
```css
background: rgba(26, 26, 36, 0.4);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 8px;
padding: 4px;
display: inline-flex;
gap: 4px;
```

**Tab States:**
```css
/* Inactive */
color: rgba(255,255,255,0.5);
font-family: 'JetBrains Mono';

/* Hover */
background: rgba(255,255,255,0.05);
color: rgba(255,255,255,0.8);

/* Active */
background: rgba(245,158,11,0.15);
color: #F59E0B;
box-shadow: 0 0 12px rgba(245,158,11,0.2);
```

### 3. PozycjaDetailPanel → SlidePanel

Convert from fixed 60% panel to `SlidePanel variant="wide"` (800px).

**Header:**
- Kod in mono amber
- Nazwa as title
- Breadcrumb muted

**Składowe sections:**
- Both use amber color variants
- Robocizna: `text-amber-400`
- Materiały: `text-amber-400/70` (lighter)

**Footer:**
- Cena jednostkowa: mono amber-500
- Edytuj: amber primary button
- Usuń: ghost destructive

### 4. SkladoweSection - Amber Only

Replace emerald/blue with amber variants:
```tsx
// Robocizna
colorClass="text-amber-400"

// Materiały
colorClass="text-amber-400/70"
```

### 5. KategoriaCard - Glass Effect

```css
background: rgba(26, 26, 36, 0.6);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.08);

/* Hover */
border-color: rgba(255,255,255,0.15);
```

### 6. Mobile Responsiveness

**Breakpoint:** `md` (768px)

**Mobile Table (`< md`):**
- Hide: Jednostka, Typ columns
- Show: Kod, Nazwa (truncate), Cena
- Stacked layout: Kod above Nazwa in single cell

**Mobile SlidePanel:**
```css
@media (max-width: 768px) {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
}
```

## Files to Modify

| File | Change |
|------|--------|
| `pozycje-view.tsx` | Remove 40/60 split, full-width table, SlidePanel for details |
| `pozycje-table.tsx` | Glass effect, amber selected state, responsive |
| `pozycje-columns.tsx` | Unified amber badges, column widths |
| `pozycja-detail-panel.tsx` | Convert to SlidePanel content component |
| `skladowe-section.tsx` | Amber-only colors |
| `branza-tabs.tsx` | Glass container, amber active glow |
| `pozycje-filters.tsx` | Match branza-tabs glass style |
| `kategoria-card.tsx` | Glass effect, amber accents |
| `slide-panel.tsx` | Add mobile fullscreen support |

## Acceptance Criteria

- [ ] Tabela ma glass effect i amber selected state
- [ ] Hover states widoczne na wszystkich elementach
- [ ] BranzaTabs z glass container i amber glow na aktywnym
- [ ] Panel szczegółów jako SlidePanel (800px)
- [ ] Wszystkie kolory to amber variants (brak green/blue/purple)
- [ ] Mobile: tabela responsywna, SlidePanel fullscreen
- [ ] `npm run build` przechodzi
