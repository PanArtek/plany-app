# FAZA 3a: Kategorie — Design Document

**Data:** 2026-02-05
**Status:** Draft
**Branch:** `ralph/phase3a-kategorie`

---

## Podsumowanie

Moduł Kategorie umożliwia zarządzanie hierarchią: **BRANŻA → KATEGORIA → PODKATEGORIA**.

| Aspekt | Decyzja |
|--------|---------|
| Architektura | Hybrid: Server Component (fetch) + Client Components (interakcja) |
| State management | Zustand tylko dla UI (activeBranza, expandedIds) |
| Walidacja | Zod schemas w `lib/validations/kategorie.ts` |
| Mutacje | Server Actions + `revalidatePath` |
| Modals | shadcn Dialog + react-hook-form + Zod resolver |
| Ochrona DELETE | Server-side check (children, pozycje) + UI disable |

---

## 1. Struktura plików

```
app/(app)/kategorie/
├── page.tsx                      # Server Component - fetch kategorii
└── _components/
    ├── kategorie-view.tsx        # Client - główny wrapper
    ├── branza-tabs.tsx           # Client - tabs dla 5 branż
    ├── kategorie-list.tsx        # Client - lista kart
    ├── kategoria-card.tsx        # Client - karta z expand
    ├── podkategoria-item.tsx     # Client - wiersz podkategorii
    └── modals/
        ├── kategoria-form-modal.tsx   # Add/Edit (wszystkie poziomy)
        └── delete-confirm-modal.tsx   # Potwierdzenie usunięcia

lib/validations/
└── kategorie.ts                  # Zod schemas

actions/
└── kategorie.ts                  # Server Actions CRUD

stores/
└── kategorie-ui-store.ts         # Zustand UI state
```

---

## 2. Zod Schemas

```ts
// lib/validations/kategorie.ts
import { z } from 'zod';

// Bazowe schematy
const branzaKodSchema = z.string().regex(/^[A-Z]{2,3}$/, "2-3 wielkie litery");
const kategoriaKodSchema = z.string().regex(/^\d{2}$/, "2 cyfry (01-99)");

// Schema dla tworzenia (dynamiczna walidacja kodu po parentId)
export const createKategoriaSchema = z.object({
  parentId: z.string().uuid().nullable(),
  kod: z.string(),
  nazwa: z.string().min(3, "Min 3 znaki").max(255, "Max 255 znaków"),
}).refine(
  data => data.parentId === null
    ? /^[A-Z]{2,3}$/.test(data.kod)
    : /^\d{2}$/.test(data.kod),
  { message: "Nieprawidłowy format kodu", path: ["kod"] }
);

// Schema dla edycji
export const updateKategoriaSchema = z.object({
  kod: z.string().optional(),
  nazwa: z.string().min(3).max(255).optional(),
}).refine(
  data => data.kod !== undefined || data.nazwa !== undefined,
  { message: "Podaj kod lub nazwę do zmiany" }
);

// Typy
export type CreateKategoriaInput = z.infer<typeof createKategoriaSchema>;
export type UpdateKategoriaInput = z.infer<typeof updateKategoriaSchema>;
```

---

## 3. Server Actions

