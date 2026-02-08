# Kategorie UX Redesign - Tree-Table like Pozycje

## Goal

Replace the card-grid layout in Kategorie with a flat tree-table layout identical to Pozycje module style. Remove the landing page with branza tiles. Single page with branza tabs, search, and tree-table.

## Current State

- Landing page (`/kategorie`) shows 5 branza tiles in a grid
- Clicking a tile navigates to `/kategorie/[branza]`
- Branza page shows tabs + card grid (3 columns)
- Cards are expandable to show podkategorie inline
- Zustand store tracks expandedIds

## Target State

Single page `/kategorie` with URL params (`?branza=BUD&search=...`):

```
Breadcrumb: "Kategorie / Budowlana"          [+ Dodaj kategorię]
[Budowlana] [Elektryczna] [Sanitarna] [Teletechnika] [HVAC]
[Search input full-width]
Tree-table:
  Kod         Nazwa                         Pod  Akcje
  BUD.01      Roboty rozbiórkowe             3   + edit delete
    BUD.01.01   ↳ Rozbiórka ścian                  edit delete
    BUD.01.02   ↳ Rozbiórka podłóg                 edit delete
  BUD.02      Ściany działowe                2   + edit delete
    BUD.02.01   ↳ Ściany GK                        edit delete
```

## Visual Design

- Kategoria rows (level 2): `bg-[#1A1A24]/60`, kod `font-mono text-amber-500`, nazwa `text-white`
- Podkategoria rows (level 3): `bg-white/[0.02]`, kod `font-mono text-amber-500/70 pl-6`, prefix `↳` in `text-white/30`, nazwa `text-white/70`
- Badge count: `bg-white/10 text-white/50 text-xs rounded-full px-2`
- Hover: `hover:bg-white/5`
- Branza tabs: full-width flex-1, amber glow, URL-based, toggleable

## Files to Create

- `kategorie-table.tsx` - tree-table component

## Files to Rewrite

- `page.tsx` - single page, searchParams-based
- `kategorie-view.tsx` - new layout (breadcrumb, tabs, search, table, CRUD)

## Files to Delete

- `[branza]/page.tsx` - dynamic route
- `branze-grid.tsx` - landing grid
- `branza-tile.tsx` - landing tiles
- `kategoria-card.tsx` - card component
- `kategorie-list.tsx` - grid wrapper
- `branza-tabs.tsx` - old Link-based tabs

## Files to Keep (reuse)

- `panels/kategoria-form-panel.tsx`
- `panels/delete-confirm-panel.tsx`
- `hooks/use-kategoria-modal.ts`
- `actions/kategorie.ts`

## Store Changes

- Remove `expandedIds`, `toggleExpanded`, `collapseAll` from `kategorie-ui-store.ts`
- Keep `BranzaKod` type export (used by other files)
