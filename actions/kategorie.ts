'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createKategoriaSchema, updateKategoriaSchema } from '@/lib/validations/kategorie';
import type { BranzaKod } from '@/stores/kategorie-ui-store';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface KategoriaNode {
  id: string;
  parent_id: string | null;
  kod: string;
  pelny_kod: string | null;
  nazwa: string;
  poziom: number;
  created_at: string;
  updated_at: string;
  children: KategoriaNode[];
}

// CREATE
export async function createKategoria(input: unknown): Promise<ActionResult<KategoriaNode>> {
  console.log('[createKategoria] Input:', input);
  const parsed = createKategoriaSchema.safeParse(input);
  if (!parsed.success) {
    console.log('[createKategoria] Validation failed:', parsed.error.issues);
    return { success: false, error: parsed.error.issues[0].message };
  }

  console.log('[createKategoria] Validated data:', parsed.data);
  const supabase = await createClient();

  // Determine poziom from parent
  let poziom = 1;
  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from('kategorie')
      .select('poziom')
      .eq('id', parsed.data.parentId)
      .single();

    if (parent) {
      poziom = parent.poziom + 1;
    }
  }

  const { data, error } = await supabase
    .from('kategorie')
    .insert({
      parent_id: parsed.data.parentId,
      kod: parsed.data.kod,
      nazwa: parsed.data.nazwa,
      poziom,
    })
    .select()
    .single();

  console.log('[createKategoria] Supabase result:', { data, error });

  if (error) {
    console.log('[createKategoria] Error:', error);
    if (error.code === '23505') {
      return { success: false, error: 'Kod już istnieje w tej kategorii' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
  console.log('[createKategoria] Success, revalidated /kategorie');
  return { success: true, data: { ...data, children: [] } as KategoriaNode };
}

// UPDATE
export async function updateKategoria(id: string, input: unknown): Promise<ActionResult> {
  const parsed = updateKategoriaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
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
  console.log('[deleteKategoria] Starting delete for id:', id);
  const supabase = await createClient();

  // 1. Check children
  const { count: childrenCount, error: childrenError } = await supabase
    .from('kategorie')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', id);

  console.log('[deleteKategoria] Children check:', { childrenCount, childrenError });

  if (childrenCount && childrenCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${childrenCount} podkategorii` };
  }

  // 2. Check pozycje
  const { count: pozycjeCount, error: pozycjeError } = await supabase
    .from('pozycje_biblioteka')
    .select('*', { count: 'exact', head: true })
    .eq('kategoria_id', id);

  console.log('[deleteKategoria] Pozycje check:', { pozycjeCount, pozycjeError });

  if (pozycjeCount && pozycjeCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${pozycjeCount} przypisanych pozycji` };
  }

  // 3. Delete
  const { error, count } = await supabase
    .from('kategorie')
    .delete()
    .eq('id', id);

  console.log('[deleteKategoria] Delete result:', { error, count, id });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
  console.log('[deleteKategoria] Success, revalidated /kategorie');
  return { success: true };
}

// GET NEXT KOD - sugeruje następny wolny kod dla danego parenta
export async function getNextKod(parentId: string | null): Promise<string> {
  const supabase = await createClient();

  // Build query - handle null parentId for top-level (branża)
  let query = supabase
    .from('kategorie')
    .select('kod')
    .order('kod');

  if (parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parentId);
  }

  const { data: siblings } = await query;

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

// GET NEXT POZYCJA KOD - generate next available position code for a kategoria
export async function getNextPozycjaKod(kategoriaId: string): Promise<string> {
  const supabase = await createClient();

  // 1. Get kategoria to obtain pelny_kod
  const { data: kategoria, error: katError } = await supabase
    .from('kategorie')
    .select('pelny_kod')
    .eq('id', kategoriaId)
    .single();

  if (katError || !kategoria?.pelny_kod) {
    console.error('[getNextPozycjaKod] Kategoria not found:', kategoriaId);
    return '';
  }

  const prefix = kategoria.pelny_kod; // e.g. "BUD.03.01"

  // 2. Find existing pozycje with this prefix
  const { data: pozycje, error: pozError } = await supabase
    .from('pozycje_biblioteka')
    .select('kod')
    .like('kod', `${prefix}.%`)
    .order('kod');

  if (pozError) {
    console.error('[getNextPozycjaKod] Error fetching pozycje:', pozError);
    return `${prefix}.001`;
  }

  if (!pozycje || pozycje.length === 0) {
    return `${prefix}.001`;
  }

  // 3. Find first available 3-digit number
  const existingNumbers = new Set(
    pozycje
      .map(p => {
        const parts = p.kod.split('.');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10);
      })
      .filter(n => !isNaN(n))
  );

  for (let i = 1; i <= 999; i++) {
    if (!existingNumbers.has(i)) {
      return `${prefix}.${i.toString().padStart(3, '0')}`;
    }
  }

  // Fallback - should never happen with 999 slots
  return `${prefix}.999`;
}

