import { auth } from "@/auth";
import { ChangeAdminPasswordForm } from "@/components/admin/ChangeAdminPasswordForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  const email = session?.user?.email ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">Réglages</h1>
      <p className="mt-2 text-sm text-stone-500">
        Paramètres globaux du site pourront être ajoutés ici (métadonnées, intégrations).
      </p>

      <section className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
        <h2 className="font-[family-name:var(--font-serif)] text-xl font-light text-stone-900">
          Mot de passe administrateur
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Compte connecté : <span className="font-medium text-stone-800">{email}</span>
        </p>
        <div className="mt-8">
          <ChangeAdminPasswordForm />
        </div>
      </section>
    </div>
  );
}
