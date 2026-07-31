import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../hooks/useSession";

/**
 * Gates a route on having a session.
 *
 * Waiting for `loading` is what stops a signed-in user being bounced to the
 * sign-in page on a hard refresh, since Supabase restores the session from
 * storage asynchronously.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) return null;

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
