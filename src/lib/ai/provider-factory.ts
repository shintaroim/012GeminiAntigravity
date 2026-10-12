import { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { GeminiAIProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

export function getAIProvider(customProviderName?: string): AIProvider {
  const providerName = (
    customProviderName ||
    process.env.AI_PROVIDER ||
    "mock"
  ).toLowerCase();

  switch (providerName) {
    case "gemini":
      return new GeminiAIProvider();
    case "openai":
      return new OpenAIProvider();
    case "mock":
    default:
      return new MockAIProvider();
  }
}
