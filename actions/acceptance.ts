'use server'

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/actions/projekty';

export async function changeProjectStatus(
  projektId: string,
  newStatus: string,
  rewizjaId?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('change_project_status', {
    p_projekt_id: projektId,
    p_new_status: newStatus,
    p_rewizja_id: rewizjaId || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/projekty');
  return { success: true, data };
}
