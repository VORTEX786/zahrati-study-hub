import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Time utility functions
function toMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function toHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function snapTo5Min(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function blocksOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  return s1 < e2 && s2 < e1;
}

export const getOrCreateUserTimetable = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Read-only: just return the first timetable for this user (or null)
    const timetable = await ctx.db
      .query("timetables")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return timetable;
  },
});

// Seed a default timetable and supporting data if the user has none
export const createDefaultTimetable = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // If a timetable already exists, skip seeding
    const existing = await ctx.db
      .query("timetables")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) return existing._id;

    // Create default timetable
    const timetableId = await ctx.db.insert("timetables", {
      userId: user._id,
      title: "My Study Schedule",
      dayStart: "06:30",
      dayEnd: "24:00",
      breakDefaultMinutes: 30,
      rotateLastBlock: true,
      weakSubjectIds: [],
    });

    // Create default subjects if none exist
    const existingSubjects = await ctx.db
      .query("subjects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let mathSubject, physicsSubject, englishSubject;

    if (existingSubjects.length === 0) {
      mathSubject = await ctx.db.insert("subjects", {
        userId: user._id,
        name: "Mathematics",
        color: "#3b82f6",
        totalTime: 0,
      });

      physicsSubject = await ctx.db.insert("subjects", {
        userId: user._id,
        name: "Physics",
        color: "#10b981",
        totalTime: 0,
      });

      englishSubject = await ctx.db.insert("subjects", {
        userId: user._id,
        name: "English",
        color: "#f59e0b",
        totalTime: 0,
      });
    } else {
      mathSubject = existingSubjects[0]?._id;
      physicsSubject = existingSubjects[1]?._id;
      englishSubject = existingSubjects[2]?._id;
    }

    // Create sample blocks
    if (mathSubject) {
      await ctx.db.insert("timetableBlocks", {
        timetableId,
        kind: "study",
        subjectId: mathSubject,
        label: "Mathematics",
        color: "#3b82f6",
        start: "18:30",
        end: "20:00",
      });
    }

    await ctx.db.insert("timetableBlocks", {
      timetableId,
      kind: "break",
      label: "Break",
      color: "#6b7280",
      start: "20:00",
      end: "20:30",
    });

    if (physicsSubject) {
      await ctx.db.insert("timetableBlocks", {
        timetableId,
        kind: "study",
        subjectId: physicsSubject,
        label: "Physics",
        color: "#10b981",
        start: "20:30",
        end: "22:00",
      });
    }

    if (englishSubject) {
      await ctx.db.insert("timetableBlocks", {
        timetableId,
        kind: "study",
        subjectId: englishSubject,
        label: "English",
        color: "#f59e0b",
        start: "22:00",
        end: "23:30",
      });
    }

    // Create default fixed event (Isha Namaz) if user has none
    const existingEvents = await ctx.db
      .query("fixedEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (existingEvents.length === 0) {
      await ctx.db.insert("fixedEvents", {
        userId: user._id,
        label: "Isha Namaz",
        start: "20:00",
        end: "20:15",
        color: "#8b5cf6",
      });
    }

    return timetableId;
  },
});

export const listBlocks = query({
  args: { timetableId: v.id("timetables") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const blocks = await ctx.db
      .query("timetableBlocks")
      .withIndex("by_timetable", (q) => q.eq("timetableId", args.timetableId))
      .collect();

    // Sort by start time
    return blocks.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  },
});

export const listFixedEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const events = await ctx.db
      .query("fixedEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return events.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  },
});