```ts
// actions/kategorie.ts
'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createKategoriaSchema, updateKategoriaSchema } from '@/lib/validations/kategorie';

type ActionResult = { success: boolean; error?: string; data?: any };

// CREATE
export async function createKategoria(input: unknown): Promise<ActionResult> {
  const parsed = createKategoriaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('kategorie')
    .insert({
      parent_id: parsed.data.parentId,
      kod: parsed.data.kod,
      nazwa: parsed.data.nazwa,
      poziom: parsed.data.parentId === null ? 1 : /* calculate from parent */ 2,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kod już istnieje w tej kategorii' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
  return { success: true, data };
}

// UPDATE
export async function updateKategoria(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updateKategoriaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('kategorie')
    .update(parsed.data)
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kod już istnieje w tej kategorii' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
  return { success: true };
}

// DELETE (z ochroną)
export async function deleteKategoria(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Sprawdź children
  const { count: childrenCount } = await supabase
    .from('kategorie')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', id);

  if (childrenCount && childrenCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${childrenCount} podkategorii` };
  }

  // 2. Sprawdź pozycje
  const { count: pozycjeCount } = await supabase
    .from('pozycje_biblioteka')
    .select('*', { count: 'exact', head: true })
    .eq('kategoria_id', id);

  if (pozycjeCount && pozycjeCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${pozycjeCount} przypisanych pozycji` };
  }

  // 3. Usuń
  const { error } = await supabase
    .from('kategorie')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
  return { success: true };
}

// READ - drzewo kategorii
export async function getKategorieTree() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kategorie')
    .select('*')
    .order('kod');

  if (error) throw error;

  // Buduj drzewo z flat list
  return buildTree(data);
}

function buildTree(flatList: any[]) {
  const map = new Map();
  const roots: any[] = [];

  // First pass: create map
  flatList.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  flatList.forEach(item => {
    const node = map.get(item.id);
    if (item.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return roots;
}
```

---

## 4. Zustand Store

```ts
// stores/kategorie-ui-store.ts
import { create } from 'zustand';

type BranzaKod = 'BUD' | 'ELE' | 'SAN' | 'TEL' | 'HVC';

interface KategorieUIState {
  activeBranza: BranzaKod;
  expandedIds: Set<string>;

  setActiveBranza: (branza: BranzaKod) => void;
  toggleExpanded: (id: string) => void;
  collapseAll: () => void;
}

export const useKategorieUIStore = create<KategorieUIState>((set) => ({
  activeBranza: 'BUD',
  expandedIds: new Set(),

  setActiveBranza: (branza) => set({
    activeBranza: branza,
    expandedIds: new Set() // collapse all on tab change
  }),

  toggleExpanded: (id) => set((state) => {
    const newSet = new Set(state.expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { expandedIds: newSet };
  }),

  collapseAll: () => set({ expandedIds: new Set() }),
}));
```

---

## 5. Komponenty UI

### 5.1 Page (Server Component)

```tsx
// app/(app)/kategorie/page.tsx
import { getKategorieTree } from '@/actions/kategorie';
import { KategorieView } from './_components/kategorie-view';

export default async function KategoriePage() {
  const kategorieTree = await getKategorieTree();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold font-mono mb-6">Kategorie</h1>
      <KategorieView initialData={kategorieTree} />
    </div>
  );
}
```

### 5.2 KategorieView (Client wrapper)

```tsx
// app/(app)/kategorie/_components/kategorie-view.tsx
'use client'

import { BranzaTabs } from './branza-tabs';
import { KategorieList } from './kategorie-list';
import { useKategorieUIStore } from '@/stores/kategorie-ui-store';

interface Props {
  initialData: KategoriaNode[];
}

export function KategorieView({ initialData }: Props) {
  const { activeBranza } = useKategorieUIStore();

  const currentBranza = initialData.find(b => b.kod === activeBranza);

  return (
    <div>
      <BranzaTabs branzeList={initialData} />

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            Branża {currentBranza?.nazwa}
          </h2>
          <AddKategoriaButton branzaId={currentBranza?.id} />
        </div>

        <KategorieList
          kategorie={currentBranza?.children || []}
          branzaId={currentBranza?.id}
        />
      </div>
    </div>
  );
}
```

### 5.3 KategoriaFormModal (uniwersalny)

```tsx
// app/(app)/kategorie/_components/modals/kategoria-form-modal.tsx
'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createKategoriaSchema, type CreateKategoriaInput } from '@/lib/validations/kategorie';
import { createKategoria, updateKategoria } from '@/actions/kategorie';
import { toast } from 'sonner';

interface Props {
  mode: 'add' | 'edit';
  poziom: 1 | 2 | 3;  // 1=branża, 2=kategoria, 3=podkategoria
  parentId: string | null;
  kategoria?: { id: string; kod: string; nazwa: string };
  suggestedKod?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const labels = {
  1: { title: 'branżę', kod: 'Kod branży', kodHint: '2-3 wielkie litery (np. BUD)' },
  2: { title: 'kategorię', kod: 'Kod kategorii', kodHint: '2 cyfry (np. 03)' },
  3: { title: 'podkategorię', kod: 'Kod podkategorii', kodHint: '2 cyfry (np. 01)' },
};

export function KategoriaFormModal({
  mode, poziom, parentId, kategoria, suggestedKod, open, onOpenChange
}: Props) {
  const label = labels[poziom];

  const form = useForm<CreateKategoriaInput>({
    resolver: zodResolver(createKategoriaSchema),
    defaultValues: {
      parentId,
      kod: mode === 'edit' ? kategoria?.kod : suggestedKod || '',
      nazwa: mode === 'edit' ? kategoria?.nazwa : '',
    },
  });

  async function onSubmit(data: CreateKategoriaInput) {
    const result = mode === 'add'
      ? await createKategoria(data)
      : await updateKategoria(kategoria!.id, { kod: data.kod, nazwa: data.nazwa });

    if (result.success) {
      toast.success(mode === 'add' ? `Dodano ${label.title}` : 'Zapisano zmiany');
      onOpenChange(false);
      form.reset();
    } else {
      form.setError('kod', { message: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? `Dodaj ${label.title}` : `Edytuj ${label.title}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label.kod}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={label.kodHint} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="np. Prace wykończeniowe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {mode === 'add' ? 'Dodaj' : 'Zapisz'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Seed Data

Dane z wireframe do załadowania przez Server Action lub migration:

