import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { upsertProfile, savePlan } from "../lib/db";

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#0D0D0D] text-white shadow-lg hover:opacity-80 transition-opacity"
      aria-label="Back to top"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

const ABOUT_TABS = [
  {
    label: "Track tasks",
    body: "Log work by client with a title, description, and amount. Every billable hour and deliverable stays organised — nothing slips through the cracks.",
  },
  {
    label: "Invoice clients",
    body: "Group unbilled tasks into an invoice and send it in seconds. Totals are calculated automatically so you never do the math manually again.",
  },
  {
    label: "Stay in control",
    body: "Monitor draft, sent, and paid invoices at a glance. Your data is isolated per account and protected by row-level security — no one else can see it.",
  },
];

function AboutTabs() {
  const [active, setActive] = useState(0);
  return (
    <div className="mt-10">
      <div className="flex gap-1 border-b border-[#E5E4E0]">
        {ABOUT_TABS.map((tab, i) => (
          <button key={tab.label} onClick={() => setActive(i)}
            className={`px-5 py-3 text-base font-medium transition-colors relative ${active === i ? "text-[#0D0D0D]" : "text-[#6B6B6B] hover:text-[#0D0D0D]"}`}>
            {tab.label}
            {active === i && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D0D0D] rounded-full" />}
          </button>
        ))}
      </div>
      <p key={active} className="mt-8 text-lg text-[#6B6B6B] leading-relaxed fade-up">
        {ABOUT_TABS[active].body}
      </p>
    </div>
  );
}

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "₱0",
    period: "forever",
    description: "Perfect for getting started.",
    features: ["Up to 3 clients", "Unlimited tasks", "5 invoices/month", "Email support"],
    cta: "Get started free",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "₱299",
    period: "/ month",
    description: "For growing freelancers.",
    features: ["Unlimited clients", "Unlimited tasks & invoices", "AI invoice drafting", "Stripe payment links", "Priority support"],
    cta: "Subscribe — ₱299/mo",
    highlight: true,
  },
  {
    key: "business",
    name: "Business",
    price: "₱799",
    period: "/ month",
    description: "For agencies and teams.",
    features: ["Everything in Pro", "Team members", "Custom branding", "Advanced analytics", "Dedicated support"],
    cta: "Subscribe — ₱799/mo",
    highlight: false,
  },
];

export default function Home() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const location = useLocation();
  const aboutRef = useReveal();
  const plansRef = useReveal();

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [selectingPlan, setSelectingPlan] = useState(null); // plan key being processed

  // Scroll to hash section on mount (supports /#about and /#plans nav links)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [location]);

  // After returning from Stripe Checkout with ?upgraded=true, refresh the profile
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      refreshProfile();
      window.history.replaceState({}, "", "/");
    }
  }, []);

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

  async function handleSelectPlan(planKey) {
    setPromptError("");
    setSelectingPlan(planKey);
    try {
      if (planKey === "free") {
        await savePlan(user.id, "free");
        await refreshProfile();
      } else {
        const res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey, userId: user.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start checkout");
        window.location.href = data.url;
      }
    } catch (err) {
      setPromptError(err.message);
      setSelectingPlan(null);
    }
  }

  // ── Username prompt ──
  if (needsUsername) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F4F0]">
        <div className="w-full max-w-sm px-6 fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-[#0D0D0D]">Welcome to TaskBill</h1>
          <p className="mt-2 text-[#6B6B6B]">What should we call you?</p>
          <form onSubmit={handleSaveUsername} className="mt-6 space-y-3">
            <input required autoFocus placeholder="Your name" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[#E5E4E0] bg-white px-4 py-3 text-sm text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#6B6B6B]" />
            {promptError && <p className="text-sm text-red-600">{promptError}</p>}
            <button type="submit" disabled={saving || !username.trim()}
              className="w-full rounded-xl bg-[#0D0D0D] py-3 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
              {saving ? "Saving…" : "Get started"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main home page ──
  return (
    <div>
      <ScrollToTop />

      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-73px)] items-center justify-center"
        style={{ backgroundImage: "url('https://i.pinimg.com/originals/a7/51/99/a751991b13838b80e6b9e59c7f815636.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
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
          <div className="fade-up fade-up-delay-3 mt-8 flex items-center justify-center gap-3">
            <a href="#plans" className="rounded-xl bg-[#0D0D0D] px-6 py-3 text-sm font-semibold text-white hover:opacity-80 transition-opacity">
              Start now
            </a>
            <a href="#about" className="rounded-xl border border-[#0D0D0D] bg-white/70 px-6 py-3 text-sm font-semibold text-[#0D0D0D] hover:bg-white transition-colors">
              Learn more
            </a>
          </div>
          <a href="#about" className="fade-up fade-up-delay-3 inline-block mt-10 text-[#6B6B6B] hover:text-[#0D0D0D] transition-colors" aria-label="Scroll to about">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-[#F5F4F0] py-28 px-6">
        <div ref={aboutRef} className="mx-auto max-w-3xl" style={{ opacity: 0, transform: "translateY(24px)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">About</p>
          <h2 className="mt-3 text-5xl font-bold tracking-tight text-[#0D0D0D]">
            Built for freelancers who mean business.
          </h2>
          <p className="mt-5 text-xl text-[#6B6B6B] leading-relaxed">
            TaskBill brings together task tracking and invoicing into a single, distraction-free workspace.
            No spreadsheets, no manual calculations — just clear records of your work and a fast path to getting paid.
          </p>
          <AboutTabs />
        </div>
      </section>

      {/* ── Plans ── */}
      <section id="plans" className="bg-white py-24 px-6 border-t border-[#E5E4E0]">
        <div ref={plansRef} className="mx-auto max-w-4xl" style={{ opacity: 0, transform: "translateY(24px)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6B]">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#0D0D0D]">Simple, transparent plans.</h2>
          <p className="mt-3 text-[#6B6B6B]">Start free. Upgrade when you're ready.</p>

          {/* Plan status */}
          {profile.plan ? (
            <p className="mt-4 text-sm text-[#6B6B6B]">
              Your current plan: <span className="font-semibold text-[#0D0D0D] capitalize">{profile.plan}</span>
            </p>
          ) : (
            <p className="mt-4 inline-block rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Pick a plan below to unlock Tasks &amp; Invoices.
            </p>
          )}



          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = profile.plan === plan.key;
              return (
                <div key={plan.key}
                  className={`rounded-2xl border px-6 py-8 flex flex-col ${plan.highlight ? "border-[#0D0D0D] bg-[#0D0D0D] text-white" : "border-[#E5E4E0] bg-[#F5F4F0]"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${plan.highlight ? "text-white/60" : "text-[#6B6B6B]"}`}>{plan.name}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? "text-white/60" : "text-[#6B6B6B]"}`}>{plan.period}</span>
                  </div>
                  <p className={`mt-2 text-sm ${plan.highlight ? "text-white/70" : "text-[#6B6B6B]"}`}>{plan.description}</p>
                  <ul className="mt-6 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white/80" : "text-[#0D0D0D]"}`}>
                        <span className={plan.highlight ? "text-white" : "text-[#0D0D0D]"}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => !isCurrent && handleSelectPlan(plan.key)}
                    disabled={isCurrent || !!selectingPlan}
                    className={`mt-8 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${plan.highlight ? "bg-white text-[#0D0D0D] disabled:opacity-60" : "bg-[#0D0D0D] text-white disabled:opacity-40"} hover:opacity-80`}>
                    {selectingPlan === plan.key ? "Please wait…" : isCurrent ? "Current plan" : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
