import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const repo = getRepository();

  const session = await repo.getSessionById(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "セッションが見つからないか、削除されています。" },
      { status: 404 }
    );
  }

  // 再開トークンの検証（所有権確認）
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { error: "セッションの閲覧には再開トークンが必要です。" },
      { status: 401 }
    );
  }

  const isValid = await repo.verifySessionToken(sessionId, token);
  if (!isValid) {
    return NextResponse.json(
      { error: "無効なトークンです。アクセス権がありません。" },
      { status: 403 }
    );
  }

  const messages = await repo.getMessagesBySessionId(sessionId);
  const turnCount = await repo.getTurnCount(sessionId);

  return NextResponse.json({
    sessionId: session.id,
    phase: session.phase,
    turnCount,
    messages,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { error: "削除には再開トークンが必要です。" },
      { status: 401 }
    );
  }

  const repo = getRepository();
  const success = await repo.softDeleteSession(sessionId, token);

  if (!success) {
    return NextResponse.json(
      { error: "セッションが見つからないか、トークンが無効です。" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "セッションを削除しました。" });
}
