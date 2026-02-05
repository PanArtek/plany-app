# FAZA 3b: Pozycje — Design Document

**Data:** 2026-02-05
**Status:** Draft
**Branch:** `ralph/phase3b-pozycje`

---

## Podsumowanie

Moduł Pozycje umożliwia zarządzanie biblioteką pozycji kosztorysowych. **Składowe są read-only** — edycja składowych w Phase 3c.

| Aspekt | Decyzja |
|--------|---------|
| Scope | CRUD pozycji (kod, nazwa, jednostka, typ, kategoria). Składowe read-only. |
| Tabela | TanStack Table (reużywalne w Kosztorysie) |
| Layout | Tabela ~40%, Panel szczegółów ~60% |
| Filtry | URL params (?branza=BUD&kategoria=03&search=...) |
| State | URL dla filtrów, local state dla selected row |

---

## 1. Struktura plików

```
app/(app)/pozycje/
├── page.tsx                      # Server Component - parse URL, fetch
└── _components/
    ├── pozycje-view.tsx          # Client - layout wrapper
    ├── pozycje-filters.tsx       # Client - hierarchiczne filtry + search
    ├── pozycje-table.tsx         # Client - TanStack Table
    ├── pozycje-columns.tsx       # Definicja kolumn
    ├── pozycja-detail-panel.tsx  # Client - panel szczegółów
    ├── skladowe-section.tsx      # Read-only składowe display
    └── modals/
        ├── pozycja-form-modal.tsx    # Add/Edit pozycja
        └── delete-confirm-modal.tsx  # Reuse z kategorie

lib/validations/
└── pozycje.ts                    # Zod schemas

lib/utils/
└── pozycje.ts                    # obliczCenePozycji helper

actions/
└── pozycje.ts                    # Server Actions CRUD
```

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Filters: [BUD] [ELE] [SAN] [TEL] [HVC]    🔍 [Search...]       │
│           [Kategoria ▼] [Podkategoria ▼]              [+ Dodaj] │
├────────────────────────┬────────────────────────────────────────┤
│                        │                                        │
│  Table (~40%)          │  Detail Panel (~60%)                   │
│  ┌────┬────────┬────┐  │  ┌────────────────────────────────┐   │
│  │Kod │Nazwa   │Cena│  │  │ BUD / Ściany / Systemowe       │   │
│  ├────┼────────┼────┤  │  │ Ściana GK 12.5mm na CW50       │   │
│  │... │...     │... │  │  │ BUD.03.01.001 · m²             │   │
│  │    │        │    │  │  ├────────────────────────────────┤   │
│  │ [selected] ─────────│─▶│ Robocizna            120.00 zł │   │
│  │    │        │    │  │  │  └─ Montaż ściany     120.00   │   │
│  │    │        │    │  │  │                                │   │
│  │    │        │    │  │  │ Materiały            85.50 zł  │   │
│  │    │        │    │  │  │  ├─ Płyta GK 12.5     45.00   │   │
│  │    │        │    │  │  │  ├─ Profil CW50       28.00   │   │
│  │    │        │    │  │  │  └─ Wkręty kpl        12.50   │   │
│  │    │        │    │  │  ├────────────────────────────────┤   │
│  │    │        │    │  │  │ Cena NETTO      205.50 zł/m²  │   │
│  │    │        │    │  │  │        [Edytuj] [🗑️]           │   │
│  └────┴────────┴────┘  │  └────────────────────────────────┘   │
└────────────────────────┴────────────────────────────────────────┘
```

**Proporcje:** `grid grid-cols-[2fr_3fr]` lub `flex` z `w-[40%]` / `w-[60%]`

---

## 3. Zod Schemas

```ts
// lib/validations/pozycje.ts
import { z } from 'zod';

// Enum dla typu pozycji
const pozycjaTypSchema = z.enum(['robocizna', 'material', 'komplet']);

// Jednostki
const jednostkaSchema = z.enum(['m²', 'mb', 'szt', 'kpl', 'kg', 'l', 'opak']);

// Regex dla kodu pozycji: BUD.03.01.001 lub BUD.03.001
const kodPozycjiRegex = /^[A-Z]{2,3}\.\d{2}(\.\d{2})?\.\d{3}$/;

