import { create } from "zustand";

const DISMISSED_KEY = "pwa-install-prompt-dismissed";
const DISMISSED_IOS_KEY = "pwa-install-prompt-ios-dismissed";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaInstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isDismissed: boolean;
  isIOS: boolean;
  isIOSDismissed: boolean;
  isStandalone: boolean;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setIOSState: (isIOS: boolean, isStandalone: boolean) => void;
  install: () => Promise<void>;
  dismiss: () => void;
  dismissIOS: () => void;
}

export const usePwaInstallStore = create<PwaInstallState>((set, get) => ({
  deferredPrompt: null,
  isDismissed:
    typeof window !== "undefined"
      ? localStorage.getItem(DISMISSED_KEY) === "true"
      : false,
  isIOS: false,
  isIOSDismissed:
    typeof window !== "undefined"
      ? localStorage.getItem(DISMISSED_IOS_KEY) === "true"
      : false,
  isStandalone: false,

  setDeferredPrompt: (prompt) => {
    set({ deferredPrompt: prompt });
  },

  setIOSState: (isIOS, isStandalone) => {
    set({ isIOS, isStandalone });
  },

  install: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      set({ deferredPrompt: null });
    }
  },

  dismiss: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
    set({ isDismissed: true, deferredPrompt: null });
  },

  dismissIOS: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_IOS_KEY, "true");
    }
    set({ isIOSDismissed: true });
  },
}));
