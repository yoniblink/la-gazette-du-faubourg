"use server";

import { z } from "zod";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
});

export type NewsletterState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  if (formData.get("consent") !== "on") {
    return {
      ok: false,
      message: "Veuillez accepter le traitement de vos données pour vous inscrire.",
    };
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.email?.[0] ?? "Vérifiez votre adresse e-mail.";
    return { ok: false, message: msg };
  }

  const { email } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NEWSLETTER_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      "[newsletter] Missing RESEND_API_KEY, CONTACT_FROM_EMAIL, or NEWSLETTER_TO_EMAIL / CONTACT_TO_EMAIL.",
    );
    return {
      ok: false,
      message:
        "L’inscription n’est pas encore active côté serveur. Écrivez à la rédaction ou réessayez plus tard.",
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
      subject: `Newsletter — nouvelle inscription : ${email}`,
      html: `<p>Nouvelle demande d’abonnement à la newsletter.</p><p><strong>E-mail :</strong> ${escapeHtml(email)}</p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[newsletter] Resend error", res.status, errText);
    return { ok: false, message: "L’envoi a échoué. Réessayez ultérieurement." };
  }

  return {
    ok: true,
    message: "Merci. Votre inscription a bien été enregistrée. Vous recevrez bientôt nos actualités.",
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
