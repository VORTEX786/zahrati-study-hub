import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createLifeGoal = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.optional(v.string()), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("lifeGoals", {
      userId: user._id,
      title: args.title,
      description: args.description,
      targetDate: args.targetDate,
      completed: false,
    });
  },
});

export const updateLifeGoal = mutation({
  args: {
    id: v.id("lifeGoals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== user._id) throw new Error("Not found");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.targetDate !== undefined) patch.targetDate = args.targetDate;

    await ctx.db.patch(args.id, patch);
  },
});

export const toggleComplete = mutation({
  args: {
    id: v.id("lifeGoals"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.id, { completed: args.completed });
  },
});

export const getUserLifeGoals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const goals = await ctx.db
      .query("lifeGoals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort: incomplete first, then by nearest targetDate, then newest created
    return goals.sort((a, b) => {
      const aC = a.completed ? 1 : 0;
      const bC = b.completed ? 1 : 0;
      if (aC !== bC) return aC - bC;
      const aDate = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const bDate = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      if (aDate !== bDate) return aDate - bDate;
      return a._creationTime - b._creationTime;
    });
  },
});
