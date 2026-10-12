import { AIProvider, AIRequest, AIResponse } from "./provider";

export class GeminiAIProvider implements AIProvider {
  public name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.AI_API_KEY || "";
    this.model = model || process.env.AI_MODEL || "gemini-2.5-flash";

    if (!this.apiKey) {
      throw new Error("Gemini APIキーが設定されていません。AI_API_KEY を確認してください。");
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Gemini API用のcontents形式に変換
    const contents = request.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens || 1500,
        temperature: request.temperature ?? 0.7,
      },
    };

    if (request.systemPrompt) {
      body.system_instruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Gemini API request failed (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = `Gemini API Error: ${errorJson.error.message}`;
        }
      } catch {
        // use fallback errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini APIからの応答が空でした。");
    }

    const inputTokens = data.usageMetadata?.promptTokenCount;
    const outputTokens = data.usageMetadata?.candidatesTokenCount;

    return {
      content: text,
      model: this.model,
      inputTokens,
      outputTokens,
    };
  }
}
