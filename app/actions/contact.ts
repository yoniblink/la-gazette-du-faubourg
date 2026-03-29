"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nom requis").max(120),
  email: z.string().email("Courriel invalide"),
  message: z.string().min(10, "Message trop court").max(5000),
});

export type ContactState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.name?.[0] ?? first.email?.[0] ?? first.message?.[0] ?? "Vérifiez les champs du formulaire.";
    return { ok: false, message: msg };
  }

  const { name, email, message } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn(
      "[contact] Missing RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL — message not sent.",
    );
    return {
      ok: false,
      message:
        "Le service de messagerie n’est pas configuré. Ajoutez les variables d’environnement sur Vercel (voir .env.example).",
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
      subject: `La Gazette — message de ${name}`,
      html: `<p><strong>Nom :</strong> ${escapeHtml(name)}</p><p><strong>Email :</strong> ${escapeHtml(
        email,
      )}</p><p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[contact] Resend error", res.status, errText);
    return { ok: false, message: "L’envoi a échoué. Réessayez ultérieurement." };
  }

  return { ok: true, message: "Merci. Votre message a bien été envoyé." };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
