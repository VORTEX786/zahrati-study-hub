import { DashboardStats } from "@/components/DashboardStats";
import { MotivationSection } from "@/components/MotivationSection";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { StreakCounter } from "@/components/StreakCounter";
import { StudyRatioTracker } from "@/components/StudyRatioTracker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogOut, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function Dashboard() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Add settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Sync state when user data loads
  useEffect(() => {
    if (user) {
      setFocusMinutes(user.focusDuration ?? 25);
      setBreakMinutes(user.breakDuration ?? 5);
    }
  }, [user]);

  const updateSettings = useMutation(api.studySessions.updateUserSettings);

  const handleSaveSettings = async () => {
    try {
      // Basic validation
      const f = Math.max(1, Math.min(180, Math.round(focusMinutes)));
      const b = Math.max(1, Math.min(60, Math.round(breakMinutes)));

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
              
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
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