import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_VERSION = Date.now().toString();

export function StaleVersionBanner() {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const savedVersion = localStorage.getItem("app-version");
    if (savedVersion && savedVersion !== APP_VERSION) {
      setIsStale(true);
    }
    localStorage.setItem("app-version", APP_VERSION);
  }, []);

  if (!isStale) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md mx-4 p-6 rounded-2xl border border-destructive/30 bg-card text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">
          Outdated Version Detected
        </h2>
        <p className="text-sm text-muted-foreground">
          You're viewing a cached version of AdaptivePrep that may be broken or outdated.
          Please refresh to load the latest version.
        </p>
        <Button
          variant="hero"
          className="w-full gap-2"
          onClick={() => {
            // Clear caches and hard reload
            if ("caches" in window) {
              caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
              });
            }
            localStorage.setItem("app-version", APP_VERSION);
            window.location.reload();
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </Button>
      </div>
    </div>
  );
}
