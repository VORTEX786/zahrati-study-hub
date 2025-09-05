import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock, Coffee } from "lucide-react";

export function StudyRatioTracker() {
  const todaySessions = useQuery(api.studySessions.getTodaySessions);
  
  const focusTime = todaySessions?.filter(s => s.type === "focus" && s.completed)
    .reduce((total, session) => total + session.duration, 0) || 0;
  
  const breakTime = todaySessions?.filter(s => s.type === "break" && s.completed)
    .reduce((total, session) => total + session.duration, 0) || 0;
  
  const totalTime = focusTime + breakTime;
  const focusPercentage = totalTime > 0 ? (focusTime / totalTime) * 100 : 0;
  const breakPercentage = totalTime > 0 ? (breakTime / totalTime) * 100 : 0;

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Study Ratio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Ratio Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              Focus Time
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent"></div>
              Break Time
            </span>
          </div>
          
          <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-500"
              style={{ width: `${focusPercentage}%` }}
            />
            <div 
              className="absolute right-0 top-0 h-full bg-accent transition-all duration-500"
              style={{ width: `${breakPercentage}%` }}
            />
          </div>
        </div>

        {/* Time Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Focus</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatMinutes(focusTime)}
            </div>
          </div>
          
          <div className="text-center p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coffee className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Break</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {formatMinutes(breakTime)}
            </div>
          </div>
        </div>

        {/* Ratio Display */}
        {totalTime > 0 && (
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Study : Break Ratio</p>
            <p className="text-lg font-bold">
              {focusTime} : {breakTime} minutes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
