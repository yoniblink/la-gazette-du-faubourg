"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ChangePasswordState = { ok: true; message: string } | { error: string } | null;

const MIN_NEW_LENGTH = 8;

export async function changeAdminPassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) {
    return { error: "Remplissez tous les champs." };
  }
  if (next.length < MIN_NEW_LENGTH) {
    return {
      error: `Le nouveau mot de passe doit contenir au moins ${MIN_NEW_LENGTH} caractères.`,
    };
  }
  if (next !== confirm) {
    return { error: "La confirmation ne correspond pas au nouveau mot de passe." };
  }
  if (current === next) {
    return { error: "Le nouveau mot de passe doit être différent de l’actuel." };
  }

  const email = session.user.email.trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    return { error: "Compte introuvable." };
  }

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidatePath("/admin/settings");
  return { ok: true, message: "Mot de passe mis à jour." };
}
