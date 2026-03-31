"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/lib/content/site";

export type HeaderCategory = { slug: string; title: string };

const MENU_EASE = [0.43, 0.13, 0.23, 0.96] as const;

export function Header({ categories }: { categories: HeaderCategory[] }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(pathname !== "/");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const menuId = useId();
  const menuDuration = reduceMotion ? 0.12 : 0.34;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

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

  const linkDesktop = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-center font-[family-name:var(--font-sans)] text-[8px] font-medium uppercase tracking-[0.12em] transition-opacity sm:text-[9px] md:text-[10px] md:tracking-[0.14em] lg:text-[11px] ${
      active ? "text-[#0a0a0a] opacity-100" : "text-[#0a0a0a] opacity-55 hover:opacity-100"
    }`;

  const headerNode = (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-[#fafafa]/92 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md shadow-[0_8px_28px_rgba(10,10,10,0.05)] transition-[opacity,transform] duration-500 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-5 opacity-0"
      }`}
    >
      <div className="relative mx-auto flex h-14 w-full max-w-[100rem] items-center justify-between gap-x-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] md:grid md:h-16 md:grid-cols-[auto_1fr] md:justify-normal md:gap-x-6 md:px-8 lg:px-10 xl:px-12">
        <button
          type="button"
          className="relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-sm border border-[#0a0a0a]/10 bg-transparent text-[#0a0a0a] transition-[border-color,background-color] hover:border-[#0a0a0a]/22 hover:bg-[#0a0a0a]/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]/25 md:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-haspopup="dialog"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="flex h-[13px] w-[17px] flex-col justify-between" aria-hidden>
            <motion.span
              aria-hidden
              className="h-px w-full bg-current"
              animate={
                menuOpen
                  ? { rotate: 45, y: 6, width: "100%" }
                  : { rotate: 0, y: 0, width: "100%" }
              }
              transition={{ duration: menuDuration, ease: MENU_EASE }}
            />
            <motion.span
              aria-hidden
              className="h-px w-full bg-current"
              animate={menuOpen ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: menuDuration * 0.85, ease: MENU_EASE }}
            />
            <motion.span
              aria-hidden
              className="h-px w-full bg-current"
              animate={
                menuOpen
                  ? { rotate: -45, y: -6, width: "100%" }
                  : { rotate: 0, y: 0, width: "100%" }
              }
              transition={{ duration: menuDuration, ease: MENU_EASE }}
            />
          </span>
        </button>

        <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 md:static md:z-auto md:col-start-1 md:row-start-1 md:translate-x-0 md:translate-y-0">
          <Link
            href="/"
            className="relative flex h-9 w-[min(10rem,42vw)] max-w-[168px] items-center justify-center rounded-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0a0a0a]/25 sm:h-10 md:h-11 md:w-11 md:max-w-none"
            aria-label="La Gazette du Faubourg — Accueil"
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src={site.navbarLogoMobileSrc}
              alt=""
              width={360}
              height={120}
              className="h-full w-full object-contain object-center md:hidden"
              sizes="(max-width:767px) 168px, 1px"
              priority
            />
            <Image
              src={site.navbarLogoSrc}
              alt=""
              width={180}
              height={180}
              className="hidden h-full w-full object-contain md:block"
              sizes="44px"
            />
          </Link>
        </div>

        <div className="h-10 w-10 shrink-0 md:hidden" aria-hidden />

        <nav
          aria-label="Navigation principale"
          className="hidden min-w-0 flex-nowrap items-center justify-center gap-x-2.5 overflow-x-auto overflow-y-hidden py-1 [-ms-overflow-style:auto] [scrollbar-width:thin] md:flex sm:gap-x-3.5 md:col-start-2 md:row-start-1 md:gap-x-4 lg:gap-x-5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <Link
            href="/"
            className={linkDesktop(pathname === "/")}
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
                className={linkDesktop(active)}
                aria-current={active ? "page" : undefined}
              >
                {r.title}
              </Link>
            );
          })}
          <Link
            href="/contact"
            className={linkDesktop(pathname === "/contact")}
            aria-current={pathname === "/contact" ? "page" : undefined}
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );

  const mobileMenuPortal =
    mounted ? (
      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              key="nav-backdrop"
              role="presentation"
              className="fixed inset-0 z-[60] bg-[#0a0a0a]/20 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: menuDuration * 0.85, ease: MENU_EASE }}
              onClick={closeMenu}
            />
            <motion.div
              key="nav-panel"
              id={menuId}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation du site"
              className="fixed inset-y-0 left-0 z-[61] flex w-[min(100%,20.5rem)] flex-col border-r border-[#0a0a0a]/[0.08] bg-[#fafafa]/[0.97] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pt-[env(safe-area-inset-top,0px)] shadow-[16px_0_48px_rgba(10,10,10,0.07)] backdrop-blur-xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: menuDuration, ease: MENU_EASE }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
                <p className="font-[family-name:var(--font-serif)] text-[15px] font-light italic leading-none tracking-[0.02em] text-[#0a0a0a]">
                  Menu
                </p>
                <button
                  type="button"
                  className="font-[family-name:var(--font-sans)] text-[9px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a]/55 transition-colors hover:text-[#0a0a0a]"
                  onClick={closeMenu}
                >
                  Fermer
                </button>
              </div>
              <nav
                className="flex flex-1 flex-col overflow-y-auto px-2 py-2"
                aria-label="Navigation principale — mobile"
              >
                <Link
                  href="/"
                  onClick={closeMenu}
                  className={`border-b border-black/[0.06] py-4 pl-4 pr-3 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.16em] transition-[opacity,border-color] ${
                    pathname === "/"
                      ? "border-l-2 border-l-[#c9a962] pl-[calc(1rem-2px)] text-[#0a0a0a] opacity-100"
                      : "border-l-2 border-l-transparent text-[#0a0a0a] opacity-55 hover:opacity-100"
                  }`}
                  aria-current={pathname === "/" ? "page" : undefined}
                >
                  Accueil
                </Link>
                {categories.map((r) => {
                  const href = `/${r.slug}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={r.slug}
                      href={href}
                      onClick={closeMenu}
                      className={`border-b border-black/[0.06] py-4 pl-4 pr-3 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.16em] transition-[opacity,border-color] ${
                        active
                          ? "border-l-2 border-l-[#c9a962] pl-[calc(1rem-2px)] text-[#0a0a0a] opacity-100"
                          : "border-l-2 border-l-transparent text-[#0a0a0a] opacity-55 hover:opacity-100"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {r.title}
                    </Link>
                  );
                })}
                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className={`border-b border-black/[0.06] py-4 pl-4 pr-3 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.16em] transition-[opacity,border-color] ${
                    pathname === "/contact"
                      ? "border-l-2 border-l-[#c9a962] pl-[calc(1rem-2px)] text-[#0a0a0a] opacity-100"
                      : "border-l-2 border-l-transparent text-[#0a0a0a] opacity-55 hover:opacity-100"
                  }`}
                  aria-current={pathname === "/contact" ? "page" : undefined}
                >
                  Contact
                </Link>
              </nav>
              <div className="shrink-0 border-t border-black/[0.06] px-5 py-4">
                <p className="font-[family-name:var(--font-serif)] text-[11px] font-light italic leading-snug text-[#8a8a8a]">
                  {site.officialTitle}
                </p>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    ) : null;

  if (!mounted) return headerNode;
  return (
    <>
      {createPortal(headerNode, document.body)}
      {createPortal(mobileMenuPortal, document.body)}
    </>
  );
}
