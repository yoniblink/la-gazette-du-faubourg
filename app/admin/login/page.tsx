import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px] rounded-2xl border border-stone-200/80 bg-white p-10 shadow-[0_2px_24px_-4px_rgba(0,0,0,0.06)]">
        <p className="font-[family-name:var(--font-serif)] text-xl font-light tracking-tight text-stone-900">
          La Gazette du Faubourg
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
          Administration
        </p>
        <Suspense fallback={<p className="mt-10 text-center text-sm text-stone-400">Chargement…</p>}>
          <LoginForm />
        </Suspense>
        <Link
          href="/"
          className="mt-8 block text-center text-xs text-stone-400 transition-colors hover:text-stone-600"
        >
          ← Retour au site
        </Link>
      </div>
    </div>
  );
}
