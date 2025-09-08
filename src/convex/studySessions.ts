import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createSession = mutation({
  args: {
    duration: v.number(),
    type: v.union(v.literal("focus"), v.literal("break")),
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().split('T')[0];
    
    const sessionId = await ctx.db.insert("studySessions", {
      userId: user._id,
      duration: args.duration,
      type: args.type,
      subject: args.subject,
      notes: args.notes,
      completed: args.completed,
      date: today,
    });

    // Update user's total study time if it's a completed focus session
    if (args.completed && args.type === "focus") {
      const currentTotal = user.totalStudyTime || 0;
      await ctx.db.patch(user._id, {
        totalStudyTime: currentTotal + args.duration,
      });

      // Update daily goal progress
      const dailyGoal = await ctx.db
        .query("dailyGoals")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("date", today))
        .unique();

      if (dailyGoal) {
        await ctx.db.patch(dailyGoal._id, {
          completedSessions: (dailyGoal.completedSessions || 0) + 1,
          completedMinutes: (dailyGoal.completedMinutes || 0) + args.duration,
        });
      }
    }

    return sessionId;
  },
});

export const createManualSession = mutation({
  args: {
    duration: v.number(),
    date: v.string(), // YYYY-MM-DD
    type: v.union(v.literal("focus"), v.literal("break")),
    subject: v.optional(v.string()),
    notes: v.optional(v.string()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("studySessions", {
      userId: user._id,
      duration: args.duration,
      type: args.type,
      subject: args.subject,
      notes: args.notes,
      completed: args.completed,
      date: args.date,
    });

    // Update user's total study time if it's a completed focus session
    if (args.completed && args.type === "focus") {
      const currentTotal = user.totalStudyTime || 0;
      await ctx.db.patch(user._id, {
        totalStudyTime: currentTotal + args.duration,
      });
    }

    // Update daily goal progress only if logging for today
    const todayStr = new Date().toISOString().split("T")[0];
    if (args.date === todayStr && args.completed && args.type === "focus") {
      const dailyGoal = await ctx.db
        .query("dailyGoals")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", user._id).eq("date", todayStr),
        )
        .unique();

      if (dailyGoal) {
        await ctx.db.patch(dailyGoal._id, {
          completedSessions: (dailyGoal.completedSessions || 0) + 1,
          completedMinutes: (dailyGoal.completedMinutes || 0) + args.duration,
        });
      }
    }

    return sessionId;
  },
});

export const getTodaySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];
    
    return await ctx.db
      .query("studySessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("date", today))
      .collect();
  },
});

export const getWeeklyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Use index with range on date; avoid full table filter
    const results = await ctx.db
      .query("studySessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).gte("date", weekAgoStr))
      .collect();

    return results;
  },
});

export const updateUserSettings = mutation({
  args: {
    focusDuration: v.optional(v.number()),
    breakDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const updates: any = {};
    if (args.focusDuration !== undefined) updates.focusDuration = args.focusDuration;
    if (args.breakDuration !== undefined) updates.breakDuration = args.breakDuration;

    await ctx.db.patch(user._id, updates);
  },
});