import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";

export function DashboardStats() {
  const { user } = useAuth();
  const todayGoal = useQuery(api.dailyGoals.getTodayGoal);
  const todaySessions = useQuery(api.studySessions.getTodaySessions);
  
  const completedSessions = todaySessions?.filter(s => s.type === "focus" && s.completed).length || 0;
  const totalStudyTime = user?.totalStudyTime || 0;
  const currentStreak = user?.currentStreak || 0;
  
  const targetSessions = todayGoal?.targetSessions || 4;
  const sessionProgress = (completedSessions / targetSessions) * 100;

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedSessions}/{targetSessions}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(sessionProgress, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(sessionProgress)}%
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHours(totalStudyTime)}</div>
          <p className="text-xs text-muted-foreground">
            All time progress
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-2">
            🔥 {currentStreak}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentStreak === 1 ? "day" : "days"} in a row
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Study Level</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Level {user?.level || 1}</div>
          <p className="text-xs text-muted-foreground">
            Keep studying to level up!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
