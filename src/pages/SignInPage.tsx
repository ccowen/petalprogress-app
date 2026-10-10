import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";
import s from "./SignInPage.module.css";

export default function SignInPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/mandala" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }
    navigate("/mandala", { replace: true });
  }

  return (
    <main className={s.page}>
      <form className={s.card} onSubmit={handleSubmit}>
        <h1 className={s.title}>Sign in</h1>

        <label className={s.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className={s.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}

        <button className={s.submit} type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        {import.meta.env.DEV && (
          <p className={s.hint}>
            Seeded local account: <code>dev@petalprogress.test</code> /{" "}
            <code>petalprogress</code>
          </p>
        )}
      </form>
    </main>
  );
}
