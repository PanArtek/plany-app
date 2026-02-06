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

  // Auto-generate zamówienia and umowy drafts when transitioning to realizacja
  if (newStatus === 'realizacja' && rewizjaId) {
    try {
      await supabase.rpc('generate_zamowienia_draft', {
        p_projekt_id: projektId,
        p_rewizja_id: rewizjaId,
      });
    } catch { /* ignore - user can generate manually */ }
    try {
      await supabase.rpc('generate_umowy_draft', {
        p_projekt_id: projektId,
        p_rewizja_id: rewizjaId,
      });
    } catch { /* ignore - user can generate manually */ }
  }

  revalidatePath('/projekty');
  revalidatePath(`/projekty/${projektId}/zamowienia`);
  revalidatePath(`/projekty/${projektId}/umowy`);
  return { success: true, data };
}
