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

    const envModel = process.env.AI_MODEL || process.env.GEMINI_MODEL || "";
    // 2.5-flash(クォータ切れ) や 2.0-flash(廃止) の場合は推奨の 3.8-flash を強制適用
    if (!envModel || envModel.includes("2.5") || envModel.includes("2.0")) {
      this.primaryModel = model || "gemini-3.8-flash";
    } else {
      this.primaryModel = model || envModel;
    }

    if (!this.apiKey) {
      throw new Error("Gemini APIキーが設定されていません。VercelのEnvironment Variablesで AI_API_KEY を設定してください。");
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    console.log(`[GeminiAIProvider] Using active model: ${this.primaryModel}`);
    return await this.callGemini(this.primaryModel, request);
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

    let response: Response | null = null;
    let lastCallError: string = "";

    // 混雑時（high demand）や一時エラー（503）に備えて最大3回リトライ
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        break;
      }

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
      lastCallError = errorMsg;

      // 混雑（high demand）や 503 の場合は 1.5秒〜3秒 待機して自動リトライ
      const isTemporary = errorMsg.includes("high demand") || response.status === 503;
      if (isTemporary && attempt < 2) {
        const waitMs = (attempt + 1) * 1500;
        console.warn(`[GeminiAIProvider] High demand on ${model}, retrying in ${waitMs}ms (attempt ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      throw new Error(errorMsg);
    }

    if (!response || !response.ok) {
      throw new Error(lastCallError || "Gemini API request failed");
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
