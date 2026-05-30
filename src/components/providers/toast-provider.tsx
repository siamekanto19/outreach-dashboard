/*
 * Global toast notification provider.
 * Configures Sonner once so forms, mutations, and async actions can show
 * consistent success and error feedback.
 */
"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
