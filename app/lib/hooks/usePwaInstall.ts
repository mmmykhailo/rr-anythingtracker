import { useEffect } from "react";
import {
  usePwaInstallStore,
  type BeforeInstallPromptEvent,
} from "~/lib/pwa-install-store";

export function usePwaInstall() {
  const setDeferredPrompt = usePwaInstallStore(
    (state) => state.setDeferredPrompt
  );
  const setIOSState = usePwaInstallStore((state) => state.setIOSState);

  useEffect(() => {
    // Detect iOS
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      (!("MSStream" in window) || !window.MSStream);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIOSState(isIOS, isStandalone);

    // Listen for PWA install prompt globally
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("Before install prompt triggered");
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [setDeferredPrompt, setIOSState]);
}
