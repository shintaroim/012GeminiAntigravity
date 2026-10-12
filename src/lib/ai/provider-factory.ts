import { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { GeminiAIProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

export function getAIProvider(customProviderName?: string): AIProvider {
  const envProvider = (
    customProviderName ||
    process.env.AI_PROVIDER ||
    ""
  ).trim().toLowerCase();

  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  // 1. 明示的に指定された場合
  if (envProvider === "gemini") {
    console.log("[AI Provider] Explicitly selected: Gemini");
    return new GeminiAIProvider();
  }

  if (envProvider === "openai") {
    console.log("[AI Provider] Explicitly selected: OpenAI");
    return new OpenAIProvider();
  }

  if (envProvider === "mock") {
    console.log("[AI Provider] Explicitly selected: Mock");
    return new MockAIProvider();
  }

  // 2. 指定がない場合、APIキーの存在に基づいて自動判定
  if (apiKey && !apiKey.includes("your-api-key")) {
    if (apiKey.startsWith("sk-")) {
      console.log("[AI Provider] Auto-detected OpenAI from API key format");
      return new OpenAIProvider();
    }
    console.log("[AI Provider] Auto-detected Gemini from API key");
    return new GeminiAIProvider();
  }

  // 3. APIキーもない場合はモックにフォールバック
  console.warn("[AI Provider] No API key found. Falling back to MockAIProvider.");
  return new MockAIProvider();
}
