# Minimalist Dark UI Design

**Data:** 2026-02-05
**Zakres:** Pełna transformacja UI aplikacji PLANY

## Cel

Przerobienie całego UI na styl Minimalist Dark - atmospheric depth z warm amber accent. Główny problem: modale i formularze słabo widoczne.

## Design Tokens

### Paleta kolorów (layered slate)

```css
--background:     #0A0A0F   /* najgłębszy slate */
--background-alt: #12121A   /* elevated surfaces */
--card:           #1A1A24   /* karty, modale */
--foreground:     #FAFAFA   /* tekst główny */
--muted-fg:       #71717A   /* tekst secondary (zinc-500) */
```

### Amber accent

```css
--primary:        #F59E0B   /* amber-500 */
--ring:           #F59E0B   /* focus states */
```

### Borders (bardzo subtelne)

```css
--border:         rgba(255,255,255,0.08)   /* 8% opacity */
--border-hover:   rgba(255,255,255,0.15)   /* 15% na hover */
```

### Border radius (soft rounded)

```css
--radius:         0.5rem   /* 8px - domyślny */
--radius-lg:      0.75rem  /* 12px - karty, modale */
```

## Typografia

### Font stack

| Użycie | Font | Źródło |
|--------|------|--------|
| Headlines (h1, h2, tytuły modali) | Space Grotesk | next/font/google |
| Body text | Inter | next/font/google (obecny) |
| Kody, mono | JetBrains Mono | next/font/google |

### Letter-spacing

- Headlines: `tracking-tight` (-0.025em)
- Body: `tracking-normal`
- Mono labels: `tracking-wide` (0.025em)

## Komponenty

### Glass Effect (modale, karty)

**Dialog/Modal:**
```css
background: rgba(26, 26, 36, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 12px;
box-shadow: 0 25px 50px rgba(0,0,0,0.5);
```

**Overlay:**
```css
background: rgba(0, 0, 0, 0.8);
backdrop-filter: blur(4px);
```

**Cards:**
```css
background: rgba(26, 26, 36, 0.6);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.08);
transition: all 300ms ease-out;

/* Hover */
border-color: rgba(255,255,255,0.15);
transform: scale(1.02);
```

### Buttons

**Primary (amber):**
```css
background: #F59E0B;
color: #0A0A0F;
border: none;
border-radius: 8px;
font-weight: 500;

/* Hover - glow */
filter: brightness(1.1);
box-shadow: 0 0 20px rgba(245,158,11,0.4);

/* Active */
transform: scale(0.98);
```

**Outline:**
```css
background: transparent;
color: #FAFAFA;
border: 1px solid rgba(255,255,255,0.15);

/* Hover */
background: rgba(255,255,255,0.05);
border-color: rgba(255,255,255,0.25);
```

**Ghost:**
```css
background: transparent;
/* Hover */
background: rgba(255,255,255,0.05);
```

**Focus (wszystkie):**
```css
outline: none;
ring: 2px solid #F59E0B;
ring-offset: 2px;
```

### Form Inputs

**Input/Select trigger:**
```css
background: rgba(26, 26, 36, 0.6);
backdrop-filter: blur(8px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 8px;
height: 44px;
color: #FAFAFA;
placeholder-color: #71717A;

/* Focus */
border-color: rgba(245,158,11,0.5);
box-shadow: 0 0 0 3px rgba(245,158,11,0.15);

/* Disabled */
opacity: 0.5;
background: rgba(26, 26, 36, 0.4);
```

**Select content:**
- Glass effect + backdrop-blur
- Item hover: `background: rgba(255,255,255,0.08)`

**Labels:**
```css
color: #FAFAFA;
font-size: 14px;
font-weight: 500;
```

### Sidebar

**Container:**
```css
background: #12121A;
border-right: 1px solid rgba(255,255,255,0.08);
```

**Nav items:**
```css
color: #71717A;
border-radius: 6px;
padding: 8px 12px;

/* Hover */
background: rgba(255,255,255,0.05);
color: #FAFAFA;

/* Active */
background: rgba(245,158,11,0.1);
color: #F59E0B;
```

**Section headers:**
```css
font-size: 11px;
font-weight: 600;
letter-spacing: 0.05em;
color: #71717A;
text-transform: uppercase;
```

## Plan implementacji

Etapami z osobnymi commitami:

1. **globals.css** - design tokens
2. **lib/fonts.ts** - Space Grotesk + JetBrains Mono
3. **dialog.tsx** - glass effect
4. **button.tsx** - amber accent + glow
5. **input.tsx** - glass effect + focus
6. **select.tsx** - glass effect
7. **sidebar** - nav items styling
8. **Weryfikacja** - test modali, screenshot

## Kryteria sukcesu

- [ ] Modale wyraźnie widoczne (glass effect)
- [ ] Amber accent na primary buttons
- [ ] Space Grotesk na nagłówkach
- [ ] Focus states z amber ring
- [ ] Sidebar z aktywnym stanem amber
- [ ] `npm run build` przechodzi
