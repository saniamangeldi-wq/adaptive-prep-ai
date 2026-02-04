import { Link } from "react-router-dom";
import { GraduationCap, Twitter, Github, Linkedin } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "For Students", href: "#" },
    { label: "For Tutors", href: "#tutors" },
    { label: "For Schools", href: "#schools" },
  ],
  resources: [
    { label: "SAT Tips", href: "#" },
    { label: "Study Guides", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Help Center", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-card border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">AdaptivePrep</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered SAT preparation that adapts to your learning style and helps you achieve your best score.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink icon={Twitter} href="#" />
              <SocialLink icon={Github} href="#" />
              <SocialLink icon={Linkedin} href="#" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AdaptivePrep. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ for students everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon: Icon, href }: { icon: React.ElementType; href: string }) {
  return (
    <a
      href={href}
      className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
