"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const NavigationPendingContext = createContext(false);

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}

function normalizePathname(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function isInternalNavigationClick(e: MouseEvent, currentPathname: string) {
  if (e.defaultPrevented) return false;
  if (e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  const el = e.target as Element | null;
  const a = el?.closest?.("a[href]");
  if (!a) return false;
  if (a.hasAttribute("data-skip-nav-pending")) return false;
  if (a.hasAttribute("download")) return false;
  const target = a.getAttribute("target");
  if (target && target !== "_self") return false;

  const href = a.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (href.startsWith("#")) return false;

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const next = normalizePathname(url.pathname);
  const cur = normalizePathname(currentPathname);
  if (next === cur) return false;

  return true;
}

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useLayoutEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!isInternalNavigationClick(e, pathnameRef.current)) return;
      setPending(true);
    }

    function onPopState() {
      setPending(true);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <NavigationPendingContext.Provider value={pending}>
      {children}
    </NavigationPendingContext.Provider>
  );
}
