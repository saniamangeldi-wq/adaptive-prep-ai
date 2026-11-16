import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const SECTION_LINKS = [
  { href: "#what-you-get", label: "What you get" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="AdaptivePrep home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            {SECTION_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-sm transition-colors hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild className="hidden min-[400px]:inline-flex">
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <Logo markClassName="h-7 w-7" />
          <p className="text-sm text-muted-foreground">
            AdaptivePrep is not affiliated with or endorsed by the IELTS partners. Band scores are estimates.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
            <li><Link to="/login" className="text-muted-foreground hover:text-foreground">Log in</Link></li>
            <li><Link to="/signup" className="text-muted-foreground hover:text-foreground">Sign up</Link></li>
            <li><Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
