import { ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="ml-[260px] min-h-screen bg-zinc-50">
      <div className="p-8">{children}</div>
    </main>
  );
}
