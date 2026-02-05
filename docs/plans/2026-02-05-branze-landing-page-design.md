# Branże Landing Page - Design

**Data:** 2026-02-05

## Problem

Obecnie kliknięcie "Kategorie" w sidebar prowadzi bezpośrednio do widoku z tabami branż i listą kategorii. Użytkownik chce pośredni ekran z kafelkami branż - dopiero po kliknięciu kafelka przejście do szczegółów.

## Rozwiązanie

### Nowy flow nawigacji

```
Sidebar "Kategorie" → /kategorie (kafelki branż) → klik "BUD" → /kategorie/BUD (taby + lista)
```

### Struktura routingu

**Przed:**
```
/kategorie          → KategorieView z tabami (BUD domyślnie)
```

**Po:**
```
/kategorie          → BranzeLandingPage (kafelki)
/kategorie/[branza] → KategorieView z tabami (branza z URL aktywna)
```

### Struktura plików

```
app/(app)/kategorie/
├── page.tsx                    ← ZMIANA: renderuje kafelki branż
├── [branza]/
│   └── page.tsx                ← NOWY: renderuje KategorieView
└── _components/
    ├── branze-grid.tsx         ← NOWY: siatka kafelków
    ├── branza-tile.tsx         ← NOWY: pojedynczy kafelek
    ├── kategorie-view.tsx      ← BEZ ZMIAN (przyjmuje activeBranza jako prop)
    ├── branza-tabs.tsx         ← MAŁA ZMIANA: Link zamiast onClick
    └── ... (reszta bez zmian)
```

## Design kafelka (BranzaTile)

```
┌─────────────────────────┐
│                         │
│         BUD             │  ← text-4xl, font-bold, text-stone-100
│                         │
│      Budowlana          │  ← text-lg, text-stone-400
│                         │
│     12 kategorii        │  ← text-sm, text-stone-500
│                         │
└─────────────────────────┘
```

### Stylowanie (glass theme)

```tsx
// Bazowy stan
className="
  bg-stone-900/50
  border border-stone-700/50
  rounded-xl
  p-8
  text-center
  cursor-pointer
  transition-all duration-200
"

// Hover
hover:bg-stone-800/60
hover:border-amber-500/50
hover:scale-[1.02]
```

### Siatka (BranzeGrid)

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
  {BRANZE.map(branza => <BranzaTile key={branza.kod} ... />)}
</div>
```

Responsive: 2 kolumny mobile, 5 kolumn desktop.

## Data flow

### Landing page (`/kategorie`)

```tsx
// page.tsx
const counts = await getKategorieCounts();
return <BranzeGrid counts={counts} />;
```

### Strona branży (`/kategorie/[branza]`)

```tsx
// page.tsx
const validBranze = ['BUD', 'ELE', 'SAN', 'TEL', 'HVC'];

if (!validBranze.includes(params.branza)) {
  notFound();
}

const tree = await getKategorieTree();
return <KategorieView initialData={tree} activeBranza={params.branza} />;
```

### BranzaTabs - zmiana nawigacji

```tsx
// Przed (state)
onClick={() => setActiveBranza(branza.kod)}

// Po (URL)
<Link href={`/kategorie/${branza.kod}`}>
```

## Nowa server action

```tsx
// actions/kategorie.ts
export async function getKategorieCounts(): Promise<Record<BranzaKod, number>> {
  // SELECT COUNT(*) ... GROUP BY substring(pelny_kod, 1, 3)
  // Zwraca np. { BUD: 12, ELE: 8, SAN: 5, TEL: 3, HVC: 4 }
}
```

## Lista zmian

### Nowe pliki

| Plik | Opis |
|------|------|
| `app/(app)/kategorie/[branza]/page.tsx` | Strona branży z walidacją |
| `app/(app)/kategorie/_components/branze-grid.tsx` | Siatka kafelków |
| `app/(app)/kategorie/_components/branza-tile.tsx` | Pojedynczy kafelek |

### Modyfikacje

| Plik | Zmiana |
|------|--------|
| `app/(app)/kategorie/page.tsx` | Zamiana na landing z kafelkami |
| `app/(app)/kategorie/_components/branza-tabs.tsx` | Link zamiast onClick, przyjmuje `activeBranza` jako prop |
| `app/(app)/kategorie/_components/kategorie-view.tsx` | Przyjmuje `activeBranza` jako prop |
| `stores/kategorie-ui-store.ts` | Usunięcie `activeBranza` (opcjonalne) |
| `actions/kategorie.ts` | Dodanie `getKategorieCounts()` |

## Acceptance Criteria

- [ ] `/kategorie` pokazuje 5 kafelków branż
- [ ] Każdy kafelek ma: kod (duży), nazwę, liczbę kategorii
- [ ] Kafelki mają glass styling z amber hover
- [ ] Klik kafelka → `/kategorie/[branza]`
- [ ] `/kategorie/[branza]` pokazuje taby + listę kategorii
- [ ] Taby nawigują przez URL (Link)
- [ ] Nieprawidłowa branża → 404
- [ ] Przycisk wstecz działa poprawnie
- [ ] Typecheck passes (`npm run build`)
