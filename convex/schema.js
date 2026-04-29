import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    picture: v.optional(v.string()),
    subscriptionID: v.optional(v.string()),
    credits: v.number(),
    height: v.optional(v.string()),
    weight: v.optional(v.string()),
    age: v.optional(v.string()),
    gender: v.optional(v.string()),
    goal: v.optional(v.string()),
    workoutPreference: v.optional(v.string()),
    calories: v.optional(v.string()),
    proteins: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
  }).index("by_email", ["email"]),

  recipes: defineTable({
    jsonData: v.optional(v.any()),
    userId: v.id("users"),
    imageUrl: v.optional(v.string()),
    recipeName: v.any(),
    // Legacy fields for backward compatibility
    description: v.optional(v.string()),
    calories: v.optional(v.union(v.string(), v.number())),
    proteins: v.optional(v.union(v.string(), v.number())),
    serveTo: v.optional(v.union(v.string(), v.number())),
    ingredients: v.optional(v.array(
      v.object({
        icon: v.optional(v.string()),
        ingredient: v.string(),
        quantity: v.optional(v.string()),
      })
    )),
    steps: v.optional(v.array(v.string())),
    mealDate: v.optional(v.string()),
    mealType: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  mealPlan: defineTable({
    recipeId: v.id("recipes"),
    date: v.string(),
    mealType: v.string(),
    userId: v.id("users"),
    status: v.optional(v.boolean()),
    calories: v.optional(v.number()),
  }).index("by_userId", ["userId"]).index("by_date", ["date"]),
});
