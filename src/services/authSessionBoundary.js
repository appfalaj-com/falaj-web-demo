import { supabase } from "../lib/supabaseClient.js";

export async function clearExistingAuthSessionForLogin() {
  if (!supabase) return;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (import.meta.env.DEV) {
      console.warn("auth_session_boundary_check_failed", {
        message: error?.message,
        code: error?.code,
        status: error?.status,
      });
    }
    await supabase.auth.signOut();
    return;
  }

  if (data?.session) {
    await supabase.auth.signOut();
  }
}