// Schema dla tworzenia pozycji
export const createPozycjaSchema = z.object({
  kod: z.string().regex(kodPozycjiRegex, "Format: BUD.03.01.001 lub BUD.03.001"),
  nazwa: z.string().min(3, "Min 3 znaki").max(500, "Max 500 znaków"),
  jednostka: jednostkaSchema,
  typ: pozycjaTypSchema.default('komplet'),
  kategoriaId: z.string().uuid("Wybierz kategorię").nullable(),
  opis: z.string().max(2000).optional(),
});

// Schema dla edycji (wszystkie pola opcjonalne)
export const updatePozycjaSchema = z.object({
  kod: z.string().regex(kodPozycjiRegex).optional(),
  nazwa: z.string().min(3).max(500).optional(),
  jednostka: jednostkaSchema.optional(),
  typ: pozycjaTypSchema.optional(),
  kategoriaId: z.string().uuid().nullable().optional(),
  opis: z.string().max(2000).optional(),
  aktywny: z.boolean().optional(),
});

// Schema dla filtrów URL (walidacja searchParams)
export const pozycjeFiltersSchema = z.object({
  branza: z.string().regex(/^[A-Z]{2,3}$/).optional(),
  kategoria: z.string().regex(/^\d{2}$/).optional(),
  podkategoria: z.string().regex(/^\d{2}$/).optional(),
  search: z.string().max(100).optional(),
  selected: z.string().uuid().optional(),
});

// Typy
export type CreatePozycjaInput = z.infer<typeof createPozycjaSchema>;
export type UpdatePozycjaInput = z.infer<typeof updatePozycjaSchema>;
export type PozycjeFilters = z.infer<typeof pozycjeFiltersSchema>;
```

---

## 4. Server Actions

```ts
// actions/pozycje.ts
'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createPozycjaSchema,
  updatePozycjaSchema,
  pozycjeFiltersSchema,
  type CreatePozycjaInput,
  type UpdatePozycjaInput,
  type PozycjeFilters,
} from '@/lib/validations/pozycje';

type ActionResult = { success: boolean; error?: string; data?: any };

// CREATE
export async function createPozycja(input: unknown): Promise<ActionResult> {
  const parsed = createPozycjaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .insert({
      kod: parsed.data.kod,
      nazwa: parsed.data.nazwa,
      jednostka: parsed.data.jednostka,
      typ: parsed.data.typ,
      kategoria_id: parsed.data.kategoriaId,
      opis: parsed.data.opis,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Pozycja o tym kodzie już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data };
}

// UPDATE
export async function updatePozycja(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updatePozycjaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  // Map camelCase to snake_case
  const updateData: Record<string, any> = {};
  if (parsed.data.kod !== undefined) updateData.kod = parsed.data.kod;
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.jednostka !== undefined) updateData.jednostka = parsed.data.jednostka;
  if (parsed.data.typ !== undefined) updateData.typ = parsed.data.typ;
  if (parsed.data.kategoriaId !== undefined) updateData.kategoria_id = parsed.data.kategoriaId;
  if (parsed.data.opis !== undefined) updateData.opis = parsed.data.opis;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { error } = await supabase
    .from('pozycje_biblioteka')
    .update(updateData)
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Pozycja o tym kodzie już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true };
}

