import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pricing } from "@/components/landing/Pricing";
import { PageSeo } from "@/components/seo/PageSeo";

/** Public pricing page: the pricing section inside a plain page frame. */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSeo
        title="Pricing | AdaptivePrep IELTS Writing checker"
        description="AdaptivePrep plans: a free plan and three paid plans that set your daily credits for IELTS Writing checks and coach chat."
        path="/pricing"
      />
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-semibold text-foreground">
            AdaptivePrep
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Pricing headingLevel="h1" headingText="Pricing" />
      </main>
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Band scores are estimates. AdaptivePrep is not affiliated with or endorsed by the IELTS partners.</p>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
