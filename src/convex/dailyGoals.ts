import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createOrUpdateDailyGoal = mutation({
  args: {
    targetSessions: v.number(),
    targetMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const today = new Date().toISOString().split('T')[0];
    
    const existingGoal = await ctx.db
      .query("dailyGoals")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("date", today))
      .unique();

    if (existingGoal) {
      await ctx.db.patch(existingGoal._id, {
        targetSessions: args.targetSessions,
        targetMinutes: args.targetMinutes,
      });
      return existingGoal._id;
    } else {
      return await ctx.db.insert("dailyGoals", {
        userId: user._id,
        date: today,
        targetSessions: args.targetSessions,
        targetMinutes: args.targetMinutes,
        completedSessions: 0,
        completedMinutes: 0,
      });
    }
  },
});

export const getTodayGoal = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];
    
    return await ctx.db
      .query("dailyGoals")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("date", today))
      .unique();
  },
});
