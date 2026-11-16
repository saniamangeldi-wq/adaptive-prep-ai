import { Link, useNavigate } from "react-router-dom";
import { ChevronsUpDown, CreditCard, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function planLabel(planName: string, isTrial: boolean) {
  return isTrial ? "Free trial" : `${planName} plan`;
}

export function UserAvatar({ className }: { className?: string }) {
  const { profile, user } = useAuth();
  const name = profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || profile?.email || user?.email || "";
  const initial = (name.trim()[0] || "?").toUpperCase();
  const src = profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined);
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden="true"
    >
      {initial}
      {src && (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
    </span>
  );
}

/**
 * Bottom of the sidebar: who is signed in, their plan, and the account pages.
 * `compact` shows only the avatar (collapsed sidebar).
 */
export function AccountMenu({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { profile, user, signOut } = useAuth();
  const plan = usePlan();
  const navigate = useNavigate();
  const name = profile?.full_name || (user?.user_metadata?.full_name as string | undefined) || "Your account";
  const email = profile?.email || user?.email || "";
  const label = plan.loading ? " " : planLabel(plan.planName, plan.isTrial);

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? `Account: ${name}` : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-left transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
            compact ? "h-10 w-10 justify-center" : "w-full px-2 py-2",
          )}
        >
          <UserAvatar />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{label}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[min(16rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          {email && <span className="block truncate text-xs text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        {!plan.loading && (
          <div className="px-2 pb-2 text-xs text-muted-foreground">
            <p className="text-foreground">{planLabel(plan.planName, plan.isTrial)}</p>
            {/* The daily allowance, not the balance: profiles.credits_remaining is only
                reset on the first paid call of a new day, so before that it shows
                yesterday's leftover and would be wrong as "left today". */}
            <p>{plan.dailyCredits} credits a day</p>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings" onClick={onNavigate}>
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/billing" onClick={onNavigate}>
            <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
