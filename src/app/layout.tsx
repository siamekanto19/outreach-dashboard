import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ToastProvider } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
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
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
