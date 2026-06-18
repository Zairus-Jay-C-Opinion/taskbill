import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const PASSWORD_RULES = [
  { id: "length",    label: "At least 8 characters",   test: (p) => p.length >= 8 },
  { id: "upper",     label: "One uppercase letter",     test: (p) => /[A-Z]/.test(p) },
  { id: "number",    label: "One number",               test: (p) => /[0-9]/.test(p) },
  { id: "special",   label: "One special character",    test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function allRulesMet(password) {
  return PASSWORD_RULES.every((r) => r.test(password));
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    if (isSignup && !allRulesMet(password)) {
      setError("Password doesn't meet all requirements.");
      setSubmitting(false);
      return;
    }

    if (isSignup) {
      // Always sign out and return to sign-in — prevents auto-login when
      // email confirmation is disabled in Supabase.
      await supabase.auth.signOut();
      setEmail("");
      setPassword("");
      setMode("signin");
      setMessage(data.session
        ? "Account created! Sign in to continue."
        : "Check your email to confirm your account, then sign in.");
      return;
    }

    navigate("/", { replace: true });
  }

  function switchMode() {
    setMode(isSignup ? "signin" : "signup");
    setError("");
    setMessage("");
    setShowPassword(false);
  }

  const inputCls = "w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B] transition-colors";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-[#0D0D0D]">TaskBill</h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6B6B6B] mb-1.5">Email</label>
            <input type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-[#6B6B6B] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={isSignup ? 8 : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls + " pr-11"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {isSignup && password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-emerald-600" : "text-[#6B6B6B]"}`}>
                      <span>{met ? "✓" : "·"}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#0D0D0D] py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <button onClick={switchMode}
          className="mt-6 w-full text-center text-sm text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors">
          {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
