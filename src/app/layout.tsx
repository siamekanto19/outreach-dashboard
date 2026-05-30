import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Outreach Dashboard",
  description: "Personalized outreach at scale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <TRPCProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </TRPCProvider>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
