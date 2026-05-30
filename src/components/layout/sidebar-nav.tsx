/*
 * Authenticated dashboard sidebar navigation.
 * Shows primary product routes, user identity, theme controls, and sign-out
 * behavior for the dashboard shell.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Package, Users, Send, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Analytics", href: "/dashboard", icon: BarChart3 },
  { label: "Offerings", href: "/dashboard/offerings", icon: Package },
  { label: "Prospects", href: "/dashboard/prospects", icon: Users },
  { label: "Outreach", href: "/dashboard/outreach", icon: Send },
];

type SidebarNavProps = {
  user: {
    name: string;
    email: string;
  };
};

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error({
        title: "Could not sign out",
        description: error.message || "Please try again.",
      });
      return;
    }

    toast.success("Signed out");
    router.push("/signin");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            O
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Outreach
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/50" />
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-xs font-medium">
                {initials || user.email[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
