import { Link } from "react-router";
import {
  BarChart3,
  CheckCircle2,
  Cloud,
  Database,
  Lock,
  Smartphone,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

export function meta() {
  return [
    { title: "AnythingTracker - Track Anything, Achieve Everything" },
    {
      name: "description",
      content:
        "A privacy-first habit and activity tracker. Track water intake, steps, habits, or anything you want. Your data stays on your device with optional encrypted cloud backup.",
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-6">
        <Badge variant="secondary" className="mb-2">
          <Lock className="h-3 w-3 mr-1" />
          Privacy-First Tracking
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
          Track Anything,
          <br />
          Achieve Everything
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Your personal tracking companion for habits, goals, and daily
          activities. Simple, powerful, and completely private.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button asChild size="lg" className="text-base">
            <Link to="/onboarding" prefetch="viewport">
              <Zap className="h-4 w-4" />
              Get Started Free
            </Link>
          </Button>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Features Section */}
      <section className="py-12 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            Everything You Need to Track Your Progress
          </h2>
          <p className="text-muted-foreground">
            Powerful features wrapped in a simple interface
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl mx-auto">
          {/* Feature Cards */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Track Anything You Want
              </CardTitle>
              <CardDescription>
                Water intake, steps, workouts, reading, meditation - if it's
                measurable, you can track it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Numeric trackers with custom units (liters, steps, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Checkbox trackers for yes/no habits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Hierarchical trackers (e.g., Beer → Alcohol → Total Drinks)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Visualize Your Progress
              </CardTitle>
              <CardDescription>
                See your progress at a glance with intuitive week views and detailed statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Week-at-a-glance view for all your trackers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Detailed history and statistics per tracker</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Monthly recap with shareable summaries</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                Local-First Architecture
              </CardTitle>
              <CardDescription>
                Your data lives on your device. No servers, no tracking, no privacy concerns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>All data stored locally in IndexedDB</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Works offline - no internet required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Lightning-fast performance</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-400" />
                Optional Cloud Sync
              </CardTitle>
              <CardDescription>
                Want to sync across devices? Use your own GitHub account for encrypted backups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Sync via GitHub Gist - your data, your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Optional AES-256 encryption for extra security</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Automatic backup and conflict resolution</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-orange-500" />
                Progressive Web App
              </CardTitle>
              <CardDescription>
                Install on any device and use it like a native app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Works on iOS, Android, desktop</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Add to home screen for quick access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Offline support and fast loading</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-500" />
                Smart Features
              </CardTitle>
              <CardDescription>
                Thoughtful features that make tracking effortless
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Quick-add buttons for common values</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Goal tracking with visual indicators</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <span>Add notes and comments to entries</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Screenshots Section */}
      <section className="py-12 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">See It in Action</h2>
          <p className="text-muted-foreground">
            A glimpse into the simple and intuitive interface
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto">
          {/* Screenshot Placeholder 1 */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-center">
              Track Multiple Habits at Once
            </h3>
            <div className="aspect-[9/16] sm:aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <div className="text-center space-y-2">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Screenshot: Main dashboard with week view
                </p>
              </div>
            </div>
          </div>

          {/* Screenshot Placeholder 2 */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-center">
              Quick and Easy Entry Logging
            </h3>
            <div className="aspect-[9/16] sm:aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Screenshot: Log entry interface
                </p>
              </div>
            </div>
          </div>

          {/* Screenshot Placeholder 3 */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-center">
              Detailed Statistics and History
            </h3>
            <div className="aspect-[9/16] sm:aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <div className="text-center space-y-2">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Screenshot: Statistics and history view
                </p>
              </div>
            </div>
          </div>

          {/* Screenshot Placeholder 4 */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-center">
              Monthly Recap Summaries
            </h3>
            <div className="aspect-[9/16] sm:aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <div className="text-center space-y-2">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Screenshot: Monthly recap view
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Privacy & Security Section */}
      <section className="py-12 px-4">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Lock className="h-10 w-10 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Privacy First, Always</CardTitle>
            <CardDescription className="text-base">
              Your data is yours and yours alone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                <span>
                  <strong>No tracking or analytics:</strong> We don't collect any
                  data about you or your usage
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                <span>
                  <strong>Local-first:</strong> All your data lives on your device
                  in your browser's storage
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                <span>
                  <strong>Optional sync:</strong> If you enable GitHub sync, your
                  data goes to YOUR GitHub account, not our servers
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                <span>
                  <strong>Encryption available:</strong> Enable AES-256 encryption
                  for your synced data for extra peace of mind
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 shrink-0" />
                <span>
                  <strong>Open source:</strong> The entire codebase is open for
                  inspection on GitHub
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center space-y-6">
        <h2 className="text-3xl font-bold">Ready to Start Tracking?</h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Join others who are achieving their goals with AnythingTracker
        </p>
        <div className="pt-4">
          <Button asChild size="lg" className="text-base">
            <Link to="/onboarding" prefetch="viewport">
              <Zap className="h-4 w-4" />
              Get Started Free
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-4">
          No signup required • Works offline • Privacy-first
        </p>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border mt-auto">
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Made with care for people who value their privacy
          </p>
        </div>
      </footer>
    </div>
  );
}
