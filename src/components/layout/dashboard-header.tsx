/*
 * Reusable dashboard page header.
 * Displays the page title, optional description, and optional action control
 * used across dashboard sections.
 */
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
