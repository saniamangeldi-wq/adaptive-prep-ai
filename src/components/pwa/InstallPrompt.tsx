import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Copy, Check, ExternalLink } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IOSBrowser = "safari" | "chrome" | "firefox" | "other";

function detectIOSBrowser(): IOSBrowser | null {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (!isIOS) return null;

  // Safari on iOS: no CriOS, no FxiOS, and has Safari in UA
  if (/CriOS/.test(ua)) return "chrome";
  if (/FxiOS/.test(ua)) return "firefox";
  if (/Safari/.test(ua)) return "safari";
  return "other";
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosBrowser, setIOSBrowser] = useState<IOSBrowser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check session storage for dismissal
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    // Detect iOS browser
    const browser = detectIOSBrowser();
    setIOSBrowser(browser);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "true");
    setDismissed(true);
  };

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (dismissed) return null;
  if (sessionStorage.getItem("pwa-install-dismissed")) return null;

  // Android/Chrome install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-fade-in">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 shadow-glow">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Install AdaptivePrep AI</p>
            <p className="text-xs text-muted-foreground">
              Add to your home screen for the best experience
            </p>
          </div>
          <Button size="sm" onClick={handleInstall} className="flex-shrink-0">
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-7 w-7"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // iOS Safari — show step-by-step instructions
  if (iosBrowser === "safari") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-fade-in">
        <div className="glass-card rounded-xl p-4 shadow-glow">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Install AdaptivePrep AI</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-7 w-7"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 pl-[52px]">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
              <p className="text-xs text-muted-foreground">
                Tap the <Share className="inline w-3.5 h-3.5 text-primary -mt-0.5" /> <strong className="text-foreground">Share</strong> button at the bottom of Safari
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
              <p className="text-xs text-muted-foreground">
                Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
              <p className="text-xs text-muted-foreground">
                Tap <strong className="text-foreground">"Add"</strong> to install
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS Chrome/Firefox — prompt to open in Safari
  if (iosBrowser === "chrome" || iosBrowser === "firefox" || iosBrowser === "other") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-fade-in">
        <div className="glass-card rounded-xl p-4 shadow-glow">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Install AdaptivePrep AI</p>
                <p className="text-xs text-muted-foreground">
                  Open in Safari to install as an app
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-7 w-7"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={handleCopyURL}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy URL to open in Safari
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
