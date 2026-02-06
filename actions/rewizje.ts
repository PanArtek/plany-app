'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

export interface RewizjaBase {
  id: string;
  numer: number;
  nazwa: string | null;
  is_locked: boolean;
  locked_at: string | null;
  is_accepted: boolean;
  accepted_at: string | null;
  created_at: string;
}

// --- READ: Lista rewizji dla projektu ---

export async function getRewizje(projektId: string): Promise<RewizjaBase[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rewizje')
    .select('id, numer, nazwa, is_locked, locked_at, is_accepted, accepted_at, created_at')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: true });

  if (error) throw error;

  return (data || []) as RewizjaBase[];
}

// --- CREATE rewizja ---

export async function createRewizja(projektId: string, nazwa?: string): Promise<ActionResult<RewizjaBase>> {
  const supabase = await createClient();

  // Auto-increment numer
  const { data: maxData, error: maxError } = await supabase
    .from('rewizje')
    .select('numer')
    .eq('projekt_id', projektId)
    .order('numer', { ascending: false })
    .limit(1);

  if (maxError) {
    return { success: false, error: maxError.message };
  }

  const nextNumer = maxData && maxData.length > 0 ? (maxData[0] as { numer: number }).numer + 1 : 0;

  const { data, error } = await supabase
    .from('rewizje')
    .insert({
      projekt_id: projektId,
      numer: nextNumer,
      nazwa: nazwa || null,
    })
    .select('id, numer, nazwa, is_locked, locked_at, is_accepted, accepted_at, created_at')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true, data: data as RewizjaBase };
}

// --- LOCK rewizja ---

export async function lockRewizja(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rewizje')
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}

// --- UNLOCK rewizja ---

export async function unlockRewizja(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rewizje')
    .update({ is_locked: false, locked_at: null })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true };
}