// DELETE (z ochroną)
export async function deletePozycja(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Sprawdź czy pozycja jest używana w kosztorysie
  const { count } = await supabase
    .from('kosztorys_pozycje')
    .select('*', { count: 'exact', head: true })
    .eq('pozycja_biblioteka_id', id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Nie można usunąć - pozycja jest używana w ${count} kosztorysach`
    };
  }

  // Usuń składowe (CASCADE powinno to zrobić, ale dla pewności)
  const { error } = await supabase
    .from('pozycje_biblioteka')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true };
}

// READ - lista z filtrami i składowymi
export async function getPozycje(rawFilters: unknown): Promise<PozycjaWithSkladowe[]> {
  const filters = pozycjeFiltersSchema.parse(rawFilters);
  const supabase = await createClient();

  let query = supabase
    .from('pozycje_biblioteka')
    .select(`
      *,
      kategoria:kategorie(*),
      skladowe_robocizna:biblioteka_skladowe_robocizna(*),
      skladowe_materialy:biblioteka_skladowe_materialy(*)
    `)
    .eq('aktywny', true)
    .order('kod');

  // Filtr po kodzie (prefix match)
  if (filters.branza) {
    let prefix = filters.branza;
    if (filters.kategoria) {
      prefix += '.' + filters.kategoria;
      if (filters.podkategoria) {
        prefix += '.' + filters.podkategoria;
      }
    }
    query = query.like('kod', `${prefix}%`);
  }

  // Search (kod lub nazwa)
  if (filters.search) {
    query = query.or(`kod.ilike.%${filters.search}%,nazwa.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(mapToPozycjaWithSkladowe);
}

// READ - pojedyncza pozycja
export async function getPozycja(id: string): Promise<PozycjaWithSkladowe | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .select(`
      *,
      kategoria:kategorie(*),
      skladowe_robocizna:biblioteka_skladowe_robocizna(*),
      skladowe_materialy:biblioteka_skladowe_materialy(*)
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  return mapToPozycjaWithSkladowe(data);
}

// Helper - map DB to frontend type
function mapToPozycjaWithSkladowe(row: any): PozycjaWithSkladowe {
  return {
    id: row.id,
    kod: row.kod,
    nazwa: row.nazwa,
    jednostka: row.jednostka,
    typ: row.typ,
    opis: row.opis,
    aktywny: row.aktywny,
    kategoriaId: row.kategoria_id,
    kategoriaBreadcrumb: buildBreadcrumb(row.kategoria),
    skladoweRobocizna: row.skladowe_robocizna || [],
    skladoweMaterialy: row.skladowe_materialy || [],
    cenaJednostkowa: obliczCenePozycji(row).cena,
  };
}

function buildBreadcrumb(kategoria: any): string {
  if (!kategoria) return '';
  // TODO: build full path from pelny_kod
  return kategoria.pelny_kod?.replace(/\./g, ' / ') || kategoria.nazwa;
}
```

---

## 5. Helper: obliczCenePozycji

```ts
// lib/utils/pozycje.ts

interface SkladowaRobocizna {
  id: string;
  opis: string;
  stawka_domyslna: number | null;
  norma_domyslna: number;
}

interface SkladowaMaterial {
  id: string;
  nazwa: string;
  cena_domyslna: number | null;
  norma_domyslna: number;
}

interface CenyPozycji {
  robocizna: number;
  material: number;
  cena: number;  // robocizna + material
}

/**
 * Oblicza cenę jednostkową pozycji na podstawie składowych biblioteki.
 * UWAGA: To są ceny SZABLONOWE (domyślne). W kosztorysie ceny mogą być inne.
 */
export function obliczCenePozycji(pozycja: {
  skladowe_robocizna?: SkladowaRobocizna[];
  skladowe_materialy?: SkladowaMaterial[];
}): CenyPozycji {
  const robocizna = (pozycja.skladowe_robocizna || []).reduce((sum, r) => {
    const stawka = r.stawka_domyslna || 0;
    const norma = r.norma_domyslna || 1;
    return sum + (stawka * norma);
  }, 0);

  const material = (pozycja.skladowe_materialy || []).reduce((sum, m) => {
    const cena = m.cena_domyslna || 0;
    const norma = m.norma_domyslna || 1;
    return sum + (cena * norma);
  }, 0);

  return {
    robocizna,
    material,
    cena: robocizna + material,
  };
}
```

---

## 6. Komponenty UI

### 6.1 Page (Server Component)

```tsx
// app/(app)/pozycje/page.tsx
import { getPozycje } from '@/actions/pozycje';
import { PozycjeView } from './_components/pozycje-view';

interface Props {
  searchParams: Promise<{
    branza?: string;
    kategoria?: string;
    podkategoria?: string;
    search?: string;
    selected?: string;
  }>;
}

export default async function PozycjePage({ searchParams }: Props) {
  const params = await searchParams;
  const pozycje = await getPozycje(params);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-semibold font-mono mb-4">Pozycje</h1>
      </div>
      <PozycjeView
        initialData={pozycje}
        initialFilters={params}
        initialSelected={params.selected}
      />
    </div>
  );
}
```

### 6.2 PozycjeView (Client wrapper)

```tsx
// app/(app)/pozycje/_components/pozycje-view.tsx
'use client'

import { useState } from 'react';
import { PozycjeFilters } from './pozycje-filters';
import { PozycjeTable } from './pozycje-table';
import { PozycjaDetailPanel } from './pozycja-detail-panel';
import { PozycjaFormModal } from './modals/pozycja-form-modal';

interface Props {
  initialData: PozycjaWithSkladowe[];
  initialFilters: PozycjeFilters;
  initialSelected?: string;
}

export function PozycjeView({ initialData, initialFilters, initialSelected }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected || null);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: 'add' | 'edit' }>({
    open: false,
    mode: 'add',
  });

  const selectedPozycja = initialData.find(p => p.id === selectedId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-border">
        <PozycjeFilters
          filters={initialFilters}
          onAddClick={() => setFormModal({ open: true, mode: 'add' })}
        />
      </div>

      {/* Main content: Table + Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table ~40% */}
        <div className="w-[40%] overflow-auto border-r border-border">
          <PozycjeTable
            data={initialData}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Detail Panel ~60% */}
        <div className="w-[60%] overflow-hidden">
          {selectedPozycja ? (
            <PozycjaDetailPanel
              pozycja={selectedPozycja}
              onEdit={() => setFormModal({ open: true, mode: 'edit' })}
              onDelete={() => {/* open delete modal */}}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Wybierz pozycję z listy
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PozycjaFormModal
        mode={formModal.mode}
        pozycja={formModal.mode === 'edit' ? selectedPozycja : undefined}
        open={formModal.open}
        onOpenChange={(open) => setFormModal(prev => ({ ...prev, open }))}
      />
    </div>
  );
}
```

### 6.3 PozycjeFilters

```tsx
// app/(app)/pozycje/_components/pozycje-filters.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

const BRANZE = ['BUD', 'ELE', 'SAN', 'TEL', 'HVC'];

interface Props {
  filters: PozycjeFilters;
  onAddClick: () => void;
}

export function PozycjeFilters({ filters, onAddClick }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset dependent filters
    if (key === 'branza') {
      params.delete('kategoria');
      params.delete('podkategoria');
    }
    if (key === 'kategoria') {
      params.delete('podkategoria');
    }
    router.push(`/pozycje?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Branża tabs + Search + Add button */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {BRANZE.map(b => (
            <Button
              key={b}
              variant={filters.branza === b ? 'default' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('branza', filters.branza === b ? null : b)}
              className="font-mono"
            >
              {b}
            </Button>
          ))}
        </div>

        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po kodzie lub nazwie..."
            className="pl-9"
            defaultValue={filters.search}
            onChange={(e) => {
              // Debounce in real implementation
              updateFilter('search', e.target.value || null);
            }}
          />
        </div>

        <Button onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pozycję
        </Button>
      </div>

      {/* Row 2: Kategoria + Podkategoria (conditional) */}
      {filters.branza && (
        <div className="flex gap-2">
          {/* TODO: Kategoria dropdown based on branza */}
          {/* TODO: Podkategoria dropdown based on kategoria */}
        </div>
      )}
    </div>
  );
}
```

### 6.4 PozycjaFormModal

```tsx
// app/(app)/pozycje/_components/modals/pozycja-form-modal.tsx
'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPozycjaSchema, type CreatePozycjaInput } from '@/lib/validations/pozycje';
import { createPozycja, updatePozycja } from '@/actions/pozycje';
import { toast } from 'sonner';

