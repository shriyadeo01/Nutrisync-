import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateMealPlan = mutation({
  args: {
    recipeId: v.id('recipes'),
    date: v.string(),
    mealType: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.insert('mealPlan', {
      recipeId: args.recipeId,
      date: args.date,
      mealType: args.mealType,
      userId: args.userId,
      userId: args.userId,
      status: false,
    });
    return result;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("mealPlan"),
    status: v.boolean(),
    calories: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.patch(args.id, {
      status: args.status,
      calories: args.calories,
    });
    return result;
  },
});

export const deleteMealPlan = mutation({
  args: { id: v.id("mealPlan") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const clearMealPlansForDay = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const mealPlans = await ctx.db
      .query("mealPlan")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();
    for (const m of mealPlans) {
      await ctx.db.delete(m._id);
    }
  },
});

export const GetTodaysMealPlan = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const mealPlans = await ctx.db
      .query("mealPlan")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("date"), args.date))
      .collect();

    const results = await Promise.all(
      mealPlans.map(async (mealPlan) => {
        const recipe = await ctx.db.get(mealPlan.recipeId);
        return {
          mealPlan,
          recipe,
        };
      })
    );
    return results;
  },
});

export const GetTotalCaloriesConsumed = query({
  args: {
    date: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const mealPlanResult = await ctx.db.query('mealPlan')
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field('date'), args.date))
      .collect();

    const totalCalories = mealPlanResult?.reduce((sum, meal) => {
      // Only sum calories if the meal is marked as consumed (status is true)
      if (meal.status === true) {
        return sum + (meal.calories ?? 0);
      }
      return sum;
    }, 0);
    
    return totalCalories;
  }
});

/** Calories logged (completed meals) for each date string in `dates`. */
export const getCaloriesConsumedByDates = query({
  args: {
    userId: v.id("users"),
    dates: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const out = [];
    for (const date of args.dates) {
      const mealPlanResult = await ctx.db
        .query("mealPlan")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("date"), date))
        .collect();
      const consumed = mealPlanResult.reduce((sum, meal) => {
        if (meal.status === true) return sum + (meal.calories ?? 0);
        return sum;
      }, 0);
      out.push({ date, consumed });
    }
    return out;
  },
});

/**
 * Consecutive days (from newest to oldest in `datesNewestFirst`) with at least
 * one meal marked completed.
 */
export const getMealStreakDays = query({
  args: {
    userId: v.id("users"),
    datesNewestFirst: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let streak = 0;
    for (const date of args.datesNewestFirst) {
      const meals = await ctx.db
        .query("mealPlan")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("date"), date))
        .collect();
      const hasCompleted = meals.some((m) => m.status === true);
      if (hasCompleted) streak++;
      else break;
    }
    return streak;
  },
});

/** How many dates in the list have at least one meal plan entry. */
export const countPlannedDaysInDates = query({
  args: {
    userId: v.id("users"),
    dates: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    let count = 0;
    for (const date of args.dates) {
      const meals = await ctx.db
        .query("mealPlan")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("date"), date))
        .collect();
      if (meals.length > 0) count++;
    }
    return count;
  },
});
