"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { submitNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { site } from "@/lib/content/site";

const initial: NewsletterState = null;

const titleFontStack = {
  fontFamily: '"Griffiths", "Garamond Italic", Garamond, Georgia, serif',
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-10 block w-full border border-[#0a0a0a] bg-[#0a0a0a] px-8 py-4 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Envoi…" : "Valider"}
    </button>
  );
}

export function NewsletterSubscribeForm() {
  const [state, formAction] = useActionState(submitNewsletter, initial);

  if (state?.ok) {
    return (
      <div className="w-full max-w-2xl text-center">
        <h1
          className="text-[2.25rem] font-normal italic leading-tight text-[#0a0a0a] sm:text-[2.75rem] md:text-[3.25rem]"
          style={titleFontStack}
        >
          Enregistrement réussi&nbsp;!
        </h1>
        <p className="mt-6 font-[family-name:var(--font-sans)] text-[15px] leading-relaxed text-[#5a5a5a]">
          Merci de votre confiance. Vous recevrez bientôt nos actualités.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] underline decoration-black/25 underline-offset-4 transition-opacity hover:opacity-70"
        >
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
        Newsletter
      </p>
      <h1
        className="mt-4 text-[2rem] font-normal leading-[1.1] tracking-tight text-[#0a0a0a] sm:text-[2.5rem] md:text-[3.125rem]"
        style={titleFontStack}
      >
        Recevez nos
        <span className="mt-2 block font-normal italic">dernières actualités</span>
      </h1>

      <p className="mt-10 max-w-2xl font-[family-name:var(--font-sans)] text-[14px] leading-[1.85] text-[#4a4a4a] md:text-[15px]">
        Je souhaite recevoir les temps forts du Faubourg Saint-Honoré, les nouvelles parutions et les
        informations liées à {site.name}, selon mes centres d’intérêt, par courriel ou tout autre canal
        communiqué à la rédaction. J’accepte que mes données personnelles soient traitées à cette fin,
        conformément au règlement général sur la protection des données (RGPD). Je peux me désinscrire à
        tout moment et exercer mes droits en écrivant à{" "}
        <a
          href={`mailto:${site.emailRedaction}`}
          className="text-[#0a0a0a] underline decoration-black/20 underline-offset-[5px] transition-opacity hover:opacity-70"
        >
          {site.emailRedaction}
        </a>
        .
      </p>

      <form action={formAction} className="mt-12">
        {state?.ok === false ? (
          <p
            className="mb-6 border border-red-200 bg-red-50/80 px-4 py-3 font-[family-name:var(--font-sans)] text-sm text-red-900"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        <div className="w-full max-w-md">
          <label htmlFor="newsletter-email" className="sr-only">
            Adresse courriel
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Adresse e-mail"
            className="box-border block w-full border border-black/[0.18] bg-white px-4 py-3.5 font-[family-name:var(--font-sans)] text-[15px] text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none transition-[border-color,box-shadow] focus:border-[#0a0a0a]/55 focus:ring-1 focus:ring-[#0a0a0a]/15"
          />

          <div className="mt-8 flex gap-3">
            <input
              id="newsletter-consent"
              name="consent"
              type="checkbox"
              value="on"
              required
              className="mt-1 h-4 w-4 shrink-0 rounded-sm border-black/25 text-[#0a0a0a] focus:ring-[#0a0a0a]/25"
            />
            <label
              htmlFor="newsletter-consent"
              className="font-[family-name:var(--font-sans)] text-[13px] leading-relaxed text-[#4a4a4a]"
            >
              J’accepte les conditions ci-dessus et souhaite recevoir la newsletter.
            </label>
          </div>

          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
