import { ReactNode } from "react";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function DashboardHeader({
  title,
  description,
  action,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
