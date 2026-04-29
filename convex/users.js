import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create new user (if not exists)
export const createNewUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    if (user?.length > 0) {
      return user[0];
    }

    const newUser = {
      name: args.name,
      email: args.email,
      credits: 10,
    };

    await ctx.db.insert("users", newUser);

    const createdUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    return createdUser[0];
  },
});

// Get user by email
export const getUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();

    return user[0];
  },
});

// Update user preferences
export const UpdateUserPref = mutation({
  args: {
    uid: v.id("users"),
    height: v.string(),
    weight: v.string(),
    age: v.string(),
    gender: v.string(),
    goal: v.string(),
    workoutPreference: v.optional(v.string()),
    calories: v.optional(v.string()),
    proteins: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.patch(args.uid, {
      height: args.height,
      weight: args.weight,
      age: args.age,
      gender: args.gender,
      goal: args.goal,
      workoutPreference: args.workoutPreference,
      calories: args.calories,
      proteins: args.proteins,
    });

    return result;
  },
});

export const updateDietaryPreferences = mutation({
  args: {
    uid: v.id("users"),
    dietaryRestrictions: v.array(v.string()),
    allergies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.uid, {
      dietaryRestrictions: args.dietaryRestrictions,
      allergies: args.allergies,
    });
  },
});