export const previewForToday = query({
  args: { timetableId: v.id("timetables") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const timetable = await ctx.db.get(args.timetableId);
    if (!timetable) throw new Error("Timetable not found");

    const blocks = await ctx.db
      .query("timetableBlocks")
      .withIndex("by_timetable", (q) => q.eq("timetableId", args.timetableId))
      .collect();

    const fixedEvents = await ctx.db
      .query("fixedEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let processedBlocks = [...blocks];

    // Handle rotation logic for last study block
    if (timetable.rotateLastBlock && timetable.weakSubjectIds && timetable.weakSubjectIds.length > 0) {
      const studyBlocks = blocks.filter(b => b.kind === "study");
      if (studyBlocks.length > 0) {
        const lastStudyBlock = studyBlocks[studyBlocks.length - 1];
        
        // Deterministic rotation based on day of year
        const today = new Date();
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
        const rotationIndex = dayOfYear % timetable.weakSubjectIds.length;
        const selectedWeakSubjectId = timetable.weakSubjectIds[rotationIndex];

        // Get subject details
        const weakSubject = await ctx.db.get(selectedWeakSubjectId);
        if (weakSubject) {
          processedBlocks = processedBlocks.map(block => 
            block._id === lastStudyBlock._id 
              ? { ...block, subjectId: selectedWeakSubjectId, label: `${weakSubject.name} (Rotation)`, color: weakSubject.color }
              : block
          );
        }
      }
    }

    // Combine blocks and fixed events
    const allItems = [
      ...processedBlocks.map(block => ({ ...block, type: "block" as const })),
      ...fixedEvents.map(event => ({ ...event, type: "event" as const }))
    ];

    return allItems.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  },
});

export const upsertTimetable = mutation({
  args: {
    timetableId: v.optional(v.id("timetables")),
    title: v.optional(v.string()),
    dayStart: v.optional(v.string()),
    dayEnd: v.optional(v.string()),
    breakDefaultMinutes: v.optional(v.number()),
    rotateLastBlock: v.optional(v.boolean()),
    weakSubjectIds: v.optional(v.array(v.id("subjects"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    if (args.timetableId) {
      const updates: any = {};
      if (args.title !== undefined) updates.title = args.title;
      if (args.dayStart !== undefined) updates.dayStart = args.dayStart;
      if (args.dayEnd !== undefined) updates.dayEnd = args.dayEnd;
      if (args.breakDefaultMinutes !== undefined) updates.breakDefaultMinutes = args.breakDefaultMinutes;
      if (args.rotateLastBlock !== undefined) updates.rotateLastBlock = args.rotateLastBlock;
      if (args.weakSubjectIds !== undefined) updates.weakSubjectIds = args.weakSubjectIds;

      await ctx.db.patch(args.timetableId, updates);
      return args.timetableId;
    } else {
      return await ctx.db.insert("timetables", {
        userId: user._id,
        title: args.title || "My Study Schedule",
        dayStart: args.dayStart || "06:30",
        dayEnd: args.dayEnd || "24:00",
        breakDefaultMinutes: args.breakDefaultMinutes || 30,
        rotateLastBlock: args.rotateLastBlock ?? true,
        weakSubjectIds: args.weakSubjectIds || [],
      });
    }
  },
});

export const createBlock = mutation({
  args: {
    timetableId: v.id("timetables"),
    kind: v.union(v.literal("study"), v.literal("break"), v.literal("fixed")),
    subjectId: v.optional(v.id("subjects")),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
    start: v.string(),
    end: v.string(),
    dayOfWeek: v.optional(
      v.union(
        v.literal("mon"),
        v.literal("tue"),
        v.literal("wed"),
        v.literal("thu"),
        v.literal("fri"),
        v.literal("sat"),
        v.literal("sun"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Snap times to 5-minute increments
    const startMinutes = snapTo5Min(toMinutes(args.start));
    const endMinutes = snapTo5Min(toMinutes(args.end));
    const snappedStart = toHHMM(startMinutes);
    const snappedEnd = toHHMM(endMinutes);

    // Check for overlaps with existing blocks (same timetable & same day if provided)
    const existingBlocks = await ctx.db
      .query("timetableBlocks")
      .withIndex("by_timetable", (q) => q.eq("timetableId", args.timetableId))
      .collect();

    for (const block of existingBlocks) {
      const sameDay =
        args.dayOfWeek === undefined ||
        block.dayOfWeek === undefined ||
        block.dayOfWeek === args.dayOfWeek;
      if (sameDay && blocksOverlap(snappedStart, snappedEnd, block.start, block.end)) {
        throw new Error("Block overlaps with existing block");
      }
    }

    // Get color from subject if not provided
    let color = args.color;
    if (!color && args.subjectId) {
      const subject = await ctx.db.get(args.subjectId);
      color = subject?.color;
    }

    return await ctx.db.insert("timetableBlocks", {
      timetableId: args.timetableId,
      kind: args.kind,
      subjectId: args.subjectId,
      label: args.label,
      color: color || "#6b7280",
      start: snappedStart,
      end: snappedEnd,
      dayOfWeek: args.dayOfWeek,
    });
  },
});

export const updateBlock = mutation({
  args: {
    blockId: v.id("timetableBlocks"),
    subjectId: v.optional(v.id("subjects")),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    dayOfWeek: v.optional(
      v.union(
        v.literal("mon"),
        v.literal("tue"),
        v.literal("wed"),
        v.literal("thu"),
        v.literal("fri"),
        v.literal("sat"),
        v.literal("sun"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block not found");

    const updates: any = {};
    
    if (args.start !== undefined) {
      updates.start = toHHMM(snapTo5Min(toMinutes(args.start)));
    }
    if (args.end !== undefined) {
      updates.end = toHHMM(snapTo5Min(toMinutes(args.end)));
    }

    // Check for overlaps if times are being updated
    if (args.start !== undefined || args.end !== undefined || args.dayOfWeek !== undefined) {
      const newStart = updates.start || block.start;
      const newEnd = updates.end || block.end;
      const newDay = args.dayOfWeek ?? block.dayOfWeek;

      const existingBlocks = await ctx.db
        .query("timetableBlocks")
        .withIndex("by_timetable", (q) => q.eq("timetableId", block.timetableId))
        .collect();

      for (const otherBlock of existingBlocks) {
        if (otherBlock._id !== args.blockId) {
          const sameDay =
            newDay === undefined ||
            otherBlock.dayOfWeek === undefined ||
            otherBlock.dayOfWeek === newDay;
          if (sameDay && blocksOverlap(newStart, newEnd, otherBlock.start, otherBlock.end)) {
            throw new Error("Block would overlap with existing block");
          }
        }
      }
    }

    if (args.subjectId !== undefined) updates.subjectId = args.subjectId;
    if (args.label !== undefined) updates.label = args.label;
    if (args.color !== undefined) updates.color = args.color;
    if (args.dayOfWeek !== undefined) updates.dayOfWeek = args.dayOfWeek;

    // Update color from subject if subject changed
    if (args.subjectId && !args.color) {
      const subject = await ctx.db.get(args.subjectId);
      if (subject) updates.color = subject.color;
    }

    await ctx.db.patch(args.blockId, updates);
  },
});

export const deleteBlock = mutation({
  args: { blockId: v.id("timetableBlocks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.delete(args.blockId);
  },
});

export const upsertFixedEvent = mutation({
  args: {
    eventId: v.optional(v.id("fixedEvents")),
    label: v.string(),
    start: v.string(),
    end: v.string(),
    color: v.optional(v.string()),
    dayOfWeek: v.optional(
      v.union(
        v.literal("mon"),
        v.literal("tue"),
        v.literal("wed"),
        v.literal("thu"),
        v.literal("fri"),
        v.literal("sat"),
        v.literal("sun"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const snappedStart = toHHMM(snapTo5Min(toMinutes(args.start)));
    const snappedEnd = toHHMM(snapTo5Min(toMinutes(args.end)));

    if (args.eventId) {
      await ctx.db.patch(args.eventId, {
        label: args.label,
        start: snappedStart,
        end: snappedEnd,
        color: args.color || "#8b5cf6",
        dayOfWeek: args.dayOfWeek,
      });
      return args.eventId;
    } else {
      return await ctx.db.insert("fixedEvents", {
        userId: user._id,
        label: args.label,
        start: snappedStart,
        end: snappedEnd,
        color: args.color || "#8b5cf6",
        dayOfWeek: args.dayOfWeek,
      });
    }
  },
});

export const deleteFixedEvent = mutation({
  args: { eventId: v.id("fixedEvents") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.delete(args.eventId);
  },
});