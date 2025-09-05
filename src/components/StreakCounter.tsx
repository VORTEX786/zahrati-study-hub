import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Award, Flame, Trophy } from "lucide-react";

export function StreakCounter() {
  const { user } = useAuth();
  
  const currentStreak = user?.currentStreak || 0;
  const longestStreak = user?.longestStreak || 0;
  const level = user?.level || 1;
  
  const getBadgeForStreak = (streak: number) => {
    if (streak >= 30) return { name: "Diamond", icon: "💎", color: "bg-blue-500" };
    if (streak >= 21) return { name: "Gold", icon: "🥇", color: "bg-yellow-500" };
    if (streak >= 14) return { name: "Silver", icon: "🥈", color: "bg-gray-400" };
    if (streak >= 7) return { name: "Bronze", icon: "🥉", color: "bg-orange-500" };
    return { name: "Starter", icon: "🌱", color: "bg-green-500" };
  };

  const currentBadge = getBadgeForStreak(currentStreak);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Streak */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Current Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            className="text-center"
            animate={{ scale: currentStreak > 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-3xl font-bold text-orange-500 mb-2">
              🔥 {currentStreak}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentStreak === 1 ? "day" : "days"} in a row
            </p>
          </motion.div>
        </CardContent>
      </Card>

      {/* Level & Badge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Level & Badge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3">
            <div className="text-2xl font-bold">Level {level}</div>
            <Badge variant="secondary" className={`${currentBadge.color} text-white`}>
              {currentBadge.icon} {currentBadge.name}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Best Streak */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Best Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">
              👑 {longestStreak}
            </div>
            <p className="text-sm text-muted-foreground">
              Personal record
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
