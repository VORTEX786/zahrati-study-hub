import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      
      // Study tracker specific fields
      currentStreak: v.optional(v.number()),
      longestStreak: v.optional(v.number()),
      totalStudyTime: v.optional(v.number()),
      level: v.optional(v.number()),
      badges: v.optional(v.array(v.string())),
      focusDuration: v.optional(v.number()), // in minutes, default 25
      breakDuration: v.optional(v.number()), // in minutes, default 5
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Study sessions table
    studySessions: defineTable({
      userId: v.id("users"),
      duration: v.number(), // in minutes
      type: v.union(v.literal("focus"), v.literal("break")),
      subject: v.optional(v.string()),
      notes: v.optional(v.string()),
      completed: v.boolean(),
      date: v.string(), // YYYY-MM-DD format for easy querying
    }).index("by_user_and_date", ["userId", "date"])
      .index("by_user", ["userId"]),

    // Daily goals table
    dailyGoals: defineTable({
      userId: v.id("users"),
      date: v.string(), // YYYY-MM-DD format
      targetSessions: v.number(),
      targetMinutes: v.number(),
      completedSessions: v.optional(v.number()),
      completedMinutes: v.optional(v.number()),
    }).index("by_user_and_date", ["userId", "date"])
      .index("by_user", ["userId"]),

    // Subjects table
    subjects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      color: v.string(),
      totalTime: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    // Life goals table
    lifeGoals: defineTable({
      userId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      targetDate: v.optional(v.string()), // YYYY-MM-DD
      completed: v.optional(v.boolean()),
    }).index("by_user", ["userId"]),

    // Timetables table
    timetables: defineTable({
      userId: v.id("users"),
      title: v.optional(v.string()),
      dayStart: v.string(), // HH:MM format
      dayEnd: v.string(), // HH:MM format
      breakDefaultMinutes: v.optional(v.number()),
      rotateLastBlock: v.optional(v.boolean()),
      weakSubjectIds: v.optional(v.array(v.id("subjects"))),
    }).index("by_user", ["userId"]),

    // Timetable blocks table
    timetableBlocks: defineTable({
      timetableId: v.id("timetables"),
      kind: v.union(v.literal("study"), v.literal("break"), v.literal("fixed")),
      subjectId: v.optional(v.id("subjects")),
      label: v.optional(v.string()),
      color: v.optional(v.string()),
      start: v.string(), // HH:MM format
      end: v.string(), // HH:MM format
      locked: v.optional(v.boolean()),
      // ADD: dayOfWeek for weekly layout (optional)
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
    }).index("by_timetable", ["timetableId"])
      .index("by_timetable_and_start", ["timetableId", "start"]),

    // Fixed events table
    fixedEvents: defineTable({
      userId: v.id("users"),
      label: v.string(),
      start: v.string(), // HH:MM format
      end: v.string(), // HH:MM format
      color: v.optional(v.string()),
      // ADD: optional dayOfWeek (undefined = applies to all days)
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
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;