import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get organization_id for the current user.
 * Tries auth first, falls back to first organization in DB.
 */
export async function getOrganizationId(supabase: SupabaseClient): Promise<string | null> {
  // Try authenticated user first
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const { data: orgData } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .single();
    if (orgData) return orgData.organization_id;
  }

  // Fallback: first organization (for development without auth)
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  return org?.id ?? null;
}
