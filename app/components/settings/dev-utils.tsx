import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { clearAllData, seedInitialData } from "~/lib/db";
import { Trash2, Database } from "lucide-react";

export function DevUtils() {
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleClearData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all data? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);
      await clearAllData();
      alert("All data cleared successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data. Check console for details.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      await seedInitialData();
      alert("Sample data added successfully. Please refresh the page.");
      window.location.reload();
    } catch (error) {
      console.error("Failed to seed data:", error);
      alert("Failed to seed data. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Developer Utilities
        </CardTitle>
        <CardDescription>
          Development tools for testing and debugging
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={handleClearData}
            disabled={isClearing}
            className="w-full justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? "Clearing..." : "Clear All Data"}
          </Button>
          <Button
            variant="outline"
            onClick={handleSeedData}
            disabled={isSeeding}
            className="w-full justify-start"
          >
            <Database className="h-4 w-4 mr-2" />
            {isSeeding ? "Seeding..." : "Seed Sample Data"}
          </Button>
          <div className="text-xs text-muted-foreground mt-2">
            Clear All Data will permanently delete all trackers and entries.
            Seed Sample Data will add example trackers for testing purposes.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
