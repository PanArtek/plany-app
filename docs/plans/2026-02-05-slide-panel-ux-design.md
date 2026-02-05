# Slide Panel UX Design

**Data:** 2026-02-05
**Status:** Zatwierdzony
**Zakres:** Kategorie, Pozycje, Składowe - wszystkie moduły

## Cel

Zamiana wszystkich modali na wysuwane panele z prawej strony (Sheet/SlidePanel) dla spójnego, nowoczesnego UX zgodnego z Minimalist Dark design system.

## Decyzje projektowe

| Aspekt | Decyzja |
|--------|---------|
| Zakres | Wszystkie interakcje: formularze, szczegóły, delete confirm |
| Szerokość | Szerokie panele (600px default), mogą zasłaniać treść |
| Overlay | Brak - panel wysuwa się, treść widoczna w tle |
| Warianty | `default` 600px, `narrow` 400px, `wide` 800px |

## Architektura

### Nowy komponent bazowy

```
components/ui/slide-panel.tsx
```

Wrapper na shadcn Sheet z predefiniowanymi stylami Minimalist Dark.

### Migracja komponentów

| Obecny | Nowy |
|--------|------|
| `KategoriaFormModal` | `KategoriaFormPanel` |
| `DeleteConfirmModal` | `DeleteConfirmPanel` |
| `PozycjaFormModal` | `PozycjaFormPanel` |
| `DeletePozycjaModal` | `DeleteConfirmPanel` (reuse) |
| `SkladowaMaterialModal` | `SkladowaPanel` |
| `SkladowaRobociznaModal` | `SkladowaPanel` |
| `PozycjaDetailPanel` | Restyle only |

## Styl wizualny

### Panel container
```css
background: #0A0A0F;
border-left: 1px solid rgba(255,255,255,0.08);
box-shadow: -20px 0 60px rgba(0,0,0,0.5);
```

### Header
- Tytuł: Space Grotesk, `text-xl font-semibold`
- Przycisk X: `text-zinc-400 hover:text-white`
- Separator: `border-b border-white/5`
- Padding: `p-6`

### Content
- Scroll wewnętrzny
- Padding: `p-6`
- Glass-effect inputs

### Footer
- Sticky na dole
- Separator: `border-t border-white/5`
- Padding: `p-6`
- Primary button (amber) po prawej, Ghost po lewej

### Animacja
- Slide from right: `translate-x-full → translate-x-0`
- Duration: `300ms ease-out`
- Bez overlay animation

## Struktura paneli

### KategoriaFormPanel
- Header dynamiczny wg poziomu (branża/kategoria/podkategoria)
- Pola w jednej kolumnie
- Podgląd pełnego kodu z amber highlight
- Breadcrumb rodzica jako badge

### PozycjaFormPanel
- Kaskadowe selecty w jednym rzędzie
- Kod auto-generowany z amber glow
- Jednostka + Typ obok siebie
- Textarea dla opisu

### DeleteConfirmPanel (narrow: 400px)
- Ikona ostrzeżenia
- Komunikat + konsekwencje
- Ghost "Anuluj" + Destructive "Usuń"

### SkladowaPanel
- Badge z typem składowej
- Formularz specyficzny dla typu
- Live kalkulacja ceny

### PozycjaDetailPanel
- Kod pozycji w header (mono, amber)
- Sekcje: Info, Składowe, Historia
- Akcje inline

## Plan implementacji

### Faza 1 - Fundament
1. Zainstalować shadcn Sheet
2. Stworzyć SlidePanel wrapper
3. Style Minimalist Dark

### Faza 2 - Kategorie
4. KategoriaFormPanel
5. DeleteConfirmPanel
6. Update kategorie-view.tsx

### Faza 3 - Pozycje
7. PozycjaFormPanel
8. Reuse DeleteConfirmPanel
9. SkladowaPanel
10. Restyle PozycjaDetailPanel

### Faza 4 - Polish
11. Testy manualne
12. Animacje
13. Mobile responsywność

## Pliki do utworzenia

```
components/ui/slide-panel.tsx
app/(app)/kategorie/_components/panels/kategoria-form-panel.tsx
app/(app)/kategorie/_components/panels/delete-confirm-panel.tsx
app/(app)/pozycje/_components/panels/pozycja-form-panel.tsx
app/(app)/pozycje/_components/panels/skladowa-panel.tsx
```
