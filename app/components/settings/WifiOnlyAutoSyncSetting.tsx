import { Wifi, Info } from "lucide-react";
import { useState } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import {
  isNetworkInfoSupported,
  isWifiOnlyAutoSyncEnabled,
  setWifiOnlyAutoSyncEnabled,
} from "~/lib/github-gist-sync/config";

interface WifiOnlyAutoSyncSettingProps {
  onValueChange?: (enabled: boolean) => void;
}

export function WifiOnlyAutoSyncSetting({ onValueChange }: WifiOnlyAutoSyncSettingProps) {
  const [wifiOnlyAutoSync, setWifiOnlyAutoSyncState] = useState(isWifiOnlyAutoSyncEnabled());
  const [showWifiInfo, setShowWifiInfo] = useState(false);

  // Don't render if Network Information API is not supported
  if (!isNetworkInfoSupported()) {
    return null;
  }

  const handleCheckedChange = (checked: boolean) => {
    setWifiOnlyAutoSyncState(checked);
    setWifiOnlyAutoSyncEnabled(checked);
    onValueChange?.(checked);
  };

  return (
    <div className="grid items-center gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="wifiOnlyAutoSync"
          checked={wifiOnlyAutoSync}
          onCheckedChange={handleCheckedChange}
        />
        <Label
          htmlFor="wifiOnlyAutoSync"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Wifi className="h-4 w-4" />
          Auto-sync only on WiFi
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 ml-1"
          onClick={() => setShowWifiInfo(!showWifiInfo)}
        >
          <Info className="h-3 w-3" />
        </Button>
      </div>
      {showWifiInfo && (
        <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
          When enabled, automatic sync will only happen when you're connected
          to WiFi. This helps save mobile data. Manual sync is still possible
          on any connection.
        </div>
      )}
    </div>
  );
}
