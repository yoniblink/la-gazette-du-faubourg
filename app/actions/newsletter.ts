"use server";

import { z } from "zod";

const schema = z.object({
  email: z.string().email("Adresse courriel invalide"),
  consent: z.literal("on"),
});

export type NewsletterState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

export async function submitNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    const err = parsed.error.flatten().fieldErrors;
    const msg =
      err.email?.[0] ??
      err.consent?.[0] ??
      "Veuillez remplir une adresse valide et accepter les conditions.";
    return { ok: false, message: msg };
  }

  const { email } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      "[newsletter] Missing RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL — inscription non transmise.",
    );
    return {
      ok: false,
      message:
        "Le service d’inscription n’est pas configuré. Contactez la rédaction ou réessayez plus tard.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `La Gazette — inscription newsletter`,
      html: `<p>Nouvelle demande d’inscription à la newsletter.</p><p><strong>Email :</strong> ${escapeHtml(
        email,
      )}</p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[newsletter] Resend error", res.status, errText);
    return { ok: false, message: "L’envoi a échoué. Réessayez ultérieurement." };
  }

  return { ok: true, message: "Enregistrement réussi." };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
