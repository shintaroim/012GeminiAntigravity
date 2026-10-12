import { ChatMessage, SessionState } from "@/types";

export type ExportType = "book_seed" | "tatakidai" | "full";

export interface GenerateExportOptions {
  state: SessionState;
  messages: ChatMessage[];
  type?: ExportType;
}

/**
 * BOOK SEED の Markdown を生成します。
 * 未承認の仮説は確定事項として含めず、「次のタネ箱」に候補を収録します。
 */
export function generateBookSeedMarkdown(state: SessionState, messages: ChatMessage[]): string {
  // メッセージ履歴にAIが生成した BOOK SEED がある場合はそれを優先的に参照しつつ、
  // 構造化状態の承認済み内容を結合する
  const aiBookSeedMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.content.includes("BOOK SEED｜わたしの物語"));

  if (aiBookSeedMsg) {
    // 承認確認質問などの末尾定型文を除去してクリーンな成果物本文を抽出
    let cleaned = aiBookSeedMsg.content;
    const splitIndex = cleaned.indexOf("私から見ると、あなたの7つの物語");
    if (splitIndex !== -1) {
      cleaned = cleaned.slice(0, splitIndex).trim();
    }
    return cleaned;
  }

  // 構造化状態から組み立てる場合
  const lines: string[] = [
    "━━━━━━━━━━━━━━",
    "BOOK SEED｜わたしの物語（仮）",
    "━━━━━━━━━━━━━━",
    "",
    "■ MY 7 STORIES｜私をつくった7つの物語",
    "",
  ];

  if (state.approvedStories.length > 0) {
    state.approvedStories.forEach((story) => {
      lines.push(
        `STORY ${story.storyNumber}`,
        `《${story.title}》`,
        `元になった出来事：${story.originalEvent}`,
        `■ 何があったか：${story.whatHappened}`,
        `■ 当時の私：${story.atThatTime}`,
        `■ 本当はどう感じていたか：${story.howFeltReally}`,
        `■ 私が選んだこと：${story.whatIChose}`,
        `■ 私が選ばなかったこと：${story.whatIDidNotChoose}`,
        `■ 今振り返って思うこと：${story.reflectionNow}`,
        `■ この出来事が私に残したもの：${story.whatRemained}`,
        `■ 本人の象徴的な原文：「${story.verbatimQuote}」`,
        `■ つながるCOMPASS：${story.connectedCompass}`,
        ""
      );
    });
  } else {
    lines.push("（※現在編集・承認作業中です。対話を進めて承認してください）", "");
  }

  lines.push("■ MY 3 COMPASS｜迷ったときに戻れる3つの問い", "");
  if (state.approvedCompasses.length > 0) {
    state.approvedCompasses.forEach((compass) => {
      lines.push(
        `COMPASS ${compass.compassNumber}`,
        `《${compass.name}》`,
        `${compass.definition}`,
        `これから迷ったとき、私は自分にこう問いかける。`,
        `「${compass.question}」`,
        ""
      );
    });
  } else {
    lines.push("（※現在編集・承認作業中です）", "");
  }

  lines.push("■ 私の人生の再定義", "");
  if (state.lifeRedefinition) {
    lines.push(state.lifeRedefinition, "");
  } else {
    lines.push("（※現在対話中）", "");
  }

  lines.push("■ 次のタネ箱", "（今回の7つには入らなかったけれど、大切なエピソード）");
  // 選ばれなかった候補や未確定事項を収録
  if (state.storyCandidates.length > 0) {
    state.storyCandidates
      .filter((sc) => sc.status !== "approved")
      .forEach((sc) => {
        lines.push(`・${sc.title}（${sc.whatHappened}）`);
      });
  } else if (state.unresolvedItems.length > 0) {
    state.unresolvedItems.forEach((u) => {
      lines.push(`・${u.topic}: ${u.note}`);
    });
  } else {
    lines.push("・日々の対話で見つかった大切な記憶の数々");
  }

  lines.push("━━━━━━━━━━━━━━");
  return lines.join("\n");
}

/**
 * たたき台の Markdown を生成します。
 */
export function generateTatakidaiMarkdown(state: SessionState, messages: ChatMessage[]): string {
  const aiTatakidaiMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.content.includes("HON-NEo「話す」のたたき台"));

  if (aiTatakidaiMsg) {
    let cleaned = aiTatakidaiMsg.content;
    const splitIndex = cleaned.indexOf("このたたき台を、スマホのメモなどにコピー");
    if (splitIndex !== -1) {
      cleaned = cleaned.slice(0, splitIndex).trim();
    }
    return cleaned;
  }

  const lines: string[] = [
    "━━━━━━━━━━━━━━",
    "HON-NEo「話す」のたたき台（保存用）",
    "━━━━━━━━━━━━━━",
    "",
    "■ 7 STORIES候補（10〜15個）",
  ];

  if (state.storyCandidates.length > 0) {
    state.storyCandidates.forEach((sc, i) => {
      lines.push(
        `${i + 1}｜出来事の仮名：${sc.title}`,
        `　何が起きたか：${sc.whatHappened}`,
        `　今の私につながっていると思う理由：${sc.connectionToPresent}`
      );
    });
  } else {
    lines.push("（対話を通じて抽出中）");
  }

  lines.push("", "■ 3 COMPASS候補（5〜7個）");
  if (state.valueHypotheses.length > 0) {
    state.valueHypotheses.forEach((vh) => {
      lines.push(`・${vh.name}（根拠：${vh.reason}）`);
    });
  } else {
    lines.push("（対話を通じて抽出中）");
  }

  lines.push("", "■ 本人の象徴的な原文");
  if (state.verbatimQuotes.length > 0) {
    state.verbatimQuotes.slice(-10).forEach((q) => {
      lines.push(`・「${q.text}」`);
    });
  } else {
    lines.push("（対話を通じて記録中）");
  }

  lines.push("", "■ 選ばなかった言葉");
  if (state.rejectedWords.length > 0) {
    state.rejectedWords.forEach((rw) => {
      lines.push(`・${rw.wordOrInterpretation} → 「${rw.userCorrection}」と本人`);
    });
  } else {
    lines.push("・なし");
  }

  lines.push("", "■ まだ決めたくないところ");
  if (state.unresolvedItems.length > 0) {
    state.unresolvedItems.forEach((u) => {
      lines.push(`・${u.topic}: ${u.note}`);
    });
  } else {
    lines.push("・なし");
  }

  lines.push("━━━━━━━━━━━━━━");
  return lines.join("\n");
}

/**
 * 全対話ログの Markdown を生成します。
 */
export function generateFullConversationMarkdown(state: SessionState, messages: ChatMessage[]): string {
  const lines: string[] = [
    "# HON-NEo 対話記録",
    `作成日時: ${state.phase} フェーズ (ターン数: ${state.turnCount})`,
    "---",
    "",
  ];

  messages.forEach((m) => {
    const speaker = m.role === "user" ? "👤 あなた" : "✍️ HON-NEo（人生編集者）";
    lines.push(`### ${speaker} (${m.createdAt.slice(0, 19).replace("T", " ")})`, "", m.content, "", "---", "");
  });

  return lines.join("\n");
}

export function generateExportMarkdown(options: GenerateExportOptions): string {
  const type = options.type || "book_seed";
  switch (type) {
    case "book_seed":
      return generateBookSeedMarkdown(options.state, options.messages);
    case "tatakidai":
      return generateTatakidaiMarkdown(options.state, options.messages);
    case "full":
      return generateFullConversationMarkdown(options.state, options.messages);
    default:
      return generateBookSeedMarkdown(options.state, options.messages);
  }
}
