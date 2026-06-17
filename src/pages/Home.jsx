import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { upsertProfile } from "../lib/db";

// Triggers .fade-up animation when element scrolls into view
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("fade-up"); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const PLANS = [
  {
    name: "Free",
    price: "₱0",
    period: "forever",
    description: "Perfect for getting started.",
    features: ["Up to 3 clients", "Unlimited tasks", "5 invoices/month", "Email support"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₱299",
    period: "/ month",
    description: "For growing freelancers.",
    features: ["Unlimited clients", "Unlimited tasks & invoices", "AI invoice drafting", "Stripe payment links", "Priority support"],
    cta: "Coming soon",
    highlight: true,
  },
  {
    name: "Business",
    price: "₱799",
    period: "/ month",
    description: "For agencies and teams.",
    features: ["Everything in Pro", "Team members", "Custom branding", "Advanced analytics", "Dedicated support"],
    cta: "Coming soon",
    highlight: false,
  },
];

export default function Home() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const aboutRef = useReveal();
  const plansRef = useReveal();

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptError, setPromptError] = useState("");

  if (loading || profile === undefined) return null;

  const needsUsername = !profile?.username;

  async function handleSaveUsername(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    setPromptError("");
    try {
      await upsertProfile({ id: user.id, username: username.trim() });
      await refreshProfile();
    } catch (err) {
      setPromptError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (needsUsername) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F4F0]">
        <div className="w-full max-w-sm px-6 fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-[#0D0D0D]">Welcome to TaskBill</h1>
          <p className="mt-2 text-[#6B6B6B]">What should we call you?</p>
          <form onSubmit={handleSaveUsername} className="mt-6 space-y-3">
            <input
              required autoFocus
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B]"
            />
            {promptError && <p className="text-sm text-red-600">{promptError}</p>}
            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="w-full rounded-xl bg-[#0D0D0D] py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving…" : "Get started"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="relative flex min-h-[calc(100vh-73px)] items-center justify-center"
        style={{
          backgroundImage: "url('https://i.pinimg.com/originals/a7/51/99/a751991b13838b80e6b9e59c7f815636.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-white/55" />
        <div className="relative z-10 text-center px-6 max-w-2xl">
          <p className="fade-up text-sm font-medium tracking-widest uppercase text-[#6B6B6B]">
            Good to see you, <span className="font-bold text-[#0D0D0D]">{profile.username}</span>.
          </p>
          <h1 className="fade-up fade-up-delay-1 mt-4 text-6xl font-bold tracking-tight text-[#0D0D0D] leading-tight">
            Your work, tracked.<br />Your clients, billed.
          </h1>
          <p className="fade-up fade-up-delay-2 mt-5 text-lg text-[#6B6B6B]">
            Manage tasks, generate invoices, and get paid — all in one place.
          </p>
          {/* Scroll indicator */}
          <a
            href="#about"
            className="fade-up fade-up-delay-3 inline-block mt-12 text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors"
            aria-label="Scroll to about"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-[#F5F4F0] py-24 px-6">
        <div ref={aboutRef} className="mx-auto max-w-3xl opacity-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">About</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#0D0D0D]">
            Built for freelancers who mean business.
          </h2>
          <p className="mt-5 text-lg text-[#6B6B6B] leading-relaxed">
            TaskBill brings together task tracking and invoicing into a single, distraction-free workspace.
            No spreadsheets, no manual calculations — just clear records of your work and a fast path to getting paid.
          </p>
          <div className="mt-10 divide-y divide-[#E5E4E0]">
            {[
              ["01", "Track every task", "Log work by client with a title, description, and amount. Nothing slips through the cracks."],
              ["02", "Invoice in seconds", "Group unbilled tasks into an invoice and send it — totals are calculated automatically."],
              ["03", "Stay in control", "Monitor draft, sent, and paid invoices at a glance. Your data, isolated and secure."],
            ].map(([num, title, body]) => (
              <div key={num} className="flex gap-8 py-7">
                <span className="text-xs font-semibold text-[#6B6B6B] w-6 shrink-0 pt-0.5">{num}</span>
                <div>
                  <p className="text-base font-bold text-[#0D0D0D]">{title}</p>
                  <p className="mt-1.5 text-sm text-[#6B6B6B] leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="plans" className="bg-white py-24 px-6 border-t border-[#E5E4E0]">
        <div ref={plansRef} className="mx-auto max-w-4xl opacity-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#0D0D0D]">
            Simple, transparent plans.
          </h2>
          <p className="mt-3 text-[#6B6B6B]">Start free. Upgrade when you're ready.</p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border px-6 py-8 flex flex-col ${
                  plan.highlight
                    ? "border-[#0D0D0D] bg-[#0D0D0D] text-white"
                    : "border-[#E5E4E0] bg-[#F5F4F0]"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-widest ${plan.highlight ? "text-white/60" : "text-[#6B6B6B]"}`}>
                  {plan.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-white/60" : "text-[#6B6B6B]"}`}>{plan.period}</span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlight ? "text-white/70" : "text-[#6B6B6B]"}`}>{plan.description}</p>

                <ul className="mt-6 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white/80" : "text-[#0D0D0D]"}`}>
                      <span className={`text-base ${plan.highlight ? "text-white" : "text-[#0D0D0D]"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  className={`mt-8 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
                    plan.highlight
                      ? "bg-white text-[#0D0D0D] disabled:opacity-60"
                      : "bg-[#0D0D0D] text-white disabled:opacity-40"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
