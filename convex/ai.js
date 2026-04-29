import { v } from "convex/values";
import { action } from "./_generated/server";

export const CalculateCaloriesAI = action({
  args: {
    weight: v.string(),
    height: v.string(),
    gender: v.string(),
    goal: v.string(),
    age: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const age = args.age ?? 28;

    const prompt = `
Based on:
- Weight: ${args.weight}
- Height: ${args.height}
- Gender: ${args.gender}
- Goal: ${args.goal}
- Age: ${age}

Return ONLY valid JSON exactly like:
{
  "calories": number,
  "proteins": number
}
`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // optional headers:
        "X-Title": "AI Diet Planner",
      },
      body: JSON.stringify({
        model: "z-ai/glm-4.5-air:free",
        messages: [
          {
            role: "system",
            content: "You are a nutrition assistant. Output ONLY JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    // Try parse JSON from model
    try {
      return JSON.parse(content);
    } catch (e) {
      // If model accidentally returns extra text, try extracting JSON block
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("AI did not return valid JSON");
    }
  },
});
