import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Email + password auth. Toggles between sign in and sign up.
 * On any Supabase error we surface the full message to the user
 * (per the project workflow rule about showing real errors).
 */
export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const { data, error: authError } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // If email confirmation is enabled in Supabase, signUp returns a user
    // but no active session — tell the user to confirm before signing in.
    if (isSignup && !data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("signin");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">TaskBill</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Please wait…" : isSignup ? "Sign up" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(isSignup ? "signin" : "signup");
            setError("");
            setMessage("");
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-900"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
