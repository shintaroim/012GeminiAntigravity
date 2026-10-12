import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/db/repository";
import { getAIProvider } from "@/lib/ai/provider-factory";
import { loadPromptModules } from "@/lib/prompts/load-prompts";
import { AIMessage } from "@/lib/ai/provider";
import {
  formatStateContextForAI,
  updateStateFromInteraction,
} from "@/lib/state/state-manager";
import { parseSessionState } from "@/lib/state/session-state";
import { detectCommandAndPhaseTransition } from "@/lib/conversations/command-router";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { checkSessionBudget } from "@/lib/security/budget-guard";

const ChatRequestSchema = z.object({
  sessionId: z.string().uuid({ message: "有効なセッションIDが必要です。" }),
  message: z
    .string()
    .min(1, { message: "メッセージを入力してください。" })
    .max(2000, { message: "メッセージは2000文字以内で入力してください。" }),
  resumeToken: z.string().min(1, { message: "再開トークンが必要です。" }),
});

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const repo = getRepository();

  // 1. IP / セッション単位のレートリミット確認
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateCheck = checkRateLimit(`ip:${ip}`);
  if (!rateCheck.allowed) {
    await repo.createUsageEvent({
      eventType: "rate_limited",
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: `リクエストが集中しています。${rateCheck.retryAfterSec || 30}秒後に再試行してください。`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateCheck.retryAfterSec || 30),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "リクエストが正しくありません。";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { sessionId, message, resumeToken } = parseResult.data;

    // 2. セッション検証とトークン認証
    const session = await repo.getSessionById(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    const isValidToken = await repo.verifySessionToken(sessionId, resumeToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "無効な再開トークンです。アクセスが拒否されました。" },
        { status: 403 }
      );
    }

    // 3. セッション利用量上限（ターン数）確認
    const budgetCheck = await checkSessionBudget(sessionId);
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        { error: budgetCheck.message },
        { status: 400 }
      );
    }

    // 4. コマンド解析とフェーズ遷移判定
    const currentTurnCount = await repo.getTurnCount(sessionId);
    const routing = detectCommandAndPhaseTransition({
      message,
      currentPhase: session.phase,
      turnCount: currentTurnCount,
    });

    const activePhase = routing.nextPhase;

    // 5. ユーザーメッセージ保存（先行永続化）
    const userMsg = await repo.createMessage({
      sessionId,
      role: "user",
      content: message,
    });

    if (!userMsg) {
      return NextResponse.json(
        { error: "メッセージの保存に失敗しました。" },
        { status: 500 }
      );
    }

    // 6. 会話履歴を取得
    const history = await repo.getMessagesBySessionId(sessionId);
    const recentHistory = history.slice(-20);
    const aiMessages: AIMessage[] = recentHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 7. プロンプトとコンテキストの構築
    const basePrompt = loadPromptModules({ phase: activePhase });
    const currentState = parseSessionState(session.stateJson);
    currentState.phase = activePhase;

    const stateContext = formatStateContextForAI(currentState);
    const parts = [basePrompt, stateContext];

    if (routing.instructionOverride) {
      parts.push(`=== コマンド実行指示 ===\n${routing.instructionOverride}`);
    }

    const fullSystemPrompt = parts.join("\n\n");

    // 8. AIプロバイダー呼び出し
    let aiResponse;
    let providerName = "unknown";
    try {
      const provider = getAIProvider();
      providerName = provider.name;
      aiResponse = await provider.generateResponse({
        systemPrompt: fullSystemPrompt,
        messages: aiMessages,
        maxTokens: parseInt(process.env.MAX_OUTPUT_TOKENS || "1500", 10),
      });
    } catch (aiError) {
      console.error("AI Provider execution error:", aiError);
      const errorMsg =
        aiError instanceof Error ? aiError.message : "AIの応答生成中にエラーが発生しました。";

      await repo.createUsageEvent({
        sessionId,
        eventType: "error",
        model: providerName,
        latencyMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: `AIエラー: ${errorMsg}`,
        },
        { status: 502 }
      );
    }

    // 9. アシスタントメッセージ保存
    const assistantMsg = await repo.createMessage({
      sessionId,
      role: "assistant",
      content: aiResponse.content,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
    });

    if (!assistantMsg) {
      return NextResponse.json(
        { error: "AI応答の保存に失敗しました。" },
        { status: 500 }
      );
    }

    const updatedTurnCount = await repo.getTurnCount(sessionId);

    // 10. 構造化状態の更新とセッション保存
    try {
      const updatedState = updateStateFromInteraction({
        currentState,
        userMessageId: userMsg.id,
        userContent: message,
        aiContent: aiResponse.content,
        turnCount: updatedTurnCount,
      });
      updatedState.phase = activePhase;

      await repo.updateSession(sessionId, {
        phase: activePhase,
        stateJson: updatedState as unknown as Record<string, unknown>,
      });
    } catch (stateErr) {
      console.error("State update error (non-fatal):", stateErr);
    }

    const latencyMs = Date.now() - startTime;

    // 11. 使用量イベント記録
    await repo.createUsageEvent({
      sessionId,
      eventType: "request",
      model: aiResponse.model,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      latencyMs,
    });

    return NextResponse.json({
      message: assistantMsg,
      phase: activePhase,
      turnCount: updatedTurnCount,
    });
  } catch (error) {
    console.error("Chat API unhandled error:", error);

    const detailMsg =
      error instanceof Error ? error.message : "サーバー内部でエラーが発生しました。";

    await repo.createUsageEvent({
      eventType: "error",
      model: "unknown",
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `サーバーエラー: ${detailMsg}` },
      { status: 500 }
    );
  }
}
