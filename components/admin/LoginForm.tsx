"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "@/app/admin/login/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [state, formAction, pending] = useActionState(loginAction, null as LoginState);

  return (
    <form action={formAction} className="mt-10 space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
          Courriel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-[11px] font-medium uppercase tracking-wider text-stone-500"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
      </div>
      {state?.error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-900 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