const JEDNOSTKI = ['m²', 'mb', 'szt', 'kpl', 'kg', 'l', 'opak'];
const TYPY = ['robocizna', 'material', 'komplet'];

interface Props {
  mode: 'add' | 'edit';
  pozycja?: PozycjaWithSkladowe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PozycjaFormModal({ mode, pozycja, open, onOpenChange }: Props) {
  const form = useForm<CreatePozycjaInput>({
    resolver: zodResolver(createPozycjaSchema),
    defaultValues: mode === 'edit' && pozycja
      ? {
          kod: pozycja.kod,
          nazwa: pozycja.nazwa,
          jednostka: pozycja.jednostka,
          typ: pozycja.typ,
          kategoriaId: pozycja.kategoriaId,
          opis: pozycja.opis || '',
        }
      : {
          kod: '',
          nazwa: '',
          jednostka: 'm²',
          typ: 'komplet',
          kategoriaId: null,
          opis: '',
        },
  });

  async function onSubmit(data: CreatePozycjaInput) {
    const result = mode === 'add'
      ? await createPozycja(data)
      : await updatePozycja(pozycja!.id, data);

    if (result.success) {
      toast.success(mode === 'add' ? 'Dodano pozycję' : 'Zapisano zmiany');
      onOpenChange(false);
      form.reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Dodaj pozycję' : 'Edytuj pozycję'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="kod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod pozycji</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="BUD.03.01.001" className="font-mono" />
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
                    <Input {...field} placeholder="np. Ściana GK 12.5mm na CW50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jednostka"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jednostka</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JEDNOSTKI.map(j => (
                          <SelectItem key={j} value={j}>{j}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="typ"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPY.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* TODO: Kategoria select with hierarchy */}

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

## 7. TanStack Table

```tsx
// app/(app)/pozycje/_components/pozycje-columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const typColors: Record<string, string> = {
  robocizna: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  material: 'bg-green-500/20 text-green-400 border-green-500/30',
  komplet: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const columns: ColumnDef<PozycjaWithSkladowe>[] = [
  {
    accessorKey: 'kod',
    header: 'Kod',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue('kod')}</span>
    ),
    size: 130,
  },
  {
    accessorKey: 'nazwa',
    header: 'Nazwa',
    cell: ({ row }) => (
      <span className="truncate block max-w-[200px]">{row.getValue('nazwa')}</span>
    ),
  },
  {
    accessorKey: 'jednostka',
    header: 'Jedn.',
    size: 60,
  },
  {
    accessorKey: 'typ',
    header: 'Typ',
    cell: ({ row }) => {
      const typ = row.getValue('typ') as string;
      return (
        <Badge variant="outline" className={typColors[typ]}>
          {typ.charAt(0).toUpperCase()}
        </Badge>
      );
    },
    size: 50,
  },
  {
    accessorKey: 'cenaJednostkowa',
    header: 'Cena',
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatCurrency(row.getValue('cenaJednostkowa'))}
      </span>
    ),
    size: 80,
  },
];
```

```tsx
// app/(app)/pozycje/_components/pozycje-table.tsx
'use client'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { columns } from './pozycje-columns';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  data: PozycjaWithSkladowe[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PozycjeTable({ data, selectedId, onSelect }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-background border-b border-border">
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                style={{ width: header.getSize() }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                  {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                </div>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr
            key={row.id}
            onClick={() => onSelect(row.original.id)}
            className={cn(
              'cursor-pointer border-b border-border hover:bg-muted/50 transition-colors',
              selectedId === row.original.id && 'bg-muted'
            )}
          >
            {row.getVisibleCells().map(cell => (
              <td key={cell.id} className="p-3">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
        {table.getRowModel().rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
              Brak pozycji spełniających kryteria
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
```

---

## 8. Seed Data

Dane z wireframe `/home/artur/Projekty/wireframe/js/data/pozycje.js`:

```ts
// scripts/seed-pozycje.ts lub actions/seed.ts

const pozycjeData = [
  {
    kod: 'BUD.02.001',
    nazwa: 'Demontaż ścian działowych GK',
    jednostka: 'm²',
    typ: 'robocizna',
    // skladowe w osobnym INSERT
  },
  {
    kod: 'BUD.03.01.001',
    nazwa: 'Ściana GK 12.5mm pojedyncza na CW50',
    jednostka: 'm²',
    typ: 'komplet',
  },
  {
    kod: 'BUD.04.03.001',
    nazwa: 'Malowanie ścian 2x farba lateksowa',
    jednostka: 'm²',
    typ: 'komplet',
  },
  // ... więcej z wireframe
];
```

---

## 9. Komponenty shadcn do instalacji

```bash
npx shadcn@latest add select
npm install @tanstack/react-table
```

(Dialog, form, input, label, button, badge już zainstalowane w Phase 3a)

---

## 10. User Stories (do prd.json)

| ID | Title | Acceptance Criteria | Priority | Dependencies |
|----|-------|---------------------|----------|--------------|
| POZ-001 | Zod schemas for pozycje | `lib/validations/pozycje.ts` with createPozycjaSchema, updatePozycjaSchema, pozycjeFiltersSchema. Typecheck passes. | 1 | - |
| POZ-002 | Server Actions for pozycje CRUD | `actions/pozycje.ts` with create, update, delete, getPozycje, getPozycja. Delete checks kosztorys usage. Handles unique constraint. Typecheck passes. | 2 | POZ-001 |
| POZ-003 | Install TanStack Table + shadcn select | `@tanstack/react-table` installed. `npx shadcn add select`. Typecheck passes. | 1 | - |
| POZ-004 | Helper obliczCenePozycji | `lib/utils/pozycje.ts` with obliczCenePozycji. Returns { robocizna, material, cena }. Typecheck passes. | 2 | - |
| POZ-005 | Pozycje page with URL filters | `app/(app)/pozycje/page.tsx` parses searchParams, fetches filtered data via getPozycje. Typecheck passes. | 3 | POZ-002 |
| POZ-006 | PozycjeFilters component | `_components/pozycje-filters.tsx` with branża buttons, search input, Add button. Updates URL via router.push. Verify at localhost:3000/pozycje. Typecheck passes. | 4 | POZ-005 |
| POZ-007 | PozycjeTable with TanStack | `_components/pozycje-table.tsx` + `pozycje-columns.tsx`. Columns: kod, nazwa, jednostka, typ, cena. Row click selects. Header click sorts. Typecheck passes. | 5 | POZ-003, POZ-004, POZ-005 |
| POZ-008 | PozycjaDetailPanel | `_components/pozycja-detail-panel.tsx` shows breadcrumb, nazwa, kod, jednostka, składowe sections, suma, edit/delete buttons. ~60% width. Verify at localhost:3000/pozycje. Typecheck passes. | 6 | POZ-004, POZ-005 |
| POZ-009 | SkladoweSection component | `_components/skladowe-section.tsx` displays read-only list of składowe with opis/nazwa and cena. Shows "Brak składowych" when empty. Typecheck passes. | 6 | POZ-008 |
| POZ-010 | PozycjaFormModal | `_components/modals/pozycja-form-modal.tsx` with kod, nazwa, jednostka, typ fields. RHF + Zod. Calls createPozycja/updatePozycja. Toast on result. Typecheck passes. | 7 | POZ-001, POZ-002 |
| POZ-011 | Delete confirmation modal | Reuse delete-confirm-modal from kategorie. Shows usage count if blocked. Calls deletePozycja. Toast on result. Typecheck passes. | 8 | POZ-002 |
| POZ-012 | Seed pozycje data | Script inserts pozycje from wireframe. Links to kategorie via kod prefix. Verify in Supabase dashboard. Typecheck passes. | 9 | POZ-002, KAT-010 |

---

## 11. Weryfikacja końcowa

Po implementacji sprawdź:

1. **Filtry** — kliknięcie BUD filtruje po kodzie BUD.*, URL się zmienia
2. **Search** — wpisanie "malowanie" filtruje kod+nazwa
3. **Tabela** — sortowanie po nagłówkach, zaznaczenie wiersza
4. **Panel** — pokazuje szczegóły, składowe read-only z cenami
5. **Add** — modal, walidacja kodu (format), sukces → toast + tabela refresh
6. **Edit** — modal z wypełnionymi danymi, zapis
7. **Delete** — blokada gdy używana w kosztorysie, sukces gdy nie
8. **Proporcje** — tabela 40%, panel 60%

---

## 12. Referencje

- Wireframe: `/home/artur/Projekty/wireframe/js/views/pozycje.js`
- Wireframe data: `/home/artur/Projekty/wireframe/js/data/pozycje.js`
- DB schema: `/home/artur/Projekty/plany-app/docs/DATABASE-ARCHITECTURE.md`
- Phase 3a: `/home/artur/Projekty/plany-app/docs/plans/2026-02-05-phase3a-kategorie-design.md`
