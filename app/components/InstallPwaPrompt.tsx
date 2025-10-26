import { Download, Share, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { usePwaInstallStore } from "~/lib/pwa-install-store";

export function InstallPwaPrompt() {
  const {
    deferredPrompt,
    isDismissed,
    isIOS,
    isIOSDismissed,
    isStandalone,
    install,
    dismiss,
    dismissIOS,
  } = usePwaInstallStore();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  // iOS: Show card if iOS, not in standalone mode, and not dismissed
  const shouldShowIOSCard = isIOS && !isStandalone && !isIOSDismissed;

  // Chrome/Edge: Show card if prompt available and not dismissed
  const shouldShowChromeCard = !isDismissed && deferredPrompt;

  if (!shouldShowIOSCard && !shouldShowChromeCard) {
    return null;
  }

  const handleInstallClick = () => {
    if (shouldShowIOSCard) {
      setShowIOSDialog(true);
    } else {
      install();
    }
  };

  const handleDismiss = () => {
    if (shouldShowIOSCard) {
      dismissIOS();
    } else {
      dismiss();
    }
  };

  return (
    <>
      <Card className="mx-4 mb-4">
        <CardHeader>
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardAction>
          <CardTitle>Install AnythingTracker</CardTitle>
          <CardDescription>
            Install this app on your device for a better experience and quick
            access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleInstallClick} size="sm" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to add AnythingTracker to your home screen:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Tap the <Share className="inline h-4 w-4 mx-1" /> Share button
                  in Safari (at the bottom or top of the screen)
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Scroll down and tap "Add to Home Screen"
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm">Tap "Add" in the top-right corner</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowIOSDialog(false)} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
