'use server'

import { revalidatePath } from 'next/cache';
import { createClient, getOrganizationId } from '@/lib/supabase/server';
import {
  createPozycjaSchema,
  updatePozycjaSchema,
  type CreatePozycjaInput,
  type UpdatePozycjaInput,
  type PozycjeFilters
} from '@/lib/validations/pozycje';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Typy dla pozycji z bazy
export interface SkladowaMaterial {
  id: string;
  lp: number;
  nazwa: string;
  produkt_id: string | null;
  dostawca_id: string | null;
  cena_domyslna: number | null;
  norma_domyslna: number | null;
  jednostka: string | null;
}

export interface SkladowaRobocizna {
  id: string;
  lp: number;
  opis: string;
  cena: number;
  podwykonawca_id: string | null;
}

export interface KategoriaInfo {
  id: string;
  kod: string;
  nazwa: string;
  poziom: number;
  parent: {
    id: string;
    kod: string;
    nazwa: string;
  } | null;
}

export interface Pozycja {
  id: string;
  kategoria_id: string | null;
  kod: string;
  nazwa: string;
  opis: string | null;
  jednostka: string;
  typ: 'robocizna' | 'material' | 'komplet';
  aktywny: boolean;
  created_at: string;
  updated_at: string;
  cena_robocizny: number | null;
  biblioteka_skladowe_materialy: SkladowaMaterial[];
  biblioteka_skladowe_robocizna: SkladowaRobocizna[];
  kategoria: KategoriaInfo | null;
}

// CREATE
export async function createPozycja(input: unknown): Promise<ActionResult<Pozycja>> {
  const parsed = createPozycjaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const organizationId = await getOrganizationId(supabase);

  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .insert({
      organization_id: organizationId,
      kod: parsed.data.kod,
      nazwa: parsed.data.nazwa,
      jednostka: parsed.data.jednostka,
      typ: parsed.data.typ,
      kategoria_id: parsed.data.kategoriaId,
      opis: parsed.data.opis,
    })
    .select(`
      *,
      biblioteka_skladowe_materialy(*),
      biblioteka_skladowe_robocizna(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Pozycja o tym kodzie już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data: data as Pozycja };
}

// UPDATE
export async function updatePozycja(id: string, input: unknown): Promise<ActionResult<Pozycja>> {
  const parsed = updatePozycjaSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Map camelCase to snake_case
  const updateData: Record<string, unknown> = {};
  if (parsed.data.kod !== undefined) updateData.kod = parsed.data.kod;
  if (parsed.data.nazwa !== undefined) updateData.nazwa = parsed.data.nazwa;
  if (parsed.data.jednostka !== undefined) updateData.jednostka = parsed.data.jednostka;
  if (parsed.data.typ !== undefined) updateData.typ = parsed.data.typ;
  if (parsed.data.kategoriaId !== undefined) updateData.kategoria_id = parsed.data.kategoriaId;
  if (parsed.data.opis !== undefined) updateData.opis = parsed.data.opis;

  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      biblioteka_skladowe_materialy(*),
      biblioteka_skladowe_robocizna(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Pozycja o tym kodzie już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true, data: data as Pozycja };
}

// DELETE
export async function deletePozycja(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if used in kosztorys_pozycje
  const { count: usageCount } = await supabase
    .from('kosztorys_pozycje')
    .select('*', { count: 'exact', head: true })
    .eq('pozycja_biblioteka_id', id);

  if (usageCount && usageCount > 0) {
    return {
      success: false,
      error: `Nie można usunąć - pozycja jest używana w ${usageCount} kosztorysach`
    };
  }

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

// Pagination config
const PAGE_SIZE = 15;

// Return type for paginated getPozycje
export interface PozycjeResult {
  data: Pozycja[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// READ - lista z filtrami (paginated)
export async function getPozycje(filters: PozycjeFilters): Promise<PozycjeResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('pozycje_biblioteka')
    .select(`
      *,
      biblioteka_skladowe_materialy(*),
      biblioteka_skladowe_robocizna(*),
      kategoria:kategorie!kategoria_id(
        id,
        kod,
        nazwa,
        poziom,
        parent:kategorie!parent_id(id, kod, nazwa)
      )
    `, { count: 'exact' })
    .eq('aktywny', true)
    .order('kod')
    .range(offset, offset + PAGE_SIZE - 1);

  // Filter by kod prefix (branza.kategoria.podkategoria)
  if (filters.branza) {
    let kodPrefix = filters.branza;
    if (filters.kategoria) {
      kodPrefix += '.' + filters.kategoria;
      if (filters.podkategoria) {
        kodPrefix += '.' + filters.podkategoria;
      }
    }
    query = query.like('kod', `${kodPrefix}%`);
  }

  // Filter by search (ilike kod or nazwa)
  if (filters.search) {
    query = query.or(`kod.ilike.%${filters.search}%,nazwa.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data: (data || []) as Pozycja[],
    totalCount: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// UPDATE cena_robocizny (flat labor price on library position)
export async function updatePozycjaCenaRobocizny(
  id: string,
  cenaRobocizny: number | null
): Promise<ActionResult> {
  if (cenaRobocizny !== null && cenaRobocizny < 0) {
    return { success: false, error: 'Cena nie może być ujemna' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('pozycje_biblioteka')
    .update({ cena_robocizny: cenaRobocizny })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pozycje');
  return { success: true };
}

// READ - pojedyncza pozycja
export async function getPozycja(id: string): Promise<Pozycja | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('pozycje_biblioteka')
    .select(`
      *,
      biblioteka_skladowe_materialy(*),
      biblioteka_skladowe_robocizna(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data as Pozycja;
}
