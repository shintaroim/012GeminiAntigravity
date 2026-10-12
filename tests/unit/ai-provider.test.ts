import { describe, it, expect } from "vitest";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { GeminiAIProvider } from "@/lib/ai/gemini-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";

describe("Phase 3: AI Provider Abstraction", () => {
  it("should return MockAIProvider by default or when specified", () => {
    const provider = getAIProvider("mock");
    expect(provider).toBeInstanceOf(MockAIProvider);
    expect(provider.name).toBe("mock");
  });

  it("should generate mock response adhering to AIProvider interface", async () => {
    const provider = new MockAIProvider();
    const res = await provider.generateResponse({
      systemPrompt: "system prompt here",
      messages: [
        { role: "user", content: "ほんね" },
      ],
    });

    expect(res.content).toContain("スタートおめでとうございます。");
    expect(res.model).toBe("mock-model");
    expect(res.inputTokens).toBeGreaterThan(0);
    expect(res.outputTokens).toBeGreaterThan(0);
  });

  it("should throw informative error when Gemini API key is missing", () => {
    expect(() => new GeminiAIProvider("", "gemini-1.5-flash")).toThrowError(
      /Gemini APIキーが設定されていません/
    );
  });

  it("should throw informative error when OpenAI API key is missing", () => {
    expect(() => new OpenAIProvider("", "gpt-4o-mini")).toThrowError(
      /OpenAI APIキーが設定されていません/
    );
  });
});
