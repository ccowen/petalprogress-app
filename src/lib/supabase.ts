import { createClient } from "@supabase/supabase-js";
// Types are generated from the migrations in ../petalprogress-db and linked
// as a file: dependency. `import type` is deliberate: the generated module
// has one runtime export we don't use, and a type-only import is erased at
// compile time so the bundler never has to touch it.
import type { Database } from "@ccowen/petalprogress-db";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n" +
      "Copy them from `supabase status` in ../petalprogress-db into .env.local, " +
      "and make sure the local stack is running (`supabase start`).",
  );
}

/**
 * The typed Supabase client.
 *
 * Every table in this schema is behind Row Level Security anchored to
 * auth.uid(), so an unauthenticated client reads zero rows -- an empty
 * array, not an error. If a query comes back empty unexpectedly, check
 * for a session before suspecting the query.
 */
export const supabase = createClient<Database>(url, anonKey);
