import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Clock, Plus, Settings, Eye, Edit3, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface TimeBlock {
  _id: Id<"timetableBlocks">;
  kind: "study" | "break" | "fixed";
  subjectId?: Id<"subjects">;
  label?: string;
  color?: string;
  start: string;
  end: string;
  locked?: boolean;
}

interface FixedEvent {
  _id: Id<"fixedEvents">;
  label: string;
  start: string;
  end: string;
  color?: string;
}

// Time utility functions
const toMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const toHHMM = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const snapTo5Min = (minutes: number): number => {
  return Math.round(minutes / 5) * 5;
};

export function StudyTimetable() {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
const [editBlockForm, setEditBlockForm] = useState({
  blockId: "" as string,
  subjectId: "" as string,
  label: "",
  start: "18:00",
  end: "19:00",
  dayOfWeek: "mon" as DayKey,
});

  const [newBlockForm, setNewBlockForm] = useState({
    kind: "study" as "study" | "break",
    subjectId: "",
    label: "",
    start: "18:00",
    end: "19:00",
    dayOfWeek: "mon" as DayKey,
  });

  // ADD: inline new subject inputs for quick creation
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("#3b82f6");

  const [newEventForm, setNewEventForm] = useState({
    label: "",
    start: "20:00",
    end: "20:30",
    color: "#8b5cf6",
    dayOfWeek: "mon" as DayKey,
  });

  const [settingsForm, setSettingsForm] = useState({
    dayStart: "06:30",
    dayEnd: "24:00",
    breakDefaultMinutes: 30,
    rotateLastBlock: true,
    weakSubjectIds: [] as Id<"subjects">[],
  });

  // Queries
  const timetable = useQuery(api.timetable.getOrCreateUserTimetable);
  const blocks = useQuery(api.timetable.listBlocks, 
    timetable ? { timetableId: timetable._id } : "skip"
  );
  const fixedEvents = useQuery(api.timetable.listFixedEvents);
  const subjects = useQuery(api.subjects.getUserSubjects);
  const preview = useQuery(api.timetable.previewForToday,
    timetable && isPreviewMode ? { timetableId: timetable._id } : "skip"
  );

  // Mutations
  const createBlock = useMutation(api.timetable.createBlock);
  const updateBlock = useMutation(api.timetable.updateBlock);
  const deleteBlock = useMutation(api.timetable.deleteBlock);
  const upsertTimetable = useMutation(api.timetable.upsertTimetable);
  const upsertFixedEvent = useMutation(api.timetable.upsertFixedEvent);
  const deleteFixedEvent = useMutation(api.timetable.deleteFixedEvent);
  const ensureTimetable = useMutation(api.timetable.createDefaultTimetable);
  // ADD: create subject mutation for inline subject creation
  const createSubject = useMutation(api.subjects.createSubject);

  const gridRef = useRef<HTMLDivElement>(null);

  // Ensure a default timetable exists (runs once if none found)
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (timetable === null && !ensuredRef.current) {
      ensuredRef.current = true;
      ensureTimetable({}).catch((e) =>
        toast("Failed to initialize timetable", { description: (e as Error).message })
      );
    }
  }, [timetable, ensureTimetable]);

  // Initialize settings form when timetable loads
  useEffect(() => {
    if (timetable) {
      setSettingsForm({
        dayStart: timetable.dayStart,
        dayEnd: timetable.dayEnd,
        breakDefaultMinutes: timetable.breakDefaultMinutes || 30,
        rotateLastBlock: timetable.rotateLastBlock ?? true,
        weakSubjectIds: (timetable.weakSubjectIds as Id<"subjects">[]) || [],
      });
    }
  }, [timetable]);

  // Utility: build 45-min slots between timetable.dayStart and dayEnd
  const buildTimeSlots = useCallback((startStr: string, endStr: string) => {
    const start = toMinutes(startStr);
    const end = toMinutes(endStr);
    const slots: Array<{ start: string; end: string }> = [];
    for (let m = start; m < end; m += 45) {
      const s = toHHMM(m);
      const e = toHHMM(Math.min(m + 45, end));
      slots.push({ start: s, end: e });
    }
    return slots;
  }, []);

  const handleStartSession = useCallback((label: string) => {
    toast("Timer started", { description: label });
  }, []);

  const handleAddBlock = async () => {
    if (!timetable) return;

    try {
      let color = "#6b7280";
      let label = newBlockForm.label;

      // Determine subject to use (selected or create new if provided)
      let subjectIdToUse: Id<"subjects"> | undefined = undefined;
      if (newBlockForm.kind === "study") {
        if (newBlockForm.subjectId) {
          subjectIdToUse = newBlockForm.subjectId as unknown as Id<"subjects">;
        } else if (newSubjectName.trim()) {
          // Create a new subject inline
          subjectIdToUse = await createSubject({
            name: newSubjectName.trim(),
            color: newSubjectColor,
          });
        }
      }

      if (newBlockForm.kind === "study") {
        if (subjectIdToUse) {
          const subject = subjects?.find((s) => s._id === subjectIdToUse);
          if (subject) {
            color = subject.color;
            label = label || subject.name;
          } else {
            // Fallback if list hasn't updated yet (newly created subject)
            color = newSubjectColor;
            label = label || newSubjectName.trim();
          }
        }
      } else if (newBlockForm.kind === "break") {
        label = label || "Break";
      }

      await createBlock({
        timetableId: timetable._id,
        kind: newBlockForm.kind,
        subjectId: subjectIdToUse,
        label,
        color,
        start: newBlockForm.start,
        end: newBlockForm.end,
        dayOfWeek: newBlockForm.dayOfWeek,
      });

      setShowAddDialog(false);
      setNewBlockForm({
        kind: "study",
        subjectId: "",
        label: "",
        start: "18:00",
        end: "19:00",
        dayOfWeek: newBlockForm.dayOfWeek,
      });
      // RESET: inline subject inputs
      setNewSubjectName("");
      setNewSubjectColor("#3b82f6");

      toast("Block added successfully");
    } catch (error) {
      toast("Failed to add block", { description: (error as Error).message });
    }
  };

  const handleAddEvent = async () => {
    try {
      await upsertFixedEvent({
        label: newEventForm.label,
        start: newEventForm.start,
        end: newEventForm.end,
        color: newEventForm.color,
        dayOfWeek: newEventForm.dayOfWeek,
      });

      setShowEventDialog(false);
      setNewEventForm({
        label: "",
        start: "20:00",
        end: "20:30",
        color: "#8b5cf6",
        dayOfWeek: "mon",
      });
      toast("Fixed event added successfully");
    } catch (error) {
      toast("Failed to add event", { description: (error as Error).message });
    }
  };

  const handleSaveSettings = async () => {
    if (!timetable) return;

    try {
      await upsertTimetable({
        timetableId: timetable._id,
        dayStart: settingsForm.dayStart,
        dayEnd: settingsForm.dayEnd,
        breakDefaultMinutes: settingsForm.breakDefaultMinutes,
        rotateLastBlock: settingsForm.rotateLastBlock,
        weakSubjectIds: settingsForm.weakSubjectIds as Id<"subjects">[],
      });

      setShowSettingsDialog(false);
      toast("Settings updated successfully");
    } catch (error) {
      toast("Failed to update settings", { description: (error as Error).message });
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await deleteBlock({ blockId: blockId as Id<"timetableBlocks"> });
      setSelectedBlock(null);
      toast("Block deleted successfully");
    } catch (error) {
      toast("Failed to delete block", { description: (error as Error).message });
    }
  };

  const openEditBlock = (block: TimeBlock) => {
    setEditBlockForm({
      blockId: block._id as unknown as string,
      subjectId: (block.subjectId as unknown as string) || "",
      label: block.label || "",
      start: block.start,
      end: block.end,
      dayOfWeek: (block as any).dayOfWeek || "mon",
    });
    setShowEditDialog(true);
  };

  const handleUpdateBlock = async () => {
    try {
      await updateBlock({
        blockId: editBlockForm.blockId as unknown as Id<"timetableBlocks">,
        subjectId: editBlockForm.subjectId
          ? (editBlockForm.subjectId as unknown as Id<"subjects">)
          : undefined,
        label: editBlockForm.label || undefined,
        start: editBlockForm.start,
        end: editBlockForm.end,
        dayOfWeek: editBlockForm.dayOfWeek,
      });
      setShowEditDialog(false);
      toast("Block updated");
    } catch (error) {
      toast("Failed to update block", { description: (error as Error).message });
    }
  };

  if (!timetable || !blocks || !subjects) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Build weekly data
  const days: Array<{ key: DayKey; label: string }> = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
  ];
  const timeSlots = buildTimeSlots(timetable.dayStart, timetable.dayEnd);

  // Helper to get items for a day and slot
  const itemsFor = (day: DayKey, slotStart: string, slotEnd: string) => {
    const slotS = toMinutes(slotStart);
    const slotE = toMinutes(slotEnd);
    const dayBlocks = (blocks || []).filter(
      (b) =>
        (b.dayOfWeek ? b.dayOfWeek === day : false) &&
        toMinutes(b.start) === slotS
    );
    const dayEvents = (fixedEvents || []).filter(
      (e) =>
        (e.dayOfWeek ? e.dayOfWeek === day : true) && // events with no day apply to all
        toMinutes(e.start) === slotS
    );
    return { dayBlocks, dayEvents };
  };

  // Cell click to create a block prefilled with the slot times/day
  const handleCellClick = (day: DayKey, slotStart: string, slotEnd: string) => {
    setNewBlockForm((prev) => ({
      ...prev,
      start: slotStart,
      end: slotEnd,
      dayOfWeek: day,
    }));
    setShowAddDialog(true);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Weekly Study Timetable</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" />
              Block
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEventDialog(true)}>
              <Plus className="h-4 w-4" />
              Event
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid" style={{ gridTemplateColumns: `160px repeat(${days.length}, 1fr)` }}>
              {/* Header row */}
              <div className="p-3 border-b text-sm font-semibold text-muted-foreground">Time</div>
              {days.map((d) => (
                <div key={d.key} className="p-3 border-b text-sm font-semibold">{d.label}</div>
              ))}

              {/* Time rows */}
              {timeSlots.map((slot) => (
                <div key={`${slot.start}-${slot.end}`} className="contents">
                  {/* Time label */}
                  <div className="p-2 border-b text-xs text-muted-foreground">
                    {slot.start} – {slot.end}
                  </div>
                  {/* Day cells */}
                  {days.map((d) => {
                    const { dayBlocks, dayEvents } = itemsFor(d.key, slot.start, slot.end);
                    const hasItem = dayBlocks.length > 0 || dayEvents.length > 0;

                    return (
                      <div
                        key={`${d.key}-${slot.start}`}
                        className={`p-2 border-b border-l relative group ${hasItem ? "bg-secondary/40" : "bg-background"} hover:shadow-sm transition`}
                        onClick={() => handleCellClick(d.key, slot.start, slot.end)}
                      >
                        {/* Blocks */}
                        {dayBlocks.map((b) => (
                          <div
                            key={b._id}
                            className="rounded-md px-2 py-1 text-xs text-white shadow-sm flex items-center justify-between"
                            style={{ backgroundColor: b.color || "#6b7280" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditBlock(b);
                            }}
                          >
                            <span className="truncate">{b.label || "Block"}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-white/90 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSession(b.label || "Study Session");
                                }}
                              >
                                Start
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBlock(b._id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Events */}
                        {dayEvents.map((ev) => (
                          <div
                            key={ev._id}
                            className="rounded-md px-2 py-1 mt-1 text-xs font-medium border"
                            style={{
                              backgroundColor: ev.color ? `${ev.color}20` : undefined,
                              borderColor: ev.color || "#8b5cf6",
                              color: "inherit",
                            }}
                          >
                            <span className="truncate">
                              {ev.label} ({ev.start}–{ev.end})
                            </span>
                          </div>
                        ))}

                        {/* Empty cell hint */}
                        {!hasItem && (
                          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
                            Click to add
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Study Block</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Type</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newBlockForm.kind}
                  onChange={(e) =>
                    setNewBlockForm((prev) => ({ ...prev, kind: e.target.value as "study" | "break" }))
                  }
                >
                  <option value="study">Study</option>
                  <option value="break">Break</option>
                </select>
              </div>
              <div>
                <Label>Day</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newBlockForm.dayOfWeek}
                  onChange={(e) =>
                    setNewBlockForm((prev) => ({ ...prev, dayOfWeek: e.target.value as DayKey }))
                  }
                >
                  <option value="mon">Monday</option>
                  <option value="tue">Tuesday</option>
                  <option value="wed">Wednesday</option>
                  <option value="thu">Thursday</option>
                  <option value="fri">Friday</option>
                  <option value="sat">Saturday</option>
                  <option value="sun">Sunday</option>
                </select>
              </div>
              {newBlockForm.kind === "study" && (
                <div>
                  <Label>Subject</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newBlockForm.subjectId}
                    onChange={(e) => setNewBlockForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>

                  {/* Inline create subject option */}
                  <div className="mt-2 space-y-1.5">
                    <Label>Or add a new subject</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Subject name"
                        className="col-span-2"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                      />
                      <Input
                        type="color"
                        value={newSubjectColor}
                        onChange={(e) => setNewSubjectColor(e.target.value)}
                        title="Subject color"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      If you provide a new subject name, it will be created and used for this block.
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={newBlockForm.label}
                onChange={(e) => setNewBlockForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Custom label"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newBlockForm.start}
                  onChange={(e) => setNewBlockForm((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newBlockForm.end}
                  onChange={(e) => setNewBlockForm((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlock}>Add Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fixed Event</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Name</Label>
                <Input
                  value={newEventForm.label}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Isha Namaz"
                />
              </div>
              <div>
                <Label>Day</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newEventForm.dayOfWeek}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({ ...prev, dayOfWeek: e.target.value as DayKey }))
                  }
                >
                  <option value="mon">Monday</option>
                  <option value="tue">Tuesday</option>
                  <option value="wed">Wednesday</option>
                  <option value="thu">Thursday</option>
                  <option value="fri">Friday</option>
                  <option value="sat">Saturday</option>
                  <option value="sun">Sunday</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEventForm.start}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEventForm.end}
                  onChange={(e) => setNewEventForm((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={newEventForm.color}
                onChange={(e) => setNewEventForm((prev) => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Timetable Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day Start</Label>
                <Input
                  type="time"
                  value={settingsForm.dayStart}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, dayStart: e.target.value }))}
                />
              </div>
              <div>
                <Label>Day End</Label>
                <Input
                  type="time"
                  value={settingsForm.dayEnd}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, dayEnd: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Default Break Length (minutes)</Label>
              <Input
                type="number"
                min="5"
                max="120"
                value={settingsForm.breakDefaultMinutes}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, breakDefaultMinutes: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rotateLastBlock"
                checked={settingsForm.rotateLastBlock}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, rotateLastBlock: e.target.checked }))}
              />
              <Label htmlFor="rotateLastBlock">Rotate last block for weak subjects</Label>
            </div>
            {settingsForm.rotateLastBlock && (
              <div>
                <Label>Weak Subjects (for rotation)</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {subjects.map((subject) => (
                    <div key={subject._id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`weak-${subject._id}`}
                        checked={settingsForm.weakSubjectIds.includes(subject._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettingsForm(prev => ({
                              ...prev,
                              weakSubjectIds: [...prev.weakSubjectIds, subject._id]
                            }));
                          } else {
                            setSettingsForm(prev => ({
                              ...prev,
                              weakSubjectIds: prev.weakSubjectIds.filter(id => id !== subject._id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`weak-${subject._id}`} className="text-sm">
                        {subject.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Block Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Day</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={editBlockForm.dayOfWeek}
                  onChange={(e) =>
                    setEditBlockForm((prev) => ({ ...prev, dayOfWeek: e.target.value as DayKey }))
                  }
                >
                  <option value="mon">Monday</option>
                  <option value="tue">Tuesday</option>
                  <option value="wed">Wednesday</option>
                  <option value="thu">Thursday</option>
                  <option value="fri">Friday</option>
                  <option value="sat">Saturday</option>
                  <option value="sun">Sunday</option>
                </select>
              </div>
              {/* Subject only shown for study blocks. We infer by presence of subjectId or allow clear */}
              <div className="col-span-2">
                <Label>Subject (leave empty for Break)</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={editBlockForm.subjectId}
                  onChange={(e) => setEditBlockForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                >
                  <option value="">None (Break)</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id as unknown as string}>
                      {subject.name}
                    </option>
                  ))}
                </select>

                {/* Inline create subject option */}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="New subject name"
                    className="col-span-2"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                  <Input
                    type="color"
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                    title="Subject color"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        if (!newSubjectName.trim()) {
                          toast("Enter a subject name first");
                          return;
                        }
                        const sid = await createSubject({
                          name: newSubjectName.trim(),
                          color: newSubjectColor,
                        });
                        setEditBlockForm((prev) => ({
                          ...prev,
                          subjectId: sid as unknown as string,
                        }));
                        setNewSubjectName("");
                        toast("Subject created");
                      } catch (e) {
                        toast("Failed to create subject", { description: (e as Error).message });
                      }
                    }}
                  >
                    Add Subject
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditBlockForm((prev) => ({ ...prev, subjectId: "" }))}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Label (optional)</Label>
              <Input
                value={editBlockForm.label}
                onChange={(e) => setEditBlockForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Custom label"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editBlockForm.start}
                  onChange={(e) => setEditBlockForm((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editBlockForm.end}
                  onChange={(e) => setEditBlockForm((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteBlock({ blockId: editBlockForm.blockId as unknown as Id<"timetableBlocks"> });
                  setShowEditDialog(false);
                  toast("Block deleted");
                } catch (e) {
                  toast("Failed to delete block", { description: (e as Error).message });
                }
              }}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBlock}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}