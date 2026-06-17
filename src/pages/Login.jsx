import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
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

    if (authError) { setError(authError.message); return; }

    if (isSignup && !data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("signin");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <h1 className="text-3xl font-bold tracking-tight text-[#0D0D0D]">TaskBill</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6B6B6B] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6B6B6B] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0D0D0D] py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setMessage(""); }}
          className="mt-6 w-full text-center text-sm text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors"
        >
          {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
