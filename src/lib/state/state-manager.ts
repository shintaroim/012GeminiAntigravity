import crypto from "crypto";
import {
  SessionState,
  VerbatimQuote,
  RejectedWord,
  UnresolvedItem,
  SessionStateSchema,
  parseSessionState,
} from "./session-state";

/**
 * AIプロンプトのコンテキストとして渡す構造化テキストを生成します。
 * 特に本人が否定した言葉（再提示禁止）や原文を強調します。
 */
export function formatStateContextForAI(state: SessionState): string {
  const sections: string[] = ["=== 現在の内部構造化状態 ==="];

  // 1. 選ばなかった言葉（最重要：AIによる再提示を防止）
  if (state.rejectedWords.length > 0) {
    sections.push("【⛔ 選ばなかった言葉（絶対に別の表現で再提示・押し付けないこと）】");
    state.rejectedWords.forEach((rw) => {
      sections.push(`・否定された言葉/解釈: 「${rw.wordOrInterpretation}」 (本人の発言: 「${rw.userCorrection}」)`);
    });
    sections.push("");
  }

  // 2. 本人の象徴的な原文
  if (state.verbatimQuotes.length > 0) {
    sections.push("【本人の原文引用（AIの言い換えではなく発言そのもの）】");
    // 直近10件
    state.verbatimQuotes.slice(-10).forEach((q) => {
      sections.push(`・「${q.text}」`);
    });
    sections.push("");
  }

  // 3. 価値観の仮説
  if (state.valueHypotheses.length > 0) {
    sections.push("【価値観の仮説（暫定・未確定）】");
    state.valueHypotheses.forEach((vh) => {
      sections.push(`・${vh.name} (根拠: ${vh.reason}${vh.counterEvidence ? ` / 反証候補: ${vh.counterEvidence}` : ""})`);
    });
    sections.push("");
  }

  // 4. まだ決めたくないところ／未確定事項
  if (state.unresolvedItems.length > 0) {
    sections.push("【まだ決めたくないところ / 未確定事項】");
    state.unresolvedItems.forEach((u) => {
      sections.push(`・${u.topic}: ${u.note}`);
    });
    sections.push("");
  }

  // 5. 承認済みの物語・COMPASS
  if (state.approvedStories.length > 0) {
    sections.push(`【承認済みの物語 (現在 ${state.approvedStories.length}/7)】`);
    state.approvedStories.forEach((s) => {
      sections.push(`・STORY ${s.storyNumber}: 《${s.title}》 (${s.originalEvent})`);
    });
    sections.push("");
  }

  if (state.approvedCompasses.length > 0) {
    sections.push(`【承認済みのCOMPASS (現在 ${state.approvedCompasses.length}/3)】`);
    state.approvedCompasses.forEach((c) => {
      sections.push(`・COMPASS ${c.compassNumber}: 《${c.name}》 - 問い: 「${c.question}」`);
    });
    sections.push("");
  }

  return sections.join("\n");
}

export interface StateUpdateParams {
  currentState: unknown;
  userMessageId: string;
  userContent: string;
  aiContent?: string;
  turnCount: number;
}

/**
 * ユーザーの発言およびAIの応答から、原文・否定語・未確定事項を安全に抽出し、状態を更新します。
 */
export function updateStateFromInteraction(params: StateUpdateParams): SessionState {
  const state = parseSessionState(params.currentState);
  const userText = params.userContent.trim();
  const now = new Date().toISOString();

  // 1. 原文引用の抽出と保存
  // 「ほんね」などのコマンド単体でなければ、象徴的なフレーズまたは発言全体を原文引用として保存
  if (
    userText.length >= 6 &&
    !["ほんね", "たたき台をまとめて", "BOOK SEEDをまとめて", "今どんな感じ？", "まとめて"].includes(userText)
  ) {
    const quote: VerbatimQuote = {
      id: crypto.randomUUID(),
      messageId: params.userMessageId,
      text: userText,
      createdAt: now,
    };
    state.verbatimQuotes.push(quote);
    // 最大50件保持
    if (state.verbatimQuotes.length > 50) {
      state.verbatimQuotes = state.verbatimQuotes.slice(-50);
    }
  }

  // 2. 否定された言葉・解釈の検出（日本語の活用形に対応）
  const rejectionPatterns = [
    /違[ういっえ]/i,
    /そう(じゃ|では)ない/i,
    /私(じゃ|では)ない/i,
    /そこまでは思っ/i,
    /そういう(こと|わけ)(じゃ|では)ない/i,
    /そんな(カッコいい|綺麗|かっこいい)/i,
    /美化/i,
    /違和感/i,
    /当てはまらない/i,
    /しっくり(こない|きません)/i,
  ];

  if (rejectionPatterns.some((pattern) => pattern.test(userText))) {
    const rejected: RejectedWord = {
      id: crypto.randomUUID(),
      wordOrInterpretation: "直前に提示された解釈・語句",
      userCorrection: userText,
      rejectedAt: now,
    };
    state.rejectedWords.push(rejected);
  }

  // 3. 未確定事項・保留事項の検出
  const unresolvedPatterns = [
    /分[か|から|かり]/i,
    /わか[ら|り]/i,
    /今は決めたくない/i,
    /まだ決め[ら|れ]/i,
    /迷って/i,
    /保留/i,
  ];

  if (unresolvedPatterns.some((pattern) => pattern.test(userText))) {
    const unresolved: UnresolvedItem = {
      id: crypto.randomUUID(),
      topic: "保留されたテーマ",
      note: userText,
    };
    state.unresolvedItems.push(unresolved);
  }

  // 4. ターン数の更新
  state.turnCount = params.turnCount;

  // 5. スキーマ検証
  const validated = SessionStateSchema.safeParse(state);
  if (!validated.success) {
    console.error("SessionState validation failed after update:", validated.error);
    return state;
  }

  return validated.data;
}
