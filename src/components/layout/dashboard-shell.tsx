/*
 * Dashboard shell layout wrapper.
 * Provides the base full-height background and layout container for signed-in
 * dashboard pages.
 */
import { ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background pt-14 lg:ml-[260px] lg:pt-0">
      <div className="max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </main>
  );
}
