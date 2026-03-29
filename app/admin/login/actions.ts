"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

export type LoginState = { error: string } | null;

function toAppPath(maybeUrl: string): string {
  if (maybeUrl.startsWith("/")) return maybeUrl;
  try {
    const u = new URL(maybeUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return "/admin";
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/admin").trim() || "/admin";

  if (!email || !password) {
    return { error: "Renseignez le courriel et le mot de passe." };
  }

  try {
    const next = await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
      redirect: false,
    });

    const url = typeof next === "string" ? next : "";
    const failed =
      !url ||
      url.includes("error=") ||
      url.includes("CredentialsSignin") ||
      url.toLowerCase().includes("error%3d");

    if (failed) {
      return { error: "Identifiants invalides." };
    }

    redirect(toAppPath(url));
  } catch (err) {
    // signIn() en mode serveur (raw) relance CredentialsSignin si authorize() retourne null
    if (err instanceof AuthError) {
      return { error: "Identifiants invalides." };
    }
    throw err;
  }
}
