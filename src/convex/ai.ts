"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("system"),
          v.literal("user"),
          v.literal("assistant")
        ),
        content: v.string(),
      })
    ),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is not configured. Please set OPENROUTER_API_KEY.");
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://app.local",
        "X-Title": "Zahrati Study Tracker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model ?? "anthropic/claude-3-haiku",
        messages: args.messages,
        max_tokens: args.maxTokens ?? 300,
      }),
    });

    if (!resp.ok) {
      let detail = "";
      try {
        detail = await resp.text();
      } catch {}
      throw new Error(`OpenRouter request failed (${resp.status}): ${detail}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return { content };
  },
});
