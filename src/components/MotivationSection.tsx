import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Lightbulb, Quote } from "lucide-react";
import { useEffect, useState } from "react";

const motivationalQuotes = [
  {
    text: "The expert in anything was once a beginner.",
    author: "Helen Hayes"
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier"
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson"
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi"
  },
  {
    text: "Education is the most powerful weapon you can use to change the world.",
    author: "Nelson Mandela"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  }
];

const studyTips = [
  "💡 Take a 5-minute break every 25 minutes to maintain focus",
  "🧠 Review your notes within 24 hours to improve retention",
  "🎯 Set specific, measurable goals for each study session",
  "🌱 Create a dedicated study space free from distractions",
  "📚 Use active recall instead of just re-reading notes",
  "⏰ Study during your peak energy hours for better results"
];

export function MotivationSection() {
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);
  const [currentTip, setCurrentTip] = useState(studyTips[0]);

  useEffect(() => {
    // Change quote and tip daily
    const today = new Date().getDate();
    setCurrentQuote(motivationalQuotes[today % motivationalQuotes.length]);
    setCurrentTip(studyTips[today % studyTips.length]);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Daily Quote */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Quote className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div className="space-y-3">
                <blockquote className="text-lg font-medium leading-relaxed">
                  "{currentQuote.text}"
                </blockquote>
                <cite className="text-sm text-muted-foreground font-medium">
                  — {currentQuote.author}
                </cite>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Study Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="h-full bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-accent">Today's Study Tip</h3>
                <p className="text-sm leading-relaxed">
                  {currentTip}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
