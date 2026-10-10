import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/**
 * The current auth session, or null when signed out.
 *
 * `loading` is true until the first check resolves. Guarding on it matters:
 * Supabase restores a session from storage asynchronously, so a component
 * that redirects on `!session` without waiting will bounce a signed-in user
 * to the sign-in page on every refresh.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, user: session?.user ?? null };
}
