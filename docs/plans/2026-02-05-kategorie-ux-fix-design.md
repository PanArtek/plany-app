# Kategorie UX Fix - Design Document

**Data:** 2026-02-05
**Status:** Ready for implementation
**Branch:** `ralph/phase3a-kategorie`

---

## Problem

Modal dodawania/edycji kategorii nie ma:
1. Auto-sugestii następnego wolnego kodu
2. Podglądu pełnego kodu na żywo (np. `BUD.03.04`)
3. Informacji o kategorii nadrzędnej

Użytkownik musi ręcznie zgadywać jaki jest następny wolny kod.

---

## Rozwiązanie

### 1. Nowe Server Actions

**`getNextKod(parentId)`** - zwraca następny wolny kod:

```typescript
// actions/kategorie.ts
export async function getNextKod(parentId: string | null): Promise<string> {
  const supabase = await createClient();

  const { data: siblings } = await supabase
    .from('kategorie')
    .select('kod')
    .eq('parent_id', parentId)
    .order('kod');

  if (!siblings || siblings.length === 0) {
    return '01';
  }

  const existingKods = new Set(siblings.map(s => s.kod));

  for (let i = 1; i <= 99; i++) {
    const candidate = i.toString().padStart(2, '0');
    if (!existingKods.has(candidate)) {
      return candidate;
    }
  }

  return '99';
}
```

### 2. Hook `useKategoriaModal`

Zarządza stanem modala i fetchuje dane przy otwieraniu:

```typescript
// hooks/use-kategoria-modal.ts
interface ModalState {
  open: boolean;
  mode: 'add' | 'edit';
  poziom: 1 | 2 | 3;
  parentId: string | null;
  parentPath: string | null;
  parentNazwa: string | null;
  suggestedKod: string | null;
  kategoria?: KategoriaNode;
}

export function useKategoriaModal() {
  // openAdd(parentId, parentKod, parentNazwa, poziom) - fetchuje suggestedKod
  // openEdit(kategoria, parentKod, parentNazwa, poziom) - bez fetch
  // close()
}
```

### 3. Zrefaktorowany Modal

Nowe props:
- `parentPath` - np. `"BUD"` lub `"BUD.03"`
- `parentNazwa` - np. `"Budowlana"`
- `suggestedKod` - np. `"07"`

Nowe elementy UI:
1. Pole "Branża/Kategoria nadrzędna" (disabled)
2. Pole "Kod" z auto-wypełnieniem i sugestią
3. Pole "Pełny kod (podgląd)" - live update

### 4. Mockup UI

```
┌─────────────────────────────────────────────────────────┐
│  Dodaj kategorię                                        │
├─────────────────────────────────────────────────────────┤
│  Branża nadrzędna                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ BUD - Budowlana                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Kod kategorii                                          │
│  ┌──────┐                                               │
│  │ 07   │  ← AUTO-WYPEŁNIONE                           │
│  └──────┘                                               │
│  Sugestia: 07 (następny wolny)                         │
│                                                         │
│  Pełny kod (podgląd)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ BUD.07                                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Nazwa kategorii                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                          [Anuluj]  [Dodaj kategorię]   │
└─────────────────────────────────────────────────────────┘
```

---

## User Stories

| ID | Title | Acceptance Criteria |
|----|-------|---------------------|
| KAT-UX-001 | Server Action getNextKod | Zwraca następny wolny kod dla parentId. Typecheck passes. |
| KAT-UX-002 | Hook useKategoriaModal | openAdd fetchuje suggestedKod, openEdit nie. Typecheck passes. |
| KAT-UX-003 | Modal z auto-sugestią | Kod auto-wypełniony, podgląd pełnego kodu live, parent info. Verify at localhost:3000/kategorie. Typecheck passes. |
| KAT-UX-004 | Integracja w KategorieView | Jeden modal dla wszystkich operacji, dane przekazywane przez hook. Typecheck passes. |

---

## Pliki do zmiany

1. `actions/kategorie.ts` - dodać `getNextKod()`
2. `hooks/use-kategoria-modal.ts` - nowy plik
3. `app/(app)/kategorie/_components/modals/kategoria-form-modal.tsx` - refaktor
4. `app/(app)/kategorie/_components/kategorie-view.tsx` - użyć hooka
5. `app/(app)/kategorie/_components/kategoria-card.tsx` - przekazać callbacks
