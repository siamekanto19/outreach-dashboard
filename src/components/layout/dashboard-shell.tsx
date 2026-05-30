import { ReactNode } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="ml-[260px] min-h-screen bg-background">
      <div className="p-8">{children}</div>
    </main>
  );
}
