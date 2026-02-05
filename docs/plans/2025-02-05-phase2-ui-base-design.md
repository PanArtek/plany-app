# FAZA 2: UI Base + Layout — Design Document

**Data:** 2025-02-05
**Status:** Approved
**Branch:** `ralph/phase2-ui-base`

---

## Podsumowanie decyzji

| Aspekt | Decyzja |
|--------|---------|
| Theming | shadcn/ui z custom theme (CSS variables) |
| Fonty | JetBrains Mono + Plus Jakarta Sans |
| Responsywność | Desktop-only fixed sidebar (240px) |
| Nawigacja | 2 sekcje: "BAZA DANYCH" + "PROJEKTY" |
| Komponenty shadcn | Minimalne: button, badge, skeleton |
| Placeholder pages | Tytuł + "Coming soon" badge |

---

## 1. Struktura plików

```
app/
├── layout.tsx              # Root layout z fontami + dark class
├── globals.css             # shadcn CSS variables + custom colors
├── (app)/                  # Route group dla authenticated pages
│   ├── layout.tsx          # App shell: sidebar + main area
│   ├── kategorie/page.tsx
│   ├── pozycje/page.tsx
│   ├── materialy/page.tsx
│   ├── dostawcy/page.tsx
│   ├── podwykonawcy/page.tsx
│   ├── kalkulatory/page.tsx
│   ├── projekty/page.tsx
│   └── kosztorys/page.tsx
components/
├── ui/                     # shadcn (button, badge, skeleton)
├── layout/
│   ├── sidebar.tsx         # Fixed sidebar 240px
│   ├── nav-item.tsx        # Single nav link z active state
│   └── page-header.tsx     # Tytuł strony + badge
lib/
└── fonts.ts                # JetBrains Mono + Plus Jakarta Sans
```

---

## 2. Theme / Kolory

Mapowanie wireframe → shadcn CSS variables w `globals.css`:

```css
@layer base {
  :root {
    /* Light mode - nie używane, ale wymagane przez shadcn */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
  }

  .dark {
    /* Base colors */
    --background: 0 0% 7%;           /* #111113 - bg-main */
    --foreground: 0 0% 98%;          /* #fafafa - text-primary */

    --card: 0 0% 9%;                 /* #18181b - bg-card */
    --card-foreground: 0 0% 98%;

    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;

    --muted: 240 4% 16%;             /* #27272a - bg-active */
    --muted-foreground: 240 5% 65%; /* #a1a1aa - text-secondary */

    /* Primary = Amber accent */
    --primary: 38 92% 50%;           /* #f59e0b */
    --primary-foreground: 0 0% 98%;

    --secondary: 240 4% 16%;
    --secondary-foreground: 0 0% 98%;

    --accent: 240 4% 16%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 84% 60%;        /* #ef4444 - error */
    --destructive-foreground: 0 0% 98%;

    --border: 240 4% 16%;            /* #2a2a2e */
    --input: 240 4% 16%;
    --ring: 38 92% 50%;              /* amber for focus */

    --radius: 0.375rem;              /* 6px - industrial feel */

    /* Custom: position types */
    --color-robocizna: 217 91% 60%;  /* #3b82f6 - blue */
    --color-material: 142 71% 45%;   /* #22c55e - green */
    --color-komplet: 270 91% 65%;    /* #a855f7 - purple */

    /* Custom: project status */
    --color-draft: 240 5% 65%;       /* gray */
    --color-ofertowanie: 217 91% 60%; /* blue */
    --color-realizacja: 142 71% 45%; /* green */
    --color-zamkniety: 220 9% 46%;   /* dark gray */
    --color-odrzucony: 0 84% 60%;    /* red */
  }
}
```

**Uwagi:**
- Wymuszamy `dark` class na `<html>` — brak toggle light/dark
- Position types (robocizna/material/komplet) mają kolory dla badge'ów
- Project status ma kolory dla badge'ów i border-left accent
- Branże (BUD/ELE/SAN/TEL/HVC) używają ogólnego primary (amber) gdy aktywne

---

## 3. Fonty

```ts
// lib/fonts.ts
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

export const fontMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
});

export const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
});
```

