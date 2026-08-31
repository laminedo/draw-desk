import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GROK_PROVIDERS,
  authEnabled,
  authClient,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPending && user) return <Navigate to="/" />;

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Player",
        });
        if (err) throw new Error(err.message || "Could not create account");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message || "Could not sign in");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-5 py-10 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2.5 no-underline">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">
            D
          </span>
          <span className="text-lg font-semibold tracking-tight">Draw Desk</span>
        </Link>
        <div className="rounded-xl border border-border bg-surface p-7 shadow-[0_8px_30px_rgb(0_0_0/0.06)]">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Saved tickets stay with your account and sync across devices.
          </p>

          {authEnabled ? (
            <div className="mt-6 flex flex-col gap-2.5">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                  className="h-11 w-full rounded-md border border-border bg-surface text-sm font-medium text-fg transition-colors hover:bg-bg"
                >
                  Continue with {p.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          )}

          {authEnabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
                <span className="h-px flex-1 bg-border" />
                or email
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
                {mode === "signup" && (
                  <label className="block text-sm">
                    <span className="mb-1.5 block text-muted">Name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 w-full rounded-md border border-border bg-bg px-3 text-fg outline-none focus:border-accent"
                      autoComplete="name"
                    />
                  </label>
                )}
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 text-fg outline-none focus:border-accent"
                    autoComplete="email"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted">Password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 text-fg outline-none focus:border-accent"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </label>
                {error && <p className="text-sm text-danger">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 h-11 w-full rounded-md bg-accent text-sm font-semibold text-accent-fg disabled:opacity-60"
                >
                  {busy
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Sign in with email"
                      : "Create account"}
                </button>
              </form>
              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-accent"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
              >
                {mode === "signin"
                  ? "Need an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          <Link to="/" className="text-accent no-underline">
            Continue as guest
          </Link>
          {" — "}tickets stay on this device until you sign in.
        </p>
      </div>
    </main>
  );
}
