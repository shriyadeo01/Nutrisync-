import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveRecipe = mutation({
  args: {
    userId: v.id("users"),
    recipeName: v.any(),
    imageUrl: v.string(),
    jsonData: v.any(),
  },
  handler: async (ctx, args) => {
    const recipeId = await ctx.db.insert("recipes", {
      ...args,
      createdAt: Date.now(),
    });
    return recipeId;
  },
});

export const getUserRecipes = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