**Użycie:**
- `font-mono` — kody (BUD.03.01), liczby, etykiety techniczne
- `font-sans` — UI, tekst główny

---

## 4. Sidebar Component

```tsx
// components/layout/sidebar.tsx
const navSections = [
  {
    label: "BAZA DANYCH",
    items: [
      { href: "/kategorie", icon: FolderTree, label: "Kategorie" },
      { href: "/pozycje", icon: List, label: "Pozycje" },
      { href: "/materialy", icon: Package, label: "Materiały" },
      { href: "/dostawcy", icon: Truck, label: "Dostawcy" },
      { href: "/podwykonawcy", icon: Users, label: "Podwykonawcy" },
    ],
  },
  {
    label: "PROJEKTY",
    items: [
      { href: "/projekty", icon: Briefcase, label: "Projekty" },
      { href: "/kosztorys", icon: Calculator, label: "Kosztorys" },
      { href: "/kalkulatory", icon: Sliders, label: "Kalkulatory" },
    ],
  },
];
```

**Specyfikacja:**
- Fixed 240px width, full viewport height
- Logo section: 72px height, border-bottom
- Nav sections z małymi labelami (10px, mono, muted)
- Nav items: 13px, ikona 16px, padding 10px 12px
- Active state: primary color text, bg-muted
- Hover state: bg-hover (--bg-hover z wireframe = ~#1f1f23)

**Ikony:** lucide-react

---

## 5. App Shell Layout

```tsx
// app/(app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[240px]">
        {children}
      </main>
    </div>
  );
}
```

---

## 6. Placeholder Pages

```tsx
// components/layout/page-header.tsx
export function PageHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold font-mono tracking-tight">
        {title}
      </h1>
      {badge && (
        <Badge variant="secondary">{badge}</Badge>
      )}
    </div>
  );
}
```

**8 placeholder pages:**

| Route | Title |
|-------|-------|
| `/kategorie` | Kategorie |
| `/pozycje` | Pozycje |
| `/materialy` | Materiały |
| `/dostawcy` | Dostawcy |
| `/podwykonawcy` | Podwykonawcy |
| `/projekty` | Projekty |
| `/kosztorys` | Kosztorys |
| `/kalkulatory` | Kalkulatory |

Każda strona: PageHeader z tytułem + badge "Coming soon".

---

## 7. User Stories (do prd.json)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| UI-001 | Install shadcn/ui with dark theme | `npx shadcn@latest init` z dark mode, button + badge + skeleton installed, Typecheck passes |
| UI-002 | Configure custom colors in globals.css | Wszystkie CSS variables z sekcji 2, wymuszony dark class, Typecheck passes |
| UI-003 | Add fonts (JetBrains Mono + Plus Jakarta Sans) | Fonty w `lib/fonts.ts`, użyte w layout.tsx, Typecheck passes |
| UI-004 | Create root layout with metadata | Tytuł "PLANY", lang="pl", dark class na html, Typecheck passes |
| UI-005 | Create app shell layout with sidebar area | Route group `(app)`, layout z sidebar placeholder + main area, Typecheck passes |
| UI-006 | Create Sidebar component | Fixed 240px, logo, 2 sekcje nav z items, Verify at localhost:3000, Typecheck passes |
| UI-007 | Create NavItem component with active state | Link z ikoną, hover/active states, usePathname for active, Typecheck passes |
| UI-008 | Create PageHeader component | Tytuł + opcjonalny badge, Typecheck passes |
| UI-009 | Create 8 placeholder pages | Wszystkie routes z PageHeader + "Coming soon", Verify navigation works at localhost:3000, Typecheck passes |

**Zależności:**
- UI-002 → UI-001
- UI-003 → UI-001
- UI-004 → UI-002, UI-003
- UI-005 → UI-004
- UI-006 → UI-005
- UI-007 → UI-006
- UI-008 → UI-001
- UI-009 → UI-005, UI-007, UI-008

---

## 8. Referencje

- Wireframe styles: `/home/artur/Projekty/wireframe/styles.css`
- Database architecture: `/home/artur/Projekty/plany-app/docs/DATABASE-ARCHITECTURE.md`
- Migration plan: `/home/artur/Projekty/plany-app/docs/MIGRATION-PLAN.md`
