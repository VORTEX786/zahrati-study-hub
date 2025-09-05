import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BarChart3, CalendarRange, NotebookText } from "lucide-react";

export function StudyInsights() {
  const weekly = useQuery(api.studySessions.getWeeklyStats);

  if (weekly === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Study Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading insights...</div>
        </CardContent>
      </Card>
    );
  }

  if (weekly.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Study Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No activity in the last 7 days. Start a session to see insights!
          </div>
        </CardContent>
      </Card>
    );
  }

  const focusSessions = weekly.filter(s => s.type === "focus" && s.completed);
  const breakSessions = weekly.filter(s => s.type === "break" && s.completed);
  const totalFocus = focusSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalBreak = breakSessions.reduce((sum, s) => sum + s.duration, 0);
  const focusCount = focusSessions.length;
  const avgFocus = focusCount > 0 ? Math.round(totalFocus / focusCount) : 0;

  // Best day (by total focus minutes)
  const byDay: Record<string, number> = {};
  for (const s of focusSessions) {
    byDay[s.date] = (byDay[s.date] || 0) + s.duration;
  }
  const bestDayEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const bestDay = bestDayEntry ? { date: bestDayEntry[0], minutes: bestDayEntry[1] } : null;

  // Recent notes (latest 5 focus sessions with subject/notes)
  const recentNotes = focusSessions
    .filter(s => s.notes || s.subject)
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5);

  const fmtMin = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Study Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="text-sm text-muted-foreground">Total Focus (7d)</div>
            <div className="text-2xl font-bold text-primary">{fmtMin(totalFocus)}</div>
          </div>
          <div className="p-4 rounded-lg bg-accent/10">
            <div className="text-sm text-muted-foreground">Total Break (7d)</div>
            <div className="text-2xl font-bold text-accent">{fmtMin(totalBreak)}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Avg Focus / Session</div>
            <div className="text-2xl font-bold">{fmtMin(avgFocus)}</div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CalendarRange className="h-4 w-4" />
            Best Focus Day (last 7d)
          </div>
          <div className="text-lg font-semibold">
            {bestDay ? `${bestDay.date} • ${fmtMin(bestDay.minutes)}` : "—"}
          </div>
        </div>

        {recentNotes.length > 0 && (
          <div className="p-4 rounded-lg border bg-card/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <NotebookText className="h-4 w-4" />
              Recent Session Notes
            </div>
            <div className="space-y-3">
              {recentNotes.map((s) => (
                <div key={s._id} className="text-sm">
                  <div className="font-medium">
                    {s.subject || "Focus Session"} <span className="text-muted-foreground">• {s.date}</span>
                  </div>
                  {s.notes && <div className="text-muted-foreground">{s.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