// GET KATEGORIE BY POZIOM - for cascading selects
export interface KategoriaOption {
  id: string;
  kod: string;
  nazwa: string;
}

export async function getKategorieByPoziom(
  poziom: number,
  parentId?: string
): Promise<KategoriaOption[]> {
  const supabase = await createClient();

  let query = supabase
    .from('kategorie')
    .select('id, kod, nazwa')
    .eq('poziom', poziom)
    .order('kod');

  // For poziom 1 (branże), parentId should be null
  // For poziom 2+ with parentId, filter by parent_id
  if (poziom === 1) {
    query = query.is('parent_id', null);
  } else if (parentId) {
    query = query.eq('parent_id', parentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getKategorieByPoziom] Error:', error);
    return [];
  }

  return data || [];
}

// GET KATEGORIE COUNTS - count of poziom 2 categories per branża
export async function getKategorieCounts(): Promise<Record<BranzaKod, number>> {
  const supabase = await createClient();

  // Get all kategorie at poziom 2 (categories under branże)
  const { data, error } = await supabase
    .from('kategorie')
    .select('pelny_kod')
    .eq('poziom', 2);

  if (error) {
    console.error('[getKategorieCounts] Error:', error);
    return { BUD: 0, ELE: 0, SAN: 0, TEL: 0, HVC: 0 };
  }

  // Group by first 3 chars of pelny_kod (branża code)
  const counts: Record<BranzaKod, number> = { BUD: 0, ELE: 0, SAN: 0, TEL: 0, HVC: 0 };

  data?.forEach((item) => {
    if (item.pelny_kod) {
      const branzaKod = item.pelny_kod.substring(0, 3) as BranzaKod;
      if (branzaKod in counts) {
        counts[branzaKod]++;
      }
    }
  });

  return counts;
}

// GET KATEGORIA ID BY KOD - helper for cascading selects
export async function getKategoriaIdByKod(kod: string, poziom: number = 1): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kategorie')
    .select('id')
    .eq('kod', kod)
    .eq('poziom', poziom)
    .single();

  if (error || !data) return null;
  return data.id;
}

// GET KATEGORIE FOR BRANZA - fetch kategorie at poziom=2 for a given branza kod
export async function getKategorieForBranza(branzaKod: string): Promise<KategoriaOption[]> {
  const branzaId = await getKategoriaIdByKod(branzaKod, 1);
  if (!branzaId) return [];
  return getKategorieByPoziom(2, branzaId);
}

// READ - kategorie tree
export async function getKategorieTree(): Promise<KategoriaNode[]> {
  console.log('[getKategorieTree] Fetching...');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kategorie')
    .select('*')
    .order('kod');

  console.log('[getKategorieTree] Result:', { count: data?.length, error });

  if (error) throw error;

  return buildTree(data || []);
}

interface KategoriaRow {
  id: string;
  parent_id: string | null;
  kod: string;
  pelny_kod: string | null;
  nazwa: string;
  poziom: number;
  created_at: string;
  updated_at: string;
}

function buildTree(flatList: KategoriaRow[]): KategoriaNode[] {
  const map = new Map<string, KategoriaNode>();
  const roots: KategoriaNode[] = [];

  // First pass: create map
  flatList.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  flatList.forEach(item => {
    const node = map.get(item.id)!;
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
