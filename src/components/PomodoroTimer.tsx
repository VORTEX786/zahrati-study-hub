import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PomodoroTimerProps {
  onSessionComplete?: () => void;
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  
  const focusDuration = (user?.focusDuration || 25) * 60;
  const breakDuration = (user?.breakDuration || 5) * 60;
  
  const createSession = useMutation(api.studySessions.createSession);

  useEffect(() => {
    setTimeLeft(isBreak ? breakDuration : focusDuration);
  }, [isBreak, focusDuration, breakDuration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const playHooraySound = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      // Ensure context is running (some browsers suspend by default)
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const now = audioCtx.currentTime;
      const master = audioCtx.createGain();
      master.gain.value = 0.05; // keep it subtle
      master.connect(audioCtx.destination);

      // Play a quick arpeggiated major chord (C-E-G) as a "hooray"
      const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(master);

        const start = now + i * 0.06;
        const end = start + 0.25;

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.8, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, end);

        osc.start(start);
        osc.stop(end + 0.01);
      });

      // Quick end sparkle
      const sparkle = audioCtx.createOscillator();
      const sparkleGain = audioCtx.createGain();
      sparkle.type = "triangle";
      sparkle.connect(sparkleGain);
      sparkleGain.connect(master);

      const sStart = now + 0.22;
      const sEnd = sStart + 0.25;
      sparkle.frequency.setValueAtTime(660, sStart);
      sparkle.frequency.exponentialRampToValueAtTime(1320, sEnd);
      sparkleGain.gain.setValueAtTime(0.0001, sStart);
      sparkleGain.gain.linearRampToValueAtTime(0.5, sStart + 0.02);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, sEnd);

      sparkle.start(sStart);
      sparkle.stop(sEnd + 0.01);
    } catch {
      // no-op: sound is optional; ignore failures silently
    }
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    if (!isBreak) {
      // Focus session completed
      setSessionsCompleted(prev => prev + 1);
      
      // Create session record
      await createSession({
        duration: focusDuration / 60,
        type: "focus",
        completed: true,
        subject: subject.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Clear notes for the next session
      setSubject("");
      setNotes("");

      // Show celebration
      toast.success("Great job! 🎉 You finished a focus session!", {
        description: "Time for a well-deserved break!",
        duration: 5000,
      });

      // Play hooray sound
      playHooraySound();

      // Trigger confetti effect
      createConfetti();
      
      onSessionComplete?.();
      
      // Switch to break
      setIsBreak(true);
      setTimeLeft(breakDuration);
    } else {
      // Break completed
      await createSession({
        duration: breakDuration / 60,
        type: "break",
        completed: true,
      });

      toast.success("Break's over! 💪 Ready for another session?");
      
      // Switch back to focus
      setIsBreak(false);
      setTimeLeft(focusDuration);
    }
  };

  const createConfetti = () => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti fixed w-2 h-2 pointer-events-none z-50';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      document.body.appendChild(confetti);
      
      setTimeout(() => {
        document.body.removeChild(confetti);
      }, 3000);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? breakDuration : focusDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((isBreak ? breakDuration : focusDuration) - timeLeft) / (isBreak ? breakDuration : focusDuration) * 100;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">
          {isBreak ? "Break Time 🌱" : "Focus Time 🎯"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Circular Timer Display */}
        <div className="relative flex items-center justify-center">
          <motion.div
            className="relative w-48 h-48 rounded-full border-8 border-muted flex items-center justify-center"
            style={{
              background: `conic-gradient(from 0deg, ${isBreak ? '#10b981' : '#3b82f6'} ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`
            }}
            animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 2, repeat: isRunning ? Infinity : 0 }}
          >
            <div className="w-40 h-40 rounded-full bg-background flex items-center justify-center">
              <span className="text-4xl font-bold font-mono">
                {formatTime(timeLeft)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0:00</span>
            <span>{formatTime(isBreak ? breakDuration : focusDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={toggleTimer}
            size="lg"
            className="w-16 h-16 rounded-full"
            variant={isRunning ? "secondary" : "default"}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          
          <Button
            onClick={resetTimer}
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full"
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>

        {/* Session Counter */}
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < (sessionsCompleted % 4) ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {sessionsCompleted} sessions completed today
          </p>
        </div>

        {/* Session Notes */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <span className="text-sm font-medium">Subject (optional)</span>
              <Input
                placeholder="e.g., Calculus, Biology, Project X"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="grid gap-1 md:col-span-1">
              <span className="text-sm font-medium">Notes (optional)</span>
              <Textarea
                placeholder="What did you focus on this session?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
                maxLength={300}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Notes will be saved automatically when a focus session completes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}