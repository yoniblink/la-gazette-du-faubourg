"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { submitContact, type ContactState } from "@/app/actions/contact";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";
import { site } from "@/lib/content/site";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-[44px] w-full border border-[#0a0a0a] bg-[#0a0a0a] px-6 py-3.5 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 max-[768px]:px-4"
    >
      {pending ? "Envoi…" : "Envoyer"}
    </button>
  );
}

const initial: ContactState = null;

function MailCard({
  title,
  description,
  email,
}: {
  title: string;
  description: string;
  email: string;
}) {
  const href = `mailto:${email}`;
  return (
    <div className="flex flex-col border border-black/[0.08] bg-[#fafafa] p-8 max-[768px]:p-5 max-[1024px]:p-6">
      <h3 className="font-garamond-italic text-xl font-light text-[#0a0a0a]">{title}</h3>
      <p className="mt-3 flex-1 font-garamond text-sm leading-relaxed text-[#5a5a5a]">
        {description}
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] transition-opacity hover:opacity-60 max-[768px]:py-2"
      >
        Écrire
        <span aria-hidden>↗</span>
      </Link>
    </div>
  );
}

export function Contact() {
  const [state, formAction] = useActionState(submitContact, initial);

  return (
    <section className="flex flex-1 flex-col scroll-mt-24 bg-white py-24 max-[768px]:py-16 max-[1024px]:py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-6 max-[768px]:px-4 md:px-10">
        <div className="grid grid-cols-1 gap-10 min-[1025px]:grid-cols-3 min-[1025px]:gap-8">
          <MotionDiv
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
            className="flex flex-col border border-black/[0.08] bg-[#fafafa] p-8 max-[768px]:p-5 max-[1024px]:p-6"
          >
            <h3 className="font-garamond-italic text-xl font-light text-[#0a0a0a]">
              Contact rédaction
            </h3>
            <p className="mt-3 font-garamond text-sm leading-relaxed text-[#5a5a5a]">
              Suggestions, sources et demandes éditoriales.
            </p>
            <p className="mt-2 font-[family-name:var(--font-sans)] text-xs text-[#8a8a8a]">
              {site.emailRedaction}
            </p>
            {state?.message ? (
              <p
                role="status"
                className={`mt-4 font-[family-name:var(--font-sans)] text-sm ${
                  state.ok ? "text-[#2d6a4f]" : "text-[#9b2226]"
                }`}
              >
                {state.message}
              </p>
            ) : null}
            <form action={formAction} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.22em] text-[#6b6b6b]"
                >
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="mt-2 min-h-[44px] w-full border border-black/[0.12] bg-white px-4 py-3 font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] outline-none transition-[border-color,box-shadow] focus:border-[#0a0a0a]/35 focus:ring-2 focus:ring-[#0a0a0a]/10 max-[768px]:text-base"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.22em] text-[#6b6b6b]"
                >
                  Courriel
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 min-h-[44px] w-full border border-black/[0.12] bg-white px-4 py-3 font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] outline-none transition-[border-color,box-shadow] focus:border-[#0a0a0a]/35 focus:ring-2 focus:ring-[#0a0a0a]/10 max-[768px]:text-base"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.22em] text-[#6b6b6b]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="mt-2 w-full resize-y border border-black/[0.12] bg-white px-4 py-3 font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] outline-none transition-[border-color,box-shadow] focus:border-[#0a0a0a]/35 focus:ring-2 focus:ring-[#0a0a0a]/10"
              />
              </div>
              <SubmitButton />
            </form>
          </MotionDiv>

          <MotionDiv
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
          >
            <MailCard
              title="Contact annonceurs"
              description="Espaces publicitaires et solutions de visibilité auprès d’un lectorat qualifié."
              email={site.emailAnnonceurs}
            />
          </MotionDiv>

          <MotionDiv
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
          >
            <MailCard
              title="Contact partenariats"
              description="Collaborations institutionnelles, opérations spéciales et co-éditions."
              email={site.emailPartenariats}
            />
          </MotionDiv>
        </div>
      </div>
    </section>
  );
}
