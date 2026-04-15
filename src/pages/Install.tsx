import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Download, Check, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone || installed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-fitflow-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-fitflow-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">You're all set!</h1>
          <p className="text-sm text-foreground/50 mb-6">FitFlow is installed on your device.</p>
          <Link
            to="/"
            className="inline-flex px-6 py-3 rounded-xl bg-fitflow-primary text-white text-sm font-semibold active:scale-95 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="FitFlow" className="w-20 h-20 rounded-2xl mx-auto mb-4" width={80} height={80} />
          <h1 className="text-2xl font-semibold text-foreground mb-2">Install FitFlow</h1>
          <p className="text-sm text-foreground/50">
            Add FitFlow to your home screen for the best experience with push notifications.
          </p>
        </div>

        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full h-14 rounded-xl bg-fitflow-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all mb-4"
          >
            <Download size={18} />
            Install Now
          </button>
        ) : (
          <GlassCard className="mb-4">
            <div className="flex items-start gap-3">
              <Smartphone size={20} className="text-fitflow-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">How to install</p>
                <div className="space-y-2 text-xs text-foreground/50">
                  <p><strong className="text-foreground/70">iPhone:</strong> Tap the Share button → "Add to Home Screen"</p>
                  <p><strong className="text-foreground/70">Android:</strong> Tap the browser menu (⋮) → "Install app" or "Add to Home Screen"</p>
                  <p><strong className="text-foreground/70">Desktop:</strong> Look for the install icon in the address bar</p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        <Link
          to="/"
          className="block text-center text-sm text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
