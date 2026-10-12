import { ProgramPhase } from "@/types";

export type ProgramCommand =
  | "honne"
  | "tatakidai"
  | "rest"
  | "refine"
  | "book_seed"
  | "summary";

export interface CommandRoutingResult {
  command: ProgramCommand | null;
  nextPhase: ProgramPhase;
  phaseChanged: boolean;
  instructionOverride?: string;
}

export function detectCommandAndPhaseTransition(params: {
  message: string;
  currentPhase: ProgramPhase;
  turnCount: number;
}): CommandRoutingResult {
  const trimmed = params.message.trim();
  const lower = trimmed.toLowerCase();

  // 1. 「ほんね」コマンド
  if (lower === "ほんね" || (params.turnCount === 0 && !trimmed.startsWith("整える"))) {
    return {
      command: "honne",
      nextPhase: "speak",
      phaseChanged: params.currentPhase !== "speak",
      instructionOverride:
        "【最優先指示】最初の導入を行い、最初の質問『最近ふと、「このままでいいのかな」とか、「これから私はどうしたいんだろう」と思ったことはありますか？ 大きな悩みじゃなくて大丈夫です。』を行ってください。",
    };
  }

  // 2. 「たたき台をまとめて」コマンド
  if (trimmed.includes("たたき台をまとめて")) {
    return {
      command: "tatakidai",
      nextPhase: "speak",
      phaseChanged: false,
      instructionOverride:
        "【最優先指示】対話を一時まとめ、【「話す」のたたき台】のフォーマットに従ってそのままコピー保存できる形で出力してください。出力後は1週間の寝かせ期間を案内してください。",
    };
  }

  // 3. 「整える」コマンド
  if (trimmed.startsWith("整える") || trimmed.includes("整える")) {
    return {
      command: "refine",
      nextPhase: "refine",
      phaseChanged: params.currentPhase !== "refine",
      instructionOverride:
        "【最優先指示】フェーズ3「整える」を開始します。最初の質問は必ず『おかえりなさい。寝かせている間に、気づいたことや、「これはちょっと違うかも」と感じたことはありましたか？』としてください。たたき台の内容を内部に読み込み、本人の気づきを確認してから絞り込みに進んでください。",
    };
  }

  // 4. 「BOOK SEEDをまとめて」コマンド
  if (trimmed.includes("BOOK SEEDをまとめて") || trimmed.includes("book seedをまとめて") || trimmed.includes("ブックシードをまとめて")) {
    return {
      command: "book_seed",
      nextPhase: "book_seed",
      phaseChanged: params.currentPhase !== "book_seed",
      instructionOverride:
        "【最優先指示】フェーズ4「確かめる」に進みます。【BOOK SEED】のフォーマットに従って、7 STORIES、3 COMPASS、人生の再定義文、次のタネ箱を一つにまとめて出力してください。出力後、本人が全体を読んで『これは私だ』と言えるか確認してください。AIが自動で勝手に完成宣言をしてはいけません。",
    };
  }

  // 5. 「まとめて」または「今どんな感じ？」コマンド
  if (trimmed.includes("今どんな感じ？") || trimmed === "まとめて" || trimmed.startsWith("まとめて")) {
    return {
      command: "summary",
      nextPhase: params.currentPhase,
      phaseChanged: false,
      instructionOverride:
        "【最優先指示】【⚓ HON-NEoまとめログ】のフォーマットで現在の対話整理を出力し、最後に『ここまでで、「それは違う」と思うところはありますか？』と一問だけ確認してください。",
    };
  }

  // 6. 「寝かせる」に関する発言（寝かせるフェーズ中）
  if (params.currentPhase === "rest" || trimmed.includes("寝かせる")) {
    return {
      command: "rest",
      nextPhase: "rest",
      phaseChanged: params.currentPhase !== "rest",
      instructionOverride:
        "【最優先指示】現在は「寝かせる」期間です。無理に深掘りを再開せず、気づきを短く受け止め、『その気づきは、「整える」のときにぜひ持ってきてください』と返してください。",
    };
  }

  // 通常対話
  return {
    command: null,
    nextPhase: params.currentPhase,
    phaseChanged: false,
  };
}
