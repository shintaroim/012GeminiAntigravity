import { getRepository } from "@/lib/db/repository";

export interface BudgetCheckResult {
  allowed: boolean;
  currentTurns: number;
  maxTurns: number;
  message?: string;
}

export async function checkSessionBudget(sessionId: string): Promise<BudgetCheckResult> {
  const repo = getRepository();
  const maxTurns = parseInt(process.env.SESSION_MAX_TURNS || "50", 10);
  const currentTurns = await repo.getTurnCount(sessionId);

  if (currentTurns >= maxTurns) {
    return {
      allowed: false,
      currentTurns,
      maxTurns,
      message: `このセッションの対話ターン上限（${maxTurns}往復）に達しました。これまでの対話を「保存」ボタンからBOOK SEEDまたはたたき台としてダウンロードしてください。`,
    };
  }

  return {
    allowed: true,
    currentTurns,
    maxTurns,
  };
}
