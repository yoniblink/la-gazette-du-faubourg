"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  changeAdminPassword,
  type ChangePasswordState,
} from "@/app/admin/(panel)/settings/actions";

const inputClass =
  "mt-2 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-sm text-stone-900 outline-none transition-shadow focus:border-stone-400 focus:ring-2 focus:ring-stone-200";

export function ChangeAdminPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(changeAdminPassword, null as ChangePasswordState);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-[11px] font-medium uppercase tracking-wider text-stone-500"
        >
          Mot de passe actuel
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="newPassword"
          className="block text-[11px] font-medium uppercase tracking-wider text-stone-500"
        >
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-stone-500">Au moins 8 caractères.</p>
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-[11px] font-medium uppercase tracking-wider text-stone-500"
        >
          Confirmer le nouveau mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Mettre à jour le mot de passe"}
      </button>
    </form>
  );
}
