'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createProjektSchema,
  updateProjektSchema,
  type ProjektyFilters,
} from '@/lib/validations/projekty';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// --- Interfaces ---

export interface ProjektWithCount {
  id: string;
  nazwa: string;
  slug: string;
  klient: string | null;
  adres: string | null;
  powierzchnia: number | null;
  status: string;
  notatki: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_rewizja_id: string | null;
  rewizjeCount: number;
}

export interface ProjektyResult {
  data: ProjektWithCount[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ProjektBase {
  id: string;
  nazwa: string;
  slug: string;
  klient: string | null;
  adres: string | null;
  powierzchnia: number | null;
  status: string;
  notatki: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_rewizja_id: string | null;
}

// --- Pagination ---

const PAGE_SIZE = 15;

// --- Helpers ---

function generateSlug(nazwa: string): string {
  return nazwa
    .toLowerCase()
    .replace(/[ąàáâãä]/g, 'a')
    .replace(/[ćčç]/g, 'c')
    .replace(/[ęèéêë]/g, 'e')
    .replace(/[ił]/g, 'i')
    .replace(/[ńñ]/g, 'n')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[śš]/g, 's')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[żźž]/g, 'z')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- READ: Lista projektów (paginated) ---

export async function getProjekty(filters: ProjektyFilters): Promise<ProjektyResult> {
  const supabase = await createClient();

  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('projekty')
    .select('id, nazwa, slug, klient, adres, powierzchnia, status, notatki, created_at, sent_at, accepted_rewizja_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`nazwa.ilike.%${filters.search}%,klient.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Fetch rewizje counts for these projects
  const ids = (data || []).map((d: { id: string }) => d.id);

  let countsMap: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: countData, error: countError } = await supabase
      .from('rewizje')
      .select('projekt_id')
      .in('projekt_id', ids);

    if (!countError && countData) {
      countsMap = (countData as { projekt_id: string }[]).reduce<Record<string, number>>((acc, row) => {
        acc[row.projekt_id] = (acc[row.projekt_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      nazwa: d.nazwa as string,
      slug: d.slug as string,
      klient: d.klient as string | null,
      adres: d.adres as string | null,
      powierzchnia: d.powierzchnia ? Number(d.powierzchnia) : null,
      status: d.status as string,
      notatki: d.notatki as string | null,
      created_at: d.created_at as string,
      sent_at: (d.sent_at as string) || null,
      accepted_rewizja_id: (d.accepted_rewizja_id as string) || null,
      rewizjeCount: countsMap[d.id as string] || 0,
    })),
    totalCount: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// --- READ: Single projekt ---

export async function getProjekt(id: string): Promise<ProjektBase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projekty')
    .select('id, nazwa, slug, klient, adres, powierzchnia, status, notatki, created_at, updated_at, sent_at, accepted_rewizja_id')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    powierzchnia: data.powierzchnia ? Number(data.powierzchnia) : null,
  } as ProjektBase;
}

// --- CREATE projekt ---

export async function createProjekt(input: unknown): Promise<ActionResult<ProjektBase>> {
  const parsed = createProjektSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false, error: 'Brak autoryzacji' };
  }

  const { data: orgData } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userData.user.id)
    .limit(1)
    .single();

  if (!orgData) {
    return { success: false, error: 'Brak przypisanej organizacji' };
  }

  const slug = generateSlug(parsed.data.nazwa);

  const { data, error } = await supabase
    .from('projekty')
    .insert({
      organization_id: orgData.organization_id,
      nazwa: parsed.data.nazwa,
      slug,
      klient: parsed.data.klient || null,
      adres: parsed.data.adres || null,
      powierzchnia: parsed.data.powierzchnia || null,
      notatki: parsed.data.notatki || null,
    })
    .select('id, nazwa, slug, klient, adres, powierzchnia, status, notatki, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Projekt o takiej nazwie (slug) już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return {
    success: true,
    data: {
      ...data,
      powierzchnia: data.powierzchnia ? Number(data.powierzchnia) : null,
    } as ProjektBase,
  };
}

// --- UPDATE projekt ---

export async function updateProjekt(id: string, input: unknown): Promise<ActionResult<ProjektBase>> {
  const parsed = updateProjektSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (parsed.data.nazwa !== undefined) {
    updateData.nazwa = parsed.data.nazwa;
    updateData.slug = generateSlug(parsed.data.nazwa);
  }
  if (parsed.data.klient !== undefined) updateData.klient = parsed.data.klient || null;
  if (parsed.data.adres !== undefined) updateData.adres = parsed.data.adres || null;
  if (parsed.data.powierzchnia !== undefined) updateData.powierzchnia = parsed.data.powierzchnia || null;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notatki !== undefined) updateData.notatki = parsed.data.notatki || null;

  const { data, error } = await supabase
    .from('projekty')
    .update(updateData)
    .eq('id', id)
    .select('id, nazwa, slug, klient, adres, powierzchnia, status, notatki, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Projekt o takiej nazwie (slug) już istnieje' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return {
    success: true,
    data: {
      ...data,
      powierzchnia: data.powierzchnia ? Number(data.powierzchnia) : null,
    } as ProjektBase,
  };
}

// --- DELETE projekt ---

export async function deleteProjekt(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('projekty')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}
