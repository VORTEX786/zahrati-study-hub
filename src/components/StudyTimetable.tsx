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
  const [dragState, setDragState] = useState<{
    blockId: string;
    startY: number;
    originalStart: number;
    originalEnd: number;
    isResizing: boolean;
    resizeHandle: 'top' | 'bottom' | null;
  } | null>(null);

  // Form states
  const [newBlockForm, setNewBlockForm] = useState({
    kind: "study" as "study" | "break",
    subjectId: "",
    label: "",
    start: "18:00",
    end: "19:00",
  });

  const [newEventForm, setNewEventForm] = useState({
    label: "",
    start: "20:00",
    end: "20:30",
    color: "#8b5cf6",
  });

  const [settingsForm, setSettingsForm] = useState({
    dayStart: "06:30",
    dayEnd: "24:00",
    breakDefaultMinutes: 30,
    rotateLastBlock: true,
    weakSubjectIds: [] as string[],
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
  const createDefaultTimetable = useMutation(api.timetable.createDefaultTimetable);

  // Ensure a default timetable exists (run once when query returns null)
  useEffect(() => {
    if (timetable === null) {
      createDefaultTimetable().catch((err) =>
        toast("Failed to initialize timetable", { description: String(err?.message || err) })
      );
    }
  }, [timetable, createDefaultTimetable]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize settings form when timetable loads
  useState(() => {
    if (timetable) {
      setSettingsForm({
        dayStart: timetable.dayStart,
        dayEnd: timetable.dayEnd,
        breakDefaultMinutes: timetable.breakDefaultMinutes || 30,
        rotateLastBlock: timetable.rotateLastBlock ?? true,
        weakSubjectIds: timetable.weakSubjectIds?.map(id => id) || [],
      });
    }
  });

  const handleAddBlock = async () => {
    if (!timetable) return;

    try {
      let color = "#6b7280";
      let label = newBlockForm.label;

      if (newBlockForm.kind === "study" && newBlockForm.subjectId) {
        const subject = subjects?.find(s => s._id === newBlockForm.subjectId);
        if (subject) {
          color = subject.color;
          label = label || subject.name;
        }
      } else if (newBlockForm.kind === "break") {
        label = label || "Break";
      }

      await createBlock({
        timetableId: timetable._id,
        kind: newBlockForm.kind,
        subjectId: newBlockForm.subjectId ? (newBlockForm.subjectId as Id<"subjects">) : undefined,
        label,
        color,
        start: newBlockForm.start,
        end: newBlockForm.end,
      });

      setShowAddDialog(false);
      setNewBlockForm({
        kind: "study",
        subjectId: "",
        label: "",
        start: "18:00",
        end: "19:00",
      });
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
      });

      setShowEventDialog(false);
      setNewEventForm({
        label: "",
        start: "20:00",
        end: "20:30",
        color: "#8b5cf6",
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

  const handlePointerDown = useCallback((e: React.PointerEvent, blockId: string, isResizing = false, handle: 'top' | 'bottom' | null = null) => {
    if (isPreviewMode) return;

    e.preventDefault();
    e.stopPropagation();

    const block = blocks?.find(b => b._id === blockId);
    if (!block) return;

    setDragState({
      blockId,
      startY: e.clientY,
      originalStart: toMinutes(block.start),
      originalEnd: toMinutes(block.end),
      isResizing,
      resizeHandle: handle,
    });

    setSelectedBlock(blockId);
  }, [blocks, isPreviewMode]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const dayStartMinutes = toMinutes(timetable?.dayStart || "06:30");
    const dayEndMinutes = toMinutes(timetable?.dayEnd || "24:00");
    const totalMinutes = dayEndMinutes - dayStartMinutes;
    const pixelsPerMinute = rect.height / totalMinutes;

    const deltaY = e.clientY - dragState.startY;
    const deltaMinutes = snapTo5Min(deltaY / pixelsPerMinute);

    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;

    if (dragState.isResizing) {
      if (dragState.resizeHandle === 'top') {
        newStart = Math.max(dayStartMinutes, dragState.originalStart + deltaMinutes);
        newStart = Math.min(newStart, dragState.originalEnd - 5); // Minimum 5 minutes
      } else if (dragState.resizeHandle === 'bottom') {
        newEnd = Math.min(dayEndMinutes, dragState.originalEnd + deltaMinutes);
        newEnd = Math.max(newEnd, dragState.originalStart + 5); // Minimum 5 minutes
      }
    } else {
      // Dragging the whole block
      const blockDuration = dragState.originalEnd - dragState.originalStart;
      newStart = Math.max(dayStartMinutes, Math.min(dayEndMinutes - blockDuration, dragState.originalStart + deltaMinutes));
      newEnd = newStart + blockDuration;
    }

    // Update block position optimistically
    const blockElement = document.querySelector(`[data-block-id="${dragState.blockId}"]`) as HTMLElement;
    if (blockElement) {
      const startPercent = ((newStart - dayStartMinutes) / totalMinutes) * 100;
      const endPercent = ((newEnd - dayStartMinutes) / totalMinutes) * 100;
      blockElement.style.top = `${startPercent}%`;
      blockElement.style.height = `${endPercent - startPercent}%`;
    }
  }, [dragState, timetable]);

  const handlePointerUp = useCallback(async () => {
    if (!dragState || !gridRef.current) {
      setDragState(null);
      return;
    }

    const rect = gridRef.current.getBoundingClientRect();
    const dayStartMinutes = toMinutes(timetable?.dayStart || "06:30");
    const dayEndMinutes = toMinutes(timetable?.dayEnd || "24:00");
    const totalMinutes = dayEndMinutes - dayStartMinutes;
    const pixelsPerMinute = rect.height / totalMinutes;

    const blockElement = document.querySelector(`[data-block-id="${dragState.blockId}"]`) as HTMLElement;
    if (!blockElement) {
      setDragState(null);
      return;
    }

    // Calculate final position from element style
    const topPercent = parseFloat(blockElement.style.top) || 0;
    const heightPercent = parseFloat(blockElement.style.height) || 0;
    
    const newStart = dayStartMinutes + (topPercent / 100) * totalMinutes;
    const newEnd = dayStartMinutes + ((topPercent + heightPercent) / 100) * totalMinutes;

    try {
      await updateBlock({
        blockId: dragState.blockId as Id<"timetableBlocks">,
        start: toHHMM(newStart),
        end: toHHMM(newEnd),
      });
    } catch (error) {
      toast("Failed to update block", { description: (error as Error).message });
      // Revert position on error
      const originalBlock = blocks?.find(b => b._id === dragState.blockId);
      if (originalBlock) {
        const startPercent = ((toMinutes(originalBlock.start) - dayStartMinutes) / totalMinutes) * 100;
        const endPercent = ((toMinutes(originalBlock.end) - dayStartMinutes) / totalMinutes) * 100;
        blockElement.style.top = `${startPercent}%`;
        blockElement.style.height = `${endPercent - startPercent}%`;
      }
    }

    setDragState(null);
  }, [dragState, timetable, updateBlock, blocks]);

  // Add global event listeners for drag
  useState(() => {
    const handleMove = (e: PointerEvent) => handlePointerMove(e);
    const handleUp = () => handlePointerUp();

    if (dragState) {
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('pointercancel', handleUp);
    }

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  });

  if (!timetable || !blocks || !subjects) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const dayStartMinutes = toMinutes(timetable.dayStart);
  const dayEndMinutes = toMinutes(timetable.dayEnd);
  const totalMinutes = dayEndMinutes - dayStartMinutes;

  // Generate hour lines
  const hourLines = [];
  for (let minutes = dayStartMinutes; minutes <= dayEndMinutes; minutes += 60) {
    const percent = ((minutes - dayStartMinutes) / totalMinutes) * 100;
    hourLines.push({
      time: toHHMM(minutes),
      percent,
    });
  }

  const displayBlocks = isPreviewMode ? preview : blocks;
  const displayEvents = isPreviewMode ? [] : (fixedEvents || []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Study Timetable</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPreviewMode ? "outline" : "default"}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            >
              {isPreviewMode ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewMode ? "Edit" : "Preview"}
            </Button>
            {!isPreviewMode && (
              <>
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
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-96 border rounded-lg overflow-hidden" ref={gridRef}>
          {/* Hour lines */}
          {hourLines.map((line) => (
            <div
              key={line.time}
              className="absolute left-0 right-0 border-t border-muted-foreground/20 flex items-center"
              style={{ top: `${line.percent}%` }}
            >
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                {line.time}
              </span>
            </div>
          ))}

          {/* Fixed events */}
          {displayEvents.map((event) => {
            const startPercent = ((toMinutes(event.start) - dayStartMinutes) / totalMinutes) * 100;
            const endPercent = ((toMinutes(event.end) - dayStartMinutes) / totalMinutes) * 100;
            const height = endPercent - startPercent;

            return (
              <div
                key={event._id}
                className="absolute left-2 right-2 rounded-md border-2 border-purple-500 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium z-20"
                style={{
                  top: `${startPercent}%`,
                  height: `${height}%`,
                  backgroundColor: event.color ? `${event.color}20` : undefined,
                  borderColor: event.color || "#8b5cf6",
                }}
              >
                <span className="text-center px-2">
                  {event.label}
                  <br />
                  <span className="text-xs opacity-75">
                    {event.start} - {event.end}
                  </span>
                </span>
              </div>
            );
          })}

          {/* Timetable blocks */}
          {displayBlocks?.map((block) => {
            const startPercent = ((toMinutes(block.start) - dayStartMinutes) / totalMinutes) * 100;
            const endPercent = ((toMinutes(block.end) - dayStartMinutes) / totalMinutes) * 100;
            const height = endPercent - startPercent;
            const isSelected = selectedBlock === block._id;

            return (
              <motion.div
                key={block._id}
                data-block-id={block._id}
                className={`absolute left-4 right-4 rounded-lg shadow-sm border-2 flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 z-30" : "z-10"
                } ${!isPreviewMode ? "hover:shadow-md hover:scale-[1.02]" : ""}`}
                style={{
                  top: `${startPercent}%`,
                  height: `${height}%`,
                  backgroundColor: block.color || "#6b7280",
                  borderColor: block.color || "#6b7280",
                  color: "white",
                }}
                onPointerDown={(e) => handlePointerDown(e, block._id)}
                onClick={() => setSelectedBlock(isSelected ? null : block._id)}
                whileHover={!isPreviewMode ? { scale: 1.02 } : {}}
                whileTap={!isPreviewMode ? { scale: 0.98 } : {}}
              >
                {!isPreviewMode && (
                  <>
                    {/* Resize handles */}
                    <div
                      className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 hover:opacity-100 bg-white/20"
                      onPointerDown={(e) => handlePointerDown(e, block._id, true, 'top')}
                    />
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 hover:opacity-100 bg-white/20"
                      onPointerDown={(e) => handlePointerDown(e, block._id, true, 'bottom')}
                    />
                  </>
                )}
                
                <span className="text-center px-2">
                  {block.label}
                  <br />
                  <span className="text-xs opacity-75">
                    {block.start} - {block.end}
                  </span>
                </span>

                {!isPreviewMode && isSelected && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBlock(block._id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Study Block</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newBlockForm.kind}
                  onChange={(e) => setNewBlockForm(prev => ({ ...prev, kind: e.target.value as "study" | "break" }))}
                >
                  <option value="study">Study</option>
                  <option value="break">Break</option>
                </select>
              </div>
              {newBlockForm.kind === "study" && (
                <div>
                  <Label>Subject</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newBlockForm.subjectId}
                    onChange={(e) => setNewBlockForm(prev => ({ ...prev, subjectId: e.target.value }))}
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={newBlockForm.label}
                onChange={(e) => setNewBlockForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Custom label"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newBlockForm.start}
                  onChange={(e) => setNewBlockForm(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newBlockForm.end}
                  onChange={(e) => setNewBlockForm(prev => ({ ...prev, end: e.target.value }))}
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
            <div>
              <Label>Event Name</Label>
              <Input
                value={newEventForm.label}
                onChange={(e) => setNewEventForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Isha Namaz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEventForm.start}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEventForm.end}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={newEventForm.color}
                onChange={(e) => setNewEventForm(prev => ({ ...prev, color: e.target.value }))}
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
    </Card>
  );
}