"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/lib/content/site";

export type HeaderCategory = { slug: string; title: string };

export function Header({ categories }: { categories: HeaderCategory[] }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(pathname !== "/");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setIsVisible(true);
      return;
    }

    const hero = document.getElementById("intro");
    if (!hero) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      {
        threshold: 0.08,
      },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  const headerNode = (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-[#fafafa]/92 backdrop-blur-md shadow-[0_8px_28px_rgba(10,10,10,0.05)] transition-[opacity,transform] duration-500 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-5 opacity-0"
      }`}
    >
      <div className="mx-auto grid h-14 w-full max-w-[100rem] grid-cols-[auto_1fr] items-center gap-x-4 px-4 md:h-16 md:gap-x-6 md:px-8 lg:gap-x-8 lg:px-10 xl:px-12">
        <div className="flex shrink-0 items-center">
          <Link
            href="/"
            className="relative flex h-9 w-9 items-center justify-center rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0a0a0a]/25 sm:h-10 sm:w-10 md:h-11 md:w-11"
            aria-label="La Gazette du Faubourg — Accueil"
          >
            <Image
              src={site.navbarLogoSrc}
              alt=""
              width={180}
              height={180}
              className="h-full w-full object-contain"
              sizes="44px"
              priority
            />
          </Link>
        </div>

        <nav
          aria-label="Navigation principale"
          className="flex min-w-0 flex-nowrap items-center justify-center gap-x-2.5 overflow-x-auto overflow-y-hidden py-1 [-ms-overflow-style:auto] [scrollbar-width:thin] sm:gap-x-3.5 md:gap-x-4 lg:gap-x-5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <Link
            href="/"
            className={`shrink-0 whitespace-nowrap text-center font-[family-name:var(--font-sans)] text-[8px] font-medium uppercase tracking-[0.12em] transition-opacity sm:text-[9px] md:text-[10px] md:tracking-[0.14em] lg:text-[11px] ${
              pathname === "/"
                ? "text-[#0a0a0a] opacity-100"
                : "text-[#0a0a0a] opacity-55 hover:opacity-100"
            }`}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Accueil
          </Link>
          <span className="shrink-0 px-0.5 text-black/20" aria-hidden>
            |
          </span>
          {categories.map((r) => {
            const href = `/${r.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={r.slug}
                href={href}
                className={`shrink-0 whitespace-nowrap text-center font-[family-name:var(--font-sans)] text-[8px] font-medium uppercase tracking-[0.12em] transition-opacity sm:text-[9px] md:text-[10px] md:tracking-[0.14em] lg:text-[11px] ${
                  active ? "text-[#0a0a0a] opacity-100" : "text-[#0a0a0a] opacity-55 hover:opacity-100"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {r.title}
              </Link>
            );
          })}
          <Link
            href="/contact"
            className={`shrink-0 whitespace-nowrap text-center font-[family-name:var(--font-sans)] text-[8px] font-medium uppercase tracking-[0.12em] transition-opacity sm:text-[9px] md:text-[10px] md:tracking-[0.14em] lg:text-[11px] ${
              pathname === "/contact"
                ? "text-[#0a0a0a] opacity-100"
                : "text-[#0a0a0a] opacity-55 hover:opacity-100"
            }`}
            aria-current={pathname === "/contact" ? "page" : undefined}
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );

  if (!mounted) return headerNode;
  return createPortal(headerNode, document.body);
}
