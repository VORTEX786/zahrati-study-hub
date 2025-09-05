import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function LifeGoals() {
  const goals = useQuery(api.lifeGoals.getUserLifeGoals);
  const createGoal = useMutation(api.lifeGoals.createLifeGoal);
  const toggleComplete = useMutation(api.lifeGoals.toggleComplete);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (trimmed.length < 3) {
      toast("Please enter a longer title", { description: "At least 3 characters." });
      return;
    }
    try {
      await createGoal({
        title: trimmed,
        description: description.trim() || undefined,
        targetDate: targetDate || undefined,
      });
      toast("Life goal added", { description: trimmed });
      setOpen(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
    } catch (e) {
      console.error(e);
      toast("Failed to add life goal");
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      await toggleComplete({ id: id as any, completed });
      if (completed) {
        toast.success("Goal completed! 🎉");
      }
    } catch (e) {
      console.error(e);
      toast("Could not update goal");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Life Goals
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals === undefined ? (
          <div className="text-sm text-muted-foreground">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No life goals yet. Add your first long-term goal!
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <motion.div
                key={g._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
              >
                <Checkbox
                  checked={!!g.completed}
                  onCheckedChange={(v) => handleToggle(g._id, !!v)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">
                    {g.completed ? <s>{g.title}</s> : g.title}
                  </div>
                  {g.description && (
                    <div className="text-sm text-muted-foreground">
                      {g.completed ? <s>{g.description}</s> : g.description}
                    </div>
                  )}
                  {g.targetDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Target: {g.targetDate}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Life Goal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="lg-title">Title</Label>
              <Input
                id="lg-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Get an A in Calculus"
                maxLength={120}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lg-desc">Description (optional)</Label>
              <Input
                id="lg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short details to keep you focused"
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lg-date">Target date (optional)</Label>
              <Input
                id="lg-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={title.trim().length < 3}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
