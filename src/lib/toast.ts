"use client";

import { toast as sonnerToast } from "sonner";

type ToastMessage = {
  title: string;
  description?: string;
};

function message(input: string | ToastMessage) {
  return typeof input === "string" ? { title: input } : input;
}

export const toast = {
  success(input: string | ToastMessage) {
    const { title, description } = message(input);
    sonnerToast.success(title, { description });
  },
  error(input: string | ToastMessage) {
    const { title, description } = message(input);
    sonnerToast.error(title, { description });
  },
  info(input: string | ToastMessage) {
    const { title, description } = message(input);
    sonnerToast.info(title, { description });
  },
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
  ) {
    return sonnerToast.promise(promise, messages);
  },
};
