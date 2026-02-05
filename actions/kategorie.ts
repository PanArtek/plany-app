'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createKategoriaSchema, updateKategoriaSchema } from '@/lib/validations/kategorie';

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
  const parsed = createKategoriaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

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

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Kod już istnieje w tej kategorii' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/kategorie');
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
  const supabase = await createClient();

  // 1. Check children
  const { count: childrenCount } = await supabase
    .from('kategorie')
    .select('*', { count: 'exact', head: true })
    .eq('parent_id', id);

  if (childrenCount && childrenCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${childrenCount} podkategorii` };
  }

  // 2. Check pozycje
  const { count: pozycjeCount } = await supabase
    .from('pozycje_biblioteka')
    .select('*', { count: 'exact', head: true })
    .eq('kategoria_id', id);

  if (pozycjeCount && pozycjeCount > 0) {
    return { success: false, error: `Nie można usunąć - ma ${pozycjeCount} przypisanych pozycji` };
  }

  // 3. Delete
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

// READ - kategorie tree
export async function getKategorieTree(): Promise<KategoriaNode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('kategorie')
    .select('*')
    .order('kod');

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
