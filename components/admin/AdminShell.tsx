"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { site } from "@/lib/content/site";

const nav = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/categories", label: "Rubriques" },
  { href: "/admin/media", label: "Médias" },
  { href: "/admin/media-kit", label: "Médiakit" },
  { href: "/admin/instagram-reels", label: "Instagram Reels" },
  { href: "/admin/flipbook", label: "Flipbook" },
  { href: "/admin/settings", label: "Réglages" },
] as const;

function isArticleEditorPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/admin/articles/new") return true;
  return /^\/admin\/articles\/[^/]+\/edit$/.test(pathname);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const editorFullscreen = isArticleEditorPath(pathname);

  if (editorFullscreen) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-[#fafafa]">
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="hidden w-56 shrink-0 border-r border-stone-200 bg-white px-4 py-8 md:flex md:flex-col">
        <div className="px-3">
          <Link
            href="/admin"
            className="relative block h-11 w-full max-w-[11.5rem]"
            aria-label={`${site.name} — administration`}
          >
            <Image
              src={site.navbarLogoMobileSrc}
              alt=""
              fill
              className="object-contain object-left"
              sizes="184px"
              priority
            />
          </Link>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-400">Admin</p>
        </div>
        <div className="mt-10 flex-1">
          <NavLinks />
        </div>
        <div className="mt-auto border-t border-stone-100 pt-4">
          <p className="truncate px-3 text-xs text-stone-500">{userEmail}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-stone-700 hover:bg-stone-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">Admin</span>
          <span className="w-9" />
        </header>
        {open ? (
          <div className="border-b border-stone-200 bg-white px-4 py-4 md:hidden">
            <NavLinks onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="mt-4 w-full rounded-lg py-2 text-left text-sm text-stone-500"
            >
              Déconnexion
            </button>
          </div>
        ) : null}
        <main className="flex-1 px-4 py-8 md:px-10 md:py-12">{children}</main>
      </div>
    </div>
  );
}
