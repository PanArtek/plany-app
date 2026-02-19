'use server'

import { revalidatePath } from 'next/cache';
import { createClient, getOrganizationId } from '@/lib/supabase/server';
import {
  createTypRobociznySchema,
  updateTypRobociznySchema,
  type TypyRobociznyFilters,
} from '@/lib/validations/typy-robocizny';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface TypRobocizny {
  id: string;
  nazwa: string;
  jednostka: string | null;
  opis: string | null;
  aktywny: boolean | null;
  created_at: string | null;
}

export interface TypyRobociznyResult {
  data: TypRobocizny[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// --- Pagination ---

const PAGE_SIZE = 15;

// --- READ: Lista z filtrami ---

export async function getTypyRobocizny(filters: TypyRobociznyFilters): Promise<TypyRobociznyResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;
  const sort = filters.sort || 'nazwa';
  const order = filters.order || 'asc';

  let query = supabase
    .from('typy_robocizny')
    .select('id, nazwa, jednostka, opis, aktywny, created_at', { count: 'exact' });

  if (filters.search) {
    query = query.or(`nazwa.ilike.%${filters.search}%,opis.ilike.%${filters.search}%`);
  }

  if (!filters.showInactive) {
    query = query.eq('aktywny', true);
  }

  query = query.order(sort, { ascending: order === 'asc' });
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data || []) as TypRobocizny[],
    totalCount: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single ---

export async function getTypRobociznyById(id: string): Promise<TypRobocizny | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('typy_robocizny')
    .select('id, nazwa, jednostka, opis, aktywny, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as TypRobocizny;
}

// --- READ: All active (for dropdowns) ---

export async function getAllTypyRobocizny(): Promise<{ id: string; nazwa: string; jednostka: string | null }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('typy_robocizny')
    .select('id, nazwa, jednostka')
    .eq('aktywny', true)
    .order('nazwa');

  if (error) throw error;
  return (data || []) as { id: string; nazwa: string; jednostka: string | null }[];
}

// --- CREATE ---

export async function createTypRobocizny(input: unknown): Promise<ActionResult<TypRobocizny>> {
  const parsed = createTypRobociznySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const organizationId = await getOrganizationId(supabase);

  const { data, error } = await supabase
    .from('typy_robocizny')
    .insert({
      organization_id: organizationId,
      nazwa: parsed.data.nazwa,
      jednostka: parsed.data.jednostka,
      opis: parsed.data.opis ?? null,
      aktywny: parsed.data.aktywny,
    })
    .select('id, nazwa, jednostka, opis, aktywny, created_at')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/typy-robocizny');
  return { success: true, data: data as TypRobocizny };
}

// --- UPDATE ---

export async function updateTypRobocizny(id: string, input: unknown): Promise<ActionResult<TypRobocizny>> {
  const parsed = updateTypRobociznySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.jednostka !== undefined) updateData.jednostka = parsed.data.jednostka;
  if (parsed.data.opis !== undefined) updateData.opis = parsed.data.opis;
  if (parsed.data.aktywny !== undefined) updateData.aktywny = parsed.data.aktywny;

  const { data, error } = await supabase
    .from('typy_robocizny')
    .update(updateData)
    .eq('id', id)
    .select('id, nazwa, jednostka, opis, aktywny, created_at')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/typy-robocizny');
  return { success: true, data: data as TypRobocizny };
}

// --- DELETE ---

export async function deleteTypRobocizny(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check usage in stawki_podwykonawcow
  const { count: stawkiCount } = await supabase
    .from('stawki_podwykonawcow')
    .select('*', { count: 'exact', head: true })
    .eq('typ_robocizny_id', id);

  if (stawkiCount && stawkiCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - typ ma ${stawkiCount} stawek podwykonawców`,
    };
  }

  // Check usage in biblioteka_skladowe_robocizna
  const { count: pozycjeCount } = await supabase
    .from('biblioteka_skladowe_robocizna')
    .select('*', { count: 'exact', head: true })
    .eq('typ_robocizny_id', id);

  if (pozycjeCount && pozycjeCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - typ jest używany w ${pozycjeCount} pozycjach`,
    };
  }

  // Soft delete (set aktywny = false) if in use, hard delete if not
  const { error } = await supabase
    .from('typy_robocizny')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/typy-robocizny');
  return { success: true };
}
