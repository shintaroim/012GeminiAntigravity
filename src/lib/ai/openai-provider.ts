import { AIProvider, AIRequest, AIResponse } from "./provider";

export class OpenAIProvider implements AIProvider {
  public name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.AI_API_KEY || "";
    this.model = model || process.env.AI_MODEL || "gpt-4o-mini";

    if (!this.apiKey) {
      throw new Error("OpenAI APIキーが設定されていません。AI_API_KEY を確認してください。");
    }
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const url = "https://api.openai.com/v1/chat/completions";

    const messages = [
      ...(request.systemPrompt
        ? [{ role: "system", content: request.systemPrompt }]
        : []),
      ...request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: request.maxTokens || 1500,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `OpenAI API request failed (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = `OpenAI API Error: ${errorJson.error.message}`;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content;

    if (!text) {
      throw new Error("OpenAI APIからの応答が空でした。");
    }

    return {
      content: text,
      model: this.model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
