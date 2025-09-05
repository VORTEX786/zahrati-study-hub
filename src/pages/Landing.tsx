import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Brain, 
  Clock, 
  Target, 
  TrendingUp, 
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Add local state for timer customization
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Add mutation to save settings if authenticated
  const updateSettings = useMutation(api.studySessions.updateUserSettings);

  const handleSaveTimerPrefs = async () => {
    const invalidFocus =
      !Number.isFinite(focusMinutes) || focusMinutes < 1 || focusMinutes > 180;
    const invalidBreak =
      !Number.isFinite(breakMinutes) || breakMinutes < 1 || breakMinutes > 60;

    if (invalidFocus || invalidBreak) {
      toast("Please fix the highlighted fields", {
        description:
          (invalidFocus ? "Focus must be between 1 and 180 minutes. " : "") +
          (invalidBreak ? "Break must be between 1 and 60 minutes." : ""),
      });
      return;
    }

    if (!isAuthenticated) {
      toast("Sign in to save your preferences", {
        description: "We'll redirect you to continue.",
      });
      navigate("/auth");
      return;
    }

    const f = Math.round(focusMinutes);
    const b = Math.round(breakMinutes);
    try {
      await updateSettings({ focusDuration: f, breakDuration: b });
      toast("Timer settings updated", {
        description: `Focus: ${f} min • Break: ${b} min`,
      });
    } catch (e) {
      console.error(e);
      toast("Failed to update settings");
    }
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const features = [
    {
      icon: Clock,
      title: "Pomodoro Timer",
      description: "25-minute focus sessions with smart break tracking"
    },
    {
      icon: TrendingUp,
      title: "Progress Analytics",
      description: "Detailed insights into your study patterns and growth"
    },
    {
      icon: Target,
      title: "Goal Setting",
      description: "Set daily targets and track your achievements"
    },
    {
      icon: Zap,
      title: "Streak Rewards",
      description: "Build habits with streak counters and achievement badges"
    },
    {
      icon: Brain,
      title: "Study Insights",
      description: "Smart analytics to optimize your learning sessions"
    },
    {
      icon: BookOpen,
      title: "Session Notes",
      description: "Keep track of what you studied in each session"
    }
  ];

  const benefits = [
    "Increase focus with proven Pomodoro technique",
    "Build consistent study habits with streak tracking",
    "Visualize progress with beautiful analytics",
    "Stay motivated with achievements and rewards",
    "Optimize study-to-break ratios for better retention"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5"
    >
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">Z</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Zahrati</h1>
              <p className="text-xs text-muted-foreground">Study Tracker</p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              onClick={handleGetStarted}
              disabled={isLoading}
              variant="outline"
            >
              {isAuthenticated ? "Dashboard" : "Get Started"}
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Master Your Study Sessions
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform your learnig with Zahrati by Ziaul - the modern study tracker that makes productivity rewarding and consistent.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              disabled={isLoading}
              className="text-lg px-8 py-6 rounded-xl"
            >
              {isAuthenticated ? "Go to Dashboard" : "Start Studying Today"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-center mb-12"
        >
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything You Need to Study Smarter
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help you build consistent study habits and track your progress.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-semibold">{feature.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Timer Preferences (Customize Focus & Break) */}
      <section className="container mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-0 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Customize Timer</h3>
                <p className="text-sm text-muted-foreground">
                  Set your preferred focus and break durations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="focusPref">Focus duration (minutes)</Label>
                  <Input
                    id="focusPref"
                    type="number"
                    min={1}
                    max={180}
                    value={Number.isFinite(focusMinutes) ? focusMinutes : 25}
                    onChange={(e) => setFocusMinutes(Number(e.target.value))}
                  />
                  {(!Number.isFinite(focusMinutes) ||
                    focusMinutes < 1 ||
                    focusMinutes > 180) && (
                    <span className="text-xs text-red-500">
                      Enter a value between 1 and 180 minutes.
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="breakPref">Break duration (minutes)</Label>
                  <Input
                    id="breakPref"
                    type="number"
                    min={1}
                    max={60}
                    value={Number.isFinite(breakMinutes) ? breakMinutes : 5}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  />
                  {(!Number.isFinite(breakMinutes) ||
                    breakMinutes < 1 ||
                    breakMinutes > 60) && (
                    <span className="text-xs text-red-500">
                      Enter a value between 1 and 60 minutes.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveTimerPrefs}
                  disabled={
                    !Number.isFinite(focusMinutes) ||
                    focusMinutes < 1 ||
                    focusMinutes > 180 ||
                    !Number.isFinite(breakMinutes) ||
                    breakMinutes < 1 ||
                    breakMinutes > 60 ||
                    isLoading
                  }
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="text-center space-y-8 max-w-3xl mx-auto"
        >
          <div className="space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
              Ready to Transform Your Study Habits?
            </h3>
            <p className="text-lg text-muted-foreground">
              Join Zahrati today and start building the consistent study routine that will help you achieve your academic goals.
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={handleGetStarted}
            disabled={isLoading}
            className="text-lg px-8 py-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {isAuthenticated ? "Continue Studying" : "Get Started"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">Z</span>
              </div>
              <span className="font-semibold">Zahrati Study Tracker</span>
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              Study Tracker by Ziaul • Built with ❤️ for students everywhere
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}