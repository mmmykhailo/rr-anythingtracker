import { AlertTriangle, Info, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface EncryptionMigrationInfoProps {
  hasExistingData?: boolean;
  isEncryptionEnabled?: boolean;
}

export function EncryptionMigrationInfo({
  hasExistingData = false,
  isEncryptionEnabled = false,
}: EncryptionMigrationInfoProps) {
  if (!hasExistingData) {
    return null;
  }

  return (
    <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          Encryption Migration Notice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {!isEncryptionEnabled ? (
            <>
              <p>
                <strong>
                  Encryption will be disabled when you save the settings:
                </strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Once you disable encryption, new syncs will upload unencrypted
                  data
                </li>
                <li>The unencrypted data will replace your encrypted backup</li>
              </ul>
              <p className="text-muted-foreground">
                <Info className="inline h-3 w-3 mr-1" />
                Tip: Download a local backup before disabling encryption as a
                safety measure.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>
                  Encryption will be enabled when you save the settings:
                </strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All future syncs will use encryption</li>
                <li>To sync on another device, use the same GitHub token</li>
                <li>
                  If you lose your token, you won't be able to decrypt your data
                </li>
              </ul>
              <p className="text-green-600 dark:text-green-400">
                <Shield className="inline h-3 w-3 mr-1" />
                Your data will be protected with AES-256-GCM encryption.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
