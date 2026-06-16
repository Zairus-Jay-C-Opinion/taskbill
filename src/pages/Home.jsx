import { useAuth } from "../auth/AuthProvider";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="text-2xl font-semibold text-slate-900">
        Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
      </h2>
      <p className="mt-2 text-slate-600">
        Use the nav above to manage your tasks and invoices.
      </p>
    </div>
  );
}
