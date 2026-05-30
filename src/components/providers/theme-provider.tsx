/*
 * Global theme provider.
 * Wraps the app with next-themes so client components can read and update the
 * current light, dark, or system theme.
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
