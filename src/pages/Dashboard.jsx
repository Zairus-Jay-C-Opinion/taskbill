import { useAuth } from "../auth/AuthProvider";

/** Placeholder protected home. Real billing/task features land here later. */
export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">TaskBill</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-semibold text-slate-900">
          You're signed in 🎉
        </h2>
        <p className="mt-2 text-slate-600">
          This is the protected dashboard. Billing and task features will be
          built here.
        </p>
      </main>
    </div>
  );
}