```ts
// Branże (poziom 1)
const branzeData = [
  { kod: 'BUD', nazwa: 'Budowlana' },
  { kod: 'ELE', nazwa: 'Elektryczna' },
  { kod: 'SAN', nazwa: 'Sanitarna' },
  { kod: 'TEL', nazwa: 'Teletechnika' },
  { kod: 'HVC', nazwa: 'HVAC' },
];

// Kategorie BUD (poziom 2)
const kategorieBUD = [
  { kod: '01', nazwa: 'Prace przygotowawcze' },
  { kod: '02', nazwa: 'Demontaże' },
  { kod: '03', nazwa: 'Ściany działowe' },
  { kod: '04', nazwa: 'Wykończenie ścian' },
  { kod: '05', nazwa: 'Sufity podwieszane' },
  { kod: '08', nazwa: 'Posadzki' },
];

// Podkategorie BUD.03 (poziom 3)
const podkategorieBUD03 = [
  { kod: '01', nazwa: 'Systemowe' },
  { kod: '02', nazwa: 'Akustyczne' },
  { kod: '03', nazwa: 'Murowane' },
];

// ... itd. dla pozostałych branż
```

---

## 7. Komponenty shadcn do instalacji

```bash
npx shadcn@latest add dialog form input label
npm install sonner  # toast notifications
```

Konfiguracja sonner w `app/layout.tsx`:
```tsx
import { Toaster } from 'sonner';

// W body:
<Toaster position="bottom-right" />
```

---

## 8. User Stories (do prd.json)

| ID | Title | Description | Acceptance Criteria | Priority | Dependencies |
|----|-------|-------------|---------------------|----------|--------------|
| KAT-001 | Zod schemas for kategorie | Create validation schemas | `lib/validations/kategorie.ts` exists with createKategoriaSchema, updateKategoriaSchema, exported types. Typecheck passes. | 1 | - |
| KAT-002 | Server Actions for kategorie CRUD | Create, update, delete actions | `actions/kategorie.ts` with createKategoria, updateKategoria, deleteKategoria, getKategorieTree. Delete checks children + pozycje. Handles unique constraint errors. Typecheck passes. | 2 | KAT-001 |
| KAT-003 | Zustand store for kategorie UI | UI state management | `stores/kategorie-ui-store.ts` with activeBranza, expandedIds, setActiveBranza, toggleExpanded. Typecheck passes. | 1 | - |
| KAT-004 | Install shadcn components | Dialog, form, input, label, sonner | Components installed via shadcn CLI. Sonner configured in layout.tsx. Typecheck passes. | 1 | - |
| KAT-005 | Kategorie page with data fetch | Server Component page | `app/(app)/kategorie/page.tsx` fetches data via getKategorieTree, passes to KategorieView. Typecheck passes. | 3 | KAT-002 |
| KAT-006 | BranzaTabs component | Tab navigation for 5 branże | `_components/branza-tabs.tsx` renders 5 tabs, uses Zustand setActiveBranza, shows active state. Verify at localhost:3000/kategorie. Typecheck passes. | 4 | KAT-003, KAT-005 |
| KAT-007 | KategoriaCard with expand | Expandable category cards | `_components/kategoria-card.tsx` shows kod, nazwa, children count, expand/collapse via Zustand. Shows podkategorie when expanded. Verify at localhost:3000/kategorie. Typecheck passes. | 5 | KAT-003, KAT-005 |
| KAT-008 | KategoriaFormModal | Universal add/edit modal | `_components/modals/kategoria-form-modal.tsx` handles all 3 levels (branża/kategoria/podkategoria). Uses RHF + Zod. Calls Server Actions. Shows toast on success/error. Typecheck passes. | 6 | KAT-001, KAT-002, KAT-004 |
| KAT-009 | DeleteConfirmModal | Delete confirmation with protection | `_components/modals/delete-confirm-modal.tsx` shows warning, calls deleteKategoria. UI disables button if has children (from props). Server validates independently. Toast on result. Typecheck passes. | 7 | KAT-002, KAT-004 |
| KAT-010 | Seed kategorie data | Load wireframe data | Create `scripts/seed-kategorie.ts` or Server Action. Insert 5 branż + kategorie + podkategorie from wireframe. Verify data in Supabase dashboard. Typecheck passes. | 8 | KAT-002 |

---

## 9. Weryfikacja końcowa

Po implementacji sprawdź:

1. **Nawigacja tabs** — przełączanie między BUD/ELE/SAN/TEL/HVC
2. **Expand/collapse** — karty kategorii rozwijają się pokazując podkategorie
3. **Add kategoria** — modal, walidacja, sukces → toast + lista odświeżona
4. **Add podkategoria** — modal wewnątrz karty, walidacja kodu 2 cyfry
5. **Edit** — zmiana nazwy/kodu, walidacja unikalności
6. **Delete ochrona** — przycisk disabled gdy ma children, Server Action blokuje gdy ma pozycje
7. **Unique constraint** — dodanie duplikatu kodu → error w formularzu
8. **Race condition** — dwóch userów dodaje → jeden dostaje error, drugi sukces

---

## 10. Referencje

- Wireframe: `/home/artur/Projekty/wireframe/js/views/kategorie.js`
- Wireframe data: `/home/artur/Projekty/wireframe/js/data/kategorie.js`
- DB schema: `/home/artur/Projekty/plany-app/docs/DATABASE-ARCHITECTURE.md` (tabela `kategorie`)
- Phase 2 design: `/home/artur/Projekty/plany-app/docs/plans/2025-02-05-phase2-ui-base-design.md`
