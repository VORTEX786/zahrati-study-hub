import { DashboardStats } from "@/components/DashboardStats";
import { MotivationSection } from "@/components/MotivationSection";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { StreakCounter } from "@/components/StreakCounter";
import { StudyRatioTracker } from "@/components/StudyRatioTracker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogOut, Settings, User, Target, BookOpen } from "lucide-react";
import { LifeGoals } from "@/components/LifeGoals";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { StudyInsights } from "@/components/StudyInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Add settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Goal dialog state
  const [goalOpen, setGoalOpen] = useState(false);
  const [targetSessions, setTargetSessions] = useState<number>(4);
  const [targetMinutes, setTargetMinutes] = useState<number>(120);

  // ADD: Countdown state to Oct 27, 2025
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Add: Manual log dialog state and fields
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [logMinutes, setLogMinutes] = useState<number>(25);
  const [logType, setLogType] = useState<"focus" | "break">("focus");
  const [logSubject, setLogSubject] = useState<string>("");
  const [logNotes, setLogNotes] = useState<string>("");

  // ADD: 2025 Fiji Year 13 Certificate Examination Timetable
  const examSchedule: Array<{
    month: string;
    days: Array<{
      date: string;
      exams: Array<{ subject: string; time: string }>;
    }>;
  }> = [
    {
      month: "October",
      days: [
        { date: "Monday, 27 Oct", exams: [{ subject: "English", time: "9:00 am – 12:10 pm" }] },
        { date: "Tuesday, 28 Oct", exams: [{ subject: "Geography", time: "9:00 am – 12:10 pm" }] },
        {
          date: "Wednesday, 29 Oct",
          exams: [
            { subject: "Biology", time: "2:00 pm – 5:10 pm" },
          ],
        },
        {
          date: "Thursday, 30 Oct",
          exams: [
            { subject: "Accounting", time: "9:00 am – 12:10 pm" },
            { subject: "Agriculture", time: "2:00 pm – 5:10 pm" },
          ],
        },
        { date: "Friday, 31 Oct", exams: [{ subject: "Physics", time: "9:00 am – 12:10 pm" }] },
      ],
    },
    {
      month: "November",
      days: [
        {
          date: "Monday, 3 Nov",
          exams: [
            { subject: "Pure Mathematics", time: "9:00 am – 12:10 pm" },
            { subject: "Life Mathematics", time: "2:00 pm – 5:10 pm" },
          ],
        },
        {
          date: "Tuesday, 4 Nov",
          exams: [
            { subject: "Home Economics", time: "9:00 am – 12:10 pm" },
          ],
        },
        {
          date: "Wednesday, 5 Nov",
          exams: [
            { subject: "Computer Studies", time: "9:00 am – 12:10 pm" },
            { subject: "Chemistry", time: "2:00 pm – 5:10 pm" },
          ],
        },
        {
          date: "Thursday, 6 Nov",
          exams: [
            { subject: "Economics", time: "9:00 am – 12:00 pm" },
            { subject: "Technical Drawing (TD)", time: "2:00 pm – 5:10 pm" },
          ],
        },
      ],
    },
  ];

  // Sync state when user data loads
  useEffect(() => {
    const target = new Date("2025-10-27T00:00:00Z").getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load today's goal to prefill fields
  const todayGoal = useQuery(api.dailyGoals.getTodayGoal);
  useEffect(() => {
    if (todayGoal) {
      setTargetSessions(todayGoal.targetSessions ?? 4);
      setTargetMinutes(todayGoal.targetMinutes ?? 120);
    }
  }, [todayGoal]);

  const updateSettings = useMutation(api.studySessions.updateUserSettings);
  const saveGoal = useMutation(api.dailyGoals.createOrUpdateDailyGoal);
  const createManual = useMutation(api.studySessions.createManualSession);

  // Add: static weekly timetable data (Mon–Fri) for visual schedule
  const weekdays: Array<string> = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timetableSlots: Array<{ time: string; label: string; type: "study" | "event" | "break"; color?: string }> = [
    { time: "6:30 PM – 7:15 PM", label: "English", type: "study", color: "#3b82f6" },
    { time: "7:15 PM – 8:00 PM", label: "Maths", type: "study", color: "#10b981" },
    { time: "8:00 PM – 8:15 PM", label: "Isha Namaz", type: "event", color: "#8b5cf6" },
    { time: "8:15 PM – 9:00 PM", label: "BETF", type: "study", color: "#f59e0b" },
    { time: "9:00 PM – 9:30 PM", label: "Break / Snack / Relax", type: "break", color: "#6b7280" },
    { time: "9:30 PM – 10:15 PM", label: "CHGCH", type: "study", color: "#ef4444" },
    { time: "10:15 PM – 11:00 PM", label: "PAAHU", type: "study", color: "#22c55e" },
    { time: "11:00 PM – 11:45 PM", label: "Rotate / Weak Subject", type: "study", color: "#14b8a6" },
    { time: "11:45 PM – 12:00 AM", label: "Quick Recap / Plan Next Day", type: "event", color: "#6366f1" },
  ];

  // ADD: Weekend timetable (Sat–Sun)
  const weekendDays: Array<string> = ["Saturday", "Sunday"];
  const weekendSlots: Array<{ time: string; label: string; type: "study" | "event" | "break"; color?: string }> = [
    { time: "10:00 – 11:00", label: "Maths", type: "study", color: "#10b981" },
    { time: "11:00 – 12:00", label: "English", type: "study", color: "#3b82f6" },
    { time: "12:00 – 1:00", label: "BETF", type: "study", color: "#f59e0b" },
    { time: "1:00 – 2:00", label: "Break / Lunch", type: "break", color: "#6b7280" },
    { time: "2:00 – 3:00", label: "CHGCH", type: "study", color: "#ef4444" },
    { time: "3:00 – 4:00", label: "PAAHU", type: "study", color: "#22c55e" },
    { time: "4:00 – 4:30", label: "Break", type: "break", color: "#9ca3af" },
    { time: "4:30 – 5:30", label: "Maths (Revision)", type: "study", color: "#0ea5e9" },
    { time: "5:30 – 6:30", label: "BETF (Deep Study)", type: "study", color: "#d97706" },
    { time: "6:30 – 7:00", label: "Break / Snack", type: "break", color: "#6b7280" },
    { time: "7:00 – 8:00", label: "English (Essay Practice)", type: "study", color: "#6366f1" },
    { time: "8:00 – 8:15", label: "Isha Namaz", type: "event", color: "#8b5cf6" },
    { time: "8:15 – 9:15", label: "CHGCH (Review)", type: "study", color: "#f43f5e" },
    { time: "9:15 – 9:45", label: "Break / Relax", type: "break", color: "#9ca3af" },
    { time: "9:45 – 10:00", label: "Quick Recap", type: "event", color: "#6366f1" },
  ];

  const handleSaveSettings = async () => {
    try {
      // Validate before saving
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

      // Basic normalization
      const f = Math.round(focusMinutes);
      const b = Math.round(breakMinutes);

      await updateSettings({ focusDuration: f, breakDuration: b });
      toast("Timer settings updated", {
        description: `Focus: ${f} min • Break: ${b} min`,
      });
      setSettingsOpen(false);
    } catch (e) {
      console.error(e);
      toast("Failed to update settings");
    }
  };

  const handleSaveGoal = async () => {
    try {
      const invalidSessions =
        !Number.isFinite(targetSessions) || targetSessions < 1 || targetSessions > 12;
      const invalidMinutes =
        !Number.isFinite(targetMinutes) || targetMinutes < 15 || targetMinutes > 600;

      if (invalidSessions || invalidMinutes) {
        toast("Please fix the highlighted fields", {
          description:
            (invalidSessions ? "Sessions must be between 1 and 12. " : "") +
            (invalidMinutes ? "Minutes must be between 15 and 600." : ""),
        });
        return;
      }

      const s = Math.round(targetSessions);
      const m = Math.round(targetMinutes);
      await saveGoal({ targetSessions: s, targetMinutes: m });
      toast("Daily goal updated", {
        description: `Sessions: ${s} • Minutes: ${m}`,
      });
      setGoalOpen(false);
    } catch (e) {
      console.error(e);
      toast("Failed to update goal");
    }
  };

  const handleSaveManual = async () => {
    try {
      const invalidMinutes = !Number.isFinite(logMinutes) || logMinutes < 1 || logMinutes > 600;
      if (invalidMinutes) {
        toast("Please fix the highlighted fields", {
          description: "Minutes must be between 1 and 600.",
        });
        return;
      }
      const d = String(logDate || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        toast("Please enter a valid date (YYYY-MM-DD).");
        return;
      }

      await createManual({
        duration: Math.round(logMinutes),
        date: d,
        type: logType,
        subject: logSubject.trim() || undefined,
        notes: logNotes.trim() || undefined,
        completed: true,
      });

      toast("Study session logged", {
        description: `${logType === "focus" ? "Focus" : "Break"} • ${Math.round(logMinutes)} min`,
      });

      // reset lightweight fields but keep date for convenience
      setLogMinutes(25);
      setLogType("focus");
      setLogSubject("");
      setLogNotes("");
      setLogOpen(false);
    } catch (e) {
      console.error(e);
      toast("Failed to log session");
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleSessionComplete = () => {
    // Refresh stats or trigger any updates needed
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                  <span className="text-xl font-bold text-white">Z</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Zahrati</h1>
                  <p className="text-sm text-muted-foreground">Study Tracker</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {user.name || user.email || "Student"}
                </span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={() => setGoalOpen(true)}>
                <Target className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)}>
                <BookOpen className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Timer Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="focus">Focus duration (minutes)</Label>
              <Input
                id="focus"
                type="number"
                min={1}
                max={180}
                value={Number.isFinite(focusMinutes) ? focusMinutes : 25}
                onChange={(e) => setFocusMinutes(Number(e.target.value))}
              />
              {/* Inline validation message */}
              {(!Number.isFinite(focusMinutes) || focusMinutes < 1 || focusMinutes > 180) && (
                <span className="text-xs text-red-500">
                  Enter a value between 1 and 180 minutes.
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="break">Break duration (minutes)</Label>
              <Input
                id="break"
                type="number"
                min={1}
                max={60}
                value={Number.isFinite(breakMinutes) ? breakMinutes : 5}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
              />
              {/* Inline validation message */}
              {(!Number.isFinite(breakMinutes) || breakMinutes < 1 || breakMinutes > 60) && (
                <span className="text-xs text-red-500">
                  Enter a value between 1 and 60 minutes.
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={
                !Number.isFinite(focusMinutes) ||
                focusMinutes < 1 ||
                focusMinutes > 180 ||
                !Number.isFinite(breakMinutes) ||
                breakMinutes < 1 ||
                breakMinutes > 60
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Daily Goal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="sessions">Target sessions</Label>
              <Input
                id="sessions"
                type="number"
                min={1}
                max={12}
                value={Number.isFinite(targetSessions) ? targetSessions : 4}
                onChange={(e) => setTargetSessions(Number(e.target.value))}
              />
              {(!Number.isFinite(targetSessions) || targetSessions < 1 || targetSessions > 12) && (
                <span className="text-xs text-red-500">Enter a value between 1 and 12 sessions.</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="minutes">Target minutes</Label>
              <Input
                id="minutes"
                type="number"
                min={15}
                max={600}
                value={Number.isFinite(targetMinutes) ? targetMinutes : 120}
                onChange={(e) => setTargetMinutes(Number(e.target.value))}
              />
              {(!Number.isFinite(targetMinutes) || targetMinutes < 15 || targetMinutes > 600) && (
                <span className="text-xs text-red-500">Enter a value between 15 and 600 minutes.</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveGoal}
              disabled={
                !Number.isFinite(targetSessions) ||
                targetSessions < 1 ||
                targetSessions > 12 ||
                !Number.isFinite(targetMinutes) ||
                targetMinutes < 15 ||
                targetMinutes > 600
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Log Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Past Study</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="logDate">Date</Label>
                <Input
                  id="logDate"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={logType} onValueChange={(v) => setLogType(v as "focus" | "break")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="focus">Focus</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logMinutes">Minutes</Label>
              <Input
                id="logMinutes"
                type="number"
                min={1}
                max={600}
                value={Number.isFinite(logMinutes) ? logMinutes : 25}
                onChange={(e) => setLogMinutes(Number(e.target.value))}
              />
              {(!Number.isFinite(logMinutes) || logMinutes < 1 || logMinutes > 600) && (
                <span className="text-xs text-red-500">Enter a value between 1 and 600 minutes.</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logSubject">Subject (optional)</Label>
              <Input
                id="logSubject"
                placeholder="e.g., Calculus, Biology"
                value={logSubject}
                onChange={(e) => setLogSubject(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logNotes">Notes (optional)</Label>
              <Textarea
                id="logNotes"
                placeholder="What did you study?"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                rows={3}
                className="resize-none"
                maxLength={300}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveManual}
              disabled={
                !Number.isFinite(logMinutes) ||
                logMinutes < 1 ||
                logMinutes > 600 ||
                !logDate
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Ziaul Message Banner - eye-catching */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-xl p-4 md:p-5 -mt-2 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border shadow-sm"
        >
          <p className="text-center text-base md:text-lg font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
              Time is short, and competition is fierce. Push past your limits and trespass into the domain of genius.
            </span>
            <span className="block text-xs md:text-sm mt-1 font-semibold text-muted-foreground">
              — Ziaul
            </span>
          </p>
        </motion.div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center space-y-2"
        >
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.name?.split(' ')[0] || 'Student'}! 👋
          </h2>
          <p className="text-muted-foreground text-lg">
            Ready to make today productive? Let's start studying!
          </p>
        </motion.div>

        {/* Countdown to Oct 27, 2025 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="max-w-3xl mx-auto w-full"
        >
          <Card className="border-0 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Countdown to October 27, 2025
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stay focused — every second counts.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                <div className="rounded-xl p-4 bg-primary/10 border">
                  <div className="text-3xl md:text-4xl font-extrabold">{timeLeft.days}</div>
                  <div className="text-xs mt-1 uppercase tracking-wide text-muted-foreground">Days</div>
                </div>
                <div className="rounded-xl p-4 bg-primary/10 border">
                  <div className="text-3xl md:text-4xl font-extrabold">{timeLeft.hours}</div>
                  <div className="text-xs mt-1 uppercase tracking-wide text-muted-foreground">Hours</div>
                </div>
                <div className="rounded-xl p-4 bg-primary/10 border">
                  <div className="text-3xl md:text-4xl font-extrabold">{timeLeft.minutes}</div>
                  <div className="text-xs mt-1 uppercase tracking-wide text-muted-foreground">Minutes</div>
                </div>
                <div className="rounded-xl p-4 bg-primary/10 border">
                  <div className="text-3xl md:text-4xl font-extrabold">{timeLeft.seconds}</div>
                  <div className="text-xs mt-1 uppercase tracking-wide text-muted-foreground">Seconds</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        {/* End Countdown */}

        {/* 2025 Fiji Year 13 Certificate Examination Timetable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="max-w-6xl mx-auto w-full"
        >
          <Card className="border-0 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-6 text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                  2025 Fiji Year 13 Certificate Examination Timetable
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stay prepared — key exam dates at a glance.
                </p>
              </div>

              <div className="space-y-8">
                {examSchedule.map((section) => (
                  <div key={section.month} className="space-y-3">
                    <h4 className="text-xl font-semibold">{section.month}</h4>
                    <div className="w-full overflow-x-auto">
                      <Table className="min-w-[640px]">
                        <TableHeader>
                          <TableRow className="border-muted">
                            <TableHead className="w-56 text-muted-foreground">Date</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="w-56 text-center">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.days.flatMap((d) =>
                            d.exams.map((exam, idx) => (
                              <TableRow key={`${d.date}-${exam.subject}-${idx}`} className="border-muted/70">
                                <TableCell className="font-medium text-muted-foreground">
                                  {d.date}
                                </TableCell>
                                <TableCell className="font-medium">{exam.subject}</TableCell>
                                <TableCell className="text-center">{exam.time}</TableCell>
                              </TableRow>
                            )),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visual Weekly Study Timetable (Mon–Fri) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="max-w-6xl mx-auto w-full"
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
                        <TableCell className="font-medium text-muted-foreground">{slot.time}</TableCell>

                        {weekdays.map((day) => {
                          const bg =
                            slot.type === "study"
                              ? slot.color ?? "#3b82f6"
                              : slot.type === "event"
                              ? (slot.color ?? "#8b5cf6") + "20"
                              : (slot.color ?? "#6b7280") + "20";
                          const isStudy = slot.type === "study";
                          const isBreak = slot.type === "break";
                          const border = isBreak ? "border border-dashed border-muted-foreground/40" : "border";

                          return (
                            <TableCell key={day} className="p-2">
                              <div
                                className={`rounded-md px-3 py-2 text-xs md:text-sm font-medium shadow-sm ${border}`}
                                style={{
                                  backgroundColor: isStudy ? bg : bg,
                                  color: isStudy ? "#ffffff" : "inherit",
                                  borderColor: !isStudy ? slot.color : undefined,
                                }}
                              >
                                {slot.type !== "study" && (
                                  <div
                                    className="rounded-md px-2 py-1 text-xs mb-1 inline-block"
                                    style={{
                                      backgroundColor: (slot.color ?? "#8b5cf6") + "20",
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
                                {slot.type === "break" && <span className="text-xs">{slot.label}</span>}
                                {slot.type === "event" && <span className="text-xs">{slot.label}</span>}
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
                    <span
                      className="inline-block w-3 h-3 rounded border"
                      style={{ backgroundColor: "#8b5cf620", borderColor: "#8b5cf6" }}
                    ></span>
                    Isha Namaz / Event
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded border border-dashed"
                      style={{ backgroundColor: "#6b728020", borderColor: "#9ca3af" }}
                    ></span>
                    Break / Snack / Relax
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekend Study Timetable (Sat–Sun) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="max-w-6xl mx-auto w-full"
        >
          <Card className="border-0 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-6 text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Weekend Study Timetable</h3>
                <p className="text-sm text-muted-foreground">
                  Plan your Saturdays and Sundays effectively to stay ahead.
                </p>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="border-muted">
                      <TableHead className="w-48 text-muted-foreground">Time</TableHead>
                      {weekendDays.map((day) => (
                        <TableHead key={day} className="text-center font-semibold">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekendSlots.map((slot, idx) => (
                      <TableRow key={idx} className="border-muted/70">
                        <TableCell className="font-medium text-muted-foreground">{slot.time}</TableCell>

                        {weekendDays.map((day) => {
                          const bg =
                            slot.type === "study"
                              ? slot.color ?? "#3b82f6"
                              : slot.type === "event"
                              ? (slot.color ?? "#8b5cf6") + "20"
                              : (slot.color ?? "#6b7280") + "20";
                          const isStudy = slot.type === "study";
                          const isBreak = slot.type === "break";
                          const border = isBreak ? "border border-dashed border-muted-foreground/40" : "border";

                          return (
                            <TableCell key={day} className="p-2">
                              <div
                                className={`rounded-md px-3 py-2 text-xs md:text-sm font-medium shadow-sm ${border}`}
                                style={{
                                  backgroundColor: isStudy ? bg : bg,
                                  color: isStudy ? "#ffffff" : "inherit",
                                  borderColor: !isStudy ? slot.color : undefined,
                                }}
                              >
                                {slot.type !== "study" && (
                                  <div
                                    className="rounded-md px-2 py-1 text-xs mb-1 inline-block"
                                    style={{
                                      backgroundColor: (slot.color ?? "#8b5cf6") + "20",
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
                                {slot.type === "break" && <span className="text-xs">{slot.label}</span>}
                                {slot.type === "event" && <span className="text-xs">{slot.label}</span>}
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
                    <span
                      className="inline-block w-3 h-3 rounded border"
                      style={{ backgroundColor: "#8b5cf620", borderColor: "#8b5cf6" }}
                    ></span>
                    Event
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded border border-dashed"
                      style={{ backgroundColor: "#6b728020", borderColor: "#9ca3af" }}
                    ></span>
                    Break
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dashboard Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <DashboardStats />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Timer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <PomodoroTimer onSessionComplete={handleSessionComplete} />
            {/* Add: Quick access log button below timer */}
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Log past study
              </Button>
            </div>
          </motion.div>

          {/* Right Column - Stats and Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 space-y-6"
          >
            <StudyRatioTracker />
            <StreakCounter />
            {/* Life Goals Card */}
            <LifeGoals />
            {/* Study Insights */}
            <StudyInsights />
          </motion.div>
        </div>

        {/* Motivation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <MotivationSection />
        </motion.div>
      </main>
    </motion.div>
  );
}