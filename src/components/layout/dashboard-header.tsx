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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 sm:pt-0.5 [&_button]:w-full sm:[&_button]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
