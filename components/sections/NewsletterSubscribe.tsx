"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";
import { site } from "@/lib/content/site";

const initial: NewsletterState = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-10 w-full max-w-md border border-[#0a0a0a] bg-[#0a0a0a] px-8 py-4 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Envoi…" : "Valider l’inscription"}
    </button>
  );
}

export function NewsletterSubscribe() {
  const [state, formAction] = useActionState(subscribeNewsletter, initial);

  if (state?.ok) {
    return (
      <div className="mx-auto max-w-2xl px-6 md:px-10">
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-sm border border-black/[0.08] bg-white px-8 py-16 text-center shadow-[0_24px_80px_rgba(0,0,0,0.06)] md:px-14 md:py-20"
        >
          <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.32em] text-[#6b6b6b]">
            Enregistrement réussi
          </p>
          <h1
            className="mt-4 font-['Griffiths'] text-[clamp(1.85rem,4vw,2.75rem)] font-normal italic leading-tight tracking-tight text-[#0a0a0a]"
            style={{ fontFamily: "Griffiths, serif" }}
          >
            Merci pour votre confiance
          </h1>
          <p
            className="mx-auto mt-6 max-w-md text-[17px] font-normal leading-[1.65] text-[#3a3a3a] text-pretty"
            style={{ fontFamily: "Garamond, var(--font-serif), Georgia, serif", letterSpacing: "-0.2px" }}
          >
            {state.message}
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] underline decoration-black/25 underline-offset-[6px] hover:decoration-black/55"
          >
            Retour à l’accueil
          </Link>
        </MotionDiv>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 md:px-10">
      <MotionDiv
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
      >
        <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
          Newsletter
        </p>
        <h1
          className="mt-3 max-w-xl text-[clamp(2rem,4.5vw,3.25rem)] font-normal leading-[1.08] tracking-tight text-[#0a0a0a]"
          style={{ fontFamily: "Griffiths, serif" }}
        >
          Recevez nos <span className="italic">dernières actualités</span>
        </h1>
        <p
          className="mt-6 max-w-xl text-[17px] font-normal leading-[1.65] text-[#3a3a3a] text-pretty md:text-[18px] md:leading-[1.6]"
          style={{ fontFamily: "Garamond, var(--font-serif), Georgia, serif", letterSpacing: "-0.2px" }}
        >
          Inscrivez-vous pour recevoir les temps forts du Faubourg, les nouvelles parutions et les événements
          à venir — selon vos centres d’intérêt, par e-mail.
        </p>
      </MotionDiv>

      <form action={formAction} className="mt-14 max-w-xl">
        <div>
          <label
            htmlFor="newsletter-email"
            className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a]"
          >
            Adresse e-mail <span className="text-[#9b2226]">*</span>
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nom@exemple.com"
            className="mt-3 w-full border border-black/[0.12] bg-white px-4 py-3.5 font-[family-name:var(--font-sans)] text-[15px] text-[#0a0a0a] outline-none transition-[border-color,box-shadow] placeholder:text-[#a8a8a8] focus:border-[#0a0a0a]/35 focus:ring-2 focus:ring-[#0a0a0a]/10"
          />
        </div>

        <div className="mt-10 flex gap-3">
          <input
            id="newsletter-consent"
            name="consent"
            type="checkbox"
            value="on"
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-black/25 text-[#0a0a0a] focus:ring-[#0a0a0a]/20"
          />
          <label htmlFor="newsletter-consent" className="cursor-pointer">
            <span
              className="text-[15px] font-normal leading-[1.65] text-[#3a3a3a]"
              style={{ fontFamily: "Garamond, var(--font-serif), Georgia, serif", letterSpacing: "-0.2px" }}
            >
              Je souhaite recevoir les actualités de {site.name}, les nouveautés et les événements en lien avec
              le Faubourg Saint-Honoré, par e-mail, et j’accepte que mes données personnelles soient traitées à
              cette fin. Je peux me désinscrire à tout moment. Pour en savoir plus, consultez le site du{" "}
              <Link
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0a0a0a] underline decoration-black/25 underline-offset-2 hover:decoration-black/55"
              >
                Comité du Faubourg Saint-Honoré
              </Link>
              .
            </span>
          </label>
        </div>

        {state?.ok === false ? (
          <p role="alert" className="mt-6 font-[family-name:var(--font-sans)] text-sm text-[#9b2226]">
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  );
}
