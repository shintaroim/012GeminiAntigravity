import { AIProvider, AIRequest, AIResponse } from "./provider";

export class GeminiAIProvider implements AIProvider {
  public name = "gemini";
  private apiKey: string;
  private primaryModel: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey ||
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_AI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      "";
    this.primaryModel =
      model ||
      process.env.AI_MODEL ||
      process.env.GEMINI_MODEL ||
      "gemini-2.0-flash";

    if (!this.apiKey) {
      throw new Error("Gemini APIキーが設定されていません。VercelのEnvironment Variablesで AI_API_KEY を設定してください。");
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    // 試行するモデル候補（プライマリモデル → 2.0-flash → 2.5-flash）
    const candidateModels = Array.from(
      new Set([this.primaryModel, "gemini-2.0-flash", "gemini-2.5-flash"])
    );

    let lastError: Error | null = null;

    for (const modelToTry of candidateModels) {
      try {
        console.log(`[GeminiAIProvider] Attempting request with model: ${modelToTry}`);
        return await this.callGemini(modelToTry, request);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(errorMsg);

        // クォータ超過（Quota exceeded / 429）の場合、別の候補モデルで即時リトライ
        const isQuotaError =
          errorMsg.includes("Quota exceeded") ||
          errorMsg.includes("exceeded your current quota") ||
          errorMsg.includes("429");

        if (isQuotaError) {
          console.warn(`[GeminiAIProvider] Model ${modelToTry} quota exceeded, falling back to next candidate...`);
          continue;
        }

        // クォータ以外の致命的エラーはそのままスロー
        throw err;
      }
    }

    throw lastError || new Error("Gemini APIでの応答生成に失敗しました。");
  }

  private async callGemini(model: string, request: AIRequest): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

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
      model,
      inputTokens,
      outputTokens,
    };
  }
}
