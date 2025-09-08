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

    // Basic input validation and sanitization
    if (!Array.isArray(args.messages) || args.messages.length === 0) {
      throw new Error("messages must be a non-empty array.");
    }
    const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);
    const MAX_CONTENT_LEN = 4000; // trim overly long inputs to avoid 400s
    const sanitizedMessages = args.messages.map((m) => {
      if (!ALLOWED_ROLES.has(m.role)) {
        throw new Error(`Invalid role '${m.role}'.`);
      }
      const content = (m.content ?? "").toString().trim();
      if (!content) {
        throw new Error("Each message must have non-empty content.");
      }
      return {
        role: m.role,
        content: content.length > MAX_CONTENT_LEN ? content.slice(0, MAX_CONTENT_LEN) : content,
      };
    });

    // Timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
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
          messages: sanitizedMessages,
          max_tokens: args.maxTokens ?? 300,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        // Try to extract meaningful error details
        let errorDetail: string | undefined;
        try {
          const errJson = await resp.json();
          errorDetail =
            errJson?.error?.message ||
            errJson?.message ||
            (typeof errJson === "string" ? errJson : undefined);
        } catch {
          try {
            errorDetail = await resp.text();
          } catch {
            // ignore
          }
        }

        // Friendly messages for common statuses
        if (resp.status === 401) {
          throw new Error("Unauthorized: Check your OpenRouter API key.");
        }
        if (resp.status === 429) {
          throw new Error("Rate limit exceeded: Please wait and try again.");
        }
        if (resp.status >= 500) {
          throw new Error("OpenRouter service is unavailable. Please try again later.");
        }

        throw new Error(`OpenRouter request failed (${resp.status}): ${errorDetail ?? "Unknown error"}`);
      }

      const data = await resp.json();
      // Standard content extraction
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.delta?.content ??
        "";

      return {
        content: content || "I couldn't generate a response. Please try again with more context.",
      };
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error("The AI request timed out. Please try again.");
      }
      // Normalize unexpected errors
      const msg =
        (err && typeof err.message === "string" && err.message) ||
        "Unknown error while contacting the AI.";
      throw new Error(msg);
    } finally {
      clearTimeout(timeout);
    }
  },
});