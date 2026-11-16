import { Link } from "react-router-dom";
import { Logo, GoogleIcon } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/** Frame for the sign-in, sign-up and password pages: logo, one calm column, the disclaimer. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link to="/" aria-label="AdaptivePrep home" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-12 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-[25rem]">
          <h1 className="text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        AdaptivePrep is not affiliated with or endorsed by the IELTS partners. Band scores are estimates.
      </footer>
    </div>
  );
}

/** The Google button on the auth pages; the page passes its own handler. */
export function GoogleAuthButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary pl-2 pr-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
        <GoogleIcon className="h-[18px] w-[18px]" />
      </span>
      Continue with Google
    </button>
  );
}

export function OrDivider({ children = "or use your email" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
