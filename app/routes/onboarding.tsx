import { useEffect } from "react";
import { Link } from "react-router";
import { Cloud, Shield, Smartphone, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { setOnboardingCompleted } from "~/lib/github-gist-sync";

export function meta() {
  return [
    { title: "Welcome to AnythingTracker" },
    {
      name: "description",
      content:
        "Get started with AnythingTracker - your privacy-first habit tracking app",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function OnboardingPage() {
  useEffect(() => {
    // Mark onboarding as completed when this page is loaded
    setOnboardingCompleted();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to AnythingTracker</h1>
          <p className="text-muted-foreground">
            Your privacy-first habit tracking companion
          </p>
        </div>

        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Optional Cloud Sync
              </div>
              <Badge variant="secondary">Recommended</Badge>
            </CardTitle>
            <CardDescription>
              Backup your data and sync across devices with GitHub Gist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Access your data from any device</span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Your data stays private in your GitHub account</span>
              </div>
              <div className="flex items-start gap-2">
                <Cloud className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Automatic backups prevent data loss</span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button asChild className="w-full">
                <Link
                  replace
                  to="/github-sync-settings"
                  prefetch="viewport"
                  state={{ from: "onboarding" }}
                >
                  <Cloud className="h-4 w-4" />
                  Set up Github Gist Sync
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full text-muted-foreground"
              >
                <Link replace to="/" prefetch="viewport">
                  Fuck off, let me just use it
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You can always enable sync later in Settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
