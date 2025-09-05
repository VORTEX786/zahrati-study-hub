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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Add local state for timer customization
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Add visual timetable data
  const weekdays: Array<string> = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timetableSlots: Array<{ time: string; label: string; type: "study" | "event" | "break"; color?: string }> = [
    { time: "6:30 PM – 7:15 PM", label: "English", type: "study", color: "#3b82f6" },
    { time: "7:15 PM – 8:00 PM", label: "Maths", type: "study", color: "#10b981" },
    { time: "8:00 PM – 8:15 PM", label: "Isha Namaz", type: "event", color: "#8b5cf6" }, // highlighted differently
    { time: "8:15 PM – 9:00 PM", label: "BETF", type: "study", color: "#f59e0b" },
    { time: "9:00 PM – 9:30 PM", label: "Break / Snack / Relax", type: "break", color: "#6b7280" }, // clear break highlight
    { time: "9:30 PM – 10:15 PM", label: "CHGCH", type: "study", color: "#ef4444" },
    { time: "10:15 PM – 11:00 PM", label: "PAAHU", type: "study", color: "#22c55e" },
    { time: "11:00 PM – 11:45 PM", label: "Rotate / Weak Subject", type: "study", color: "#14b8a6" },
    { time: "11:45 PM – 12:00 AM", label: "Quick Recap / Plan Next Day", type: "event", color: "#6366f1" },
  ];

  // Add: small helper to clamp and sanitize numeric input
  const clampNumber = (val: unknown, min: number, max: number, fallback: number) => {
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.round(n), min), max);
  };

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

      {/* Ziaul Message Banner - eye-catching */}
      <section className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl p-4 md:p-5 mb-4 md:mb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border shadow-sm"
        >
          <p className="text-center text-lg md:text-xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Study hard .. work hard .. and keep doing your best
            </span>
            <span className="block text-sm md:text-base mt-1 font-semibold text-muted-foreground">
              — Ziaul
            </span>
          </p>
        </motion.div>
      </section>

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

      {/* Visual Weekly Study Timetable (Mon–Fri) */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <Card className="border-0 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-6 text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Weekly Study Timetable</h3>
                <p className="text-sm text-muted-foreground">
                  A clear view of your evening study plan. Special highlights for prayers and breaks.
                </p>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="border-muted">
                      <TableHead className="w-48 text-muted-foreground">Time</TableHead>
                      {weekdays.map((day) => (
                        <TableHead key={day} className="text-center font-semibold">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetableSlots.map((slot, idx) => (
                      <TableRow key={idx} className="border-muted/70">
                        {/* Time column */}
                        <TableCell className="font-medium text-muted-foreground">{slot.time}</TableCell>

                        {/* Monday–Friday cells (same schedule across weekdays) */}
                        {weekdays.map((day) => {
                          const base =
                            slot.type === "study"
                              ? "text-white"
                              : slot.type === "event"
                              ? "text-primary-foreground"
                              : "text-foreground";
                          const bg =
                            slot.type === "study"
                              ? (slot.color ?? "#3b82f6")
                              : slot.type === "event"
                              ? (slot.color ?? "#8b5cf6") + "20"
                              : (slot.color ?? "#6b7280") + "20";
                          const border =
                            slot.type === "break" ? "border border-dashed border-muted-foreground/40" : "border";

                          return (
                            <TableCell key={day} className="p-2">
                              <div
                                className={`rounded-md px-3 py-2 text-xs md:text-sm font-medium shadow-sm ${border}`}
                                style={{
                                  backgroundColor: slot.type === "study" ? slot.color : undefined,
                                  color:
                                    slot.type === "study"
                                      ? "#ffffff"
                                      : "inherit",
                                }}
                              >
                                {slot.type !== "study" && (
                                  <div
                                    className="rounded-md px-2 py-1 text-xs mb-1 inline-block"
                                    style={{
                                      backgroundColor: bg,
                                      borderColor: slot.color ?? "#8b5cf6",
                                      borderWidth: 1,
                                    }}
                                  >
                                    {slot.label}
                                  </div>
                                )}
                                {slot.type === "study" && (
                                  <div className="flex items-center justify-between">
                                    <span className="truncate">{slot.label}</span>
                                    <span className="opacity-80 text-[10px]">Focus</span>
                                  </div>
                                )}
                                {slot.type === "break" && (
                                  <span className="text-xs">{slot.label}</span>
                                )}
                                {slot.type === "event" && (
                                  <span className="text-xs">{slot.label}</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }}></span>
                    Study Session
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded border" style={{ backgroundColor: "#8b5cf620", borderColor: "#8b5cf6" }}></span>
                    Isha Namaz / Event
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded border border-dashed" style={{ backgroundColor: "#6b728020", borderColor: "#9ca3af" }}></span>
                    Break / Snack / Relax
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    aria-invalid={
                      !Number.isFinite(focusMinutes) ||
                      focusMinutes < 1 ||
                      focusMinutes > 180
                    }
                    onBlur={(e) =>
                      setFocusMinutes(
                        clampNumber(e.target.value, 1, 180, 25)
                      )
                    }
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
                    aria-invalid={
                      !Number.isFinite(breakMinutes) ||
                      breakMinutes < 1 ||
                      breakMinutes > 60
                    }
                    onBlur={(e) =>
                      setBreakMinutes(
                        clampNumber(e.target.value, 1, 60, 5)
                      )
                    }
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