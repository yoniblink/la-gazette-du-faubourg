"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { ZoomableHtmlImages } from "@/components/ui/ZoomableHtmlImages";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ZoomableHtmlImages />
      <Toaster richColors position="top-center" closeButton />
    </SessionProvider>
  );
}
