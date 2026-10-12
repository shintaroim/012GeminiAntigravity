import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/db/repository";
import { parseSessionState } from "@/lib/state/session-state";
import { generateExportMarkdown, ExportType } from "@/lib/export/export-markdown";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const repo = getRepository();

  // 1. セッション認証
  const authHeader = request.headers.get("authorization");
  const tokenFromHeader = authHeader?.replace(/^Bearer\s+/i, "");
  const tokenFromQuery = request.nextUrl.searchParams.get("token");
  const token = tokenFromHeader || tokenFromQuery;

  if (!token) {
    return NextResponse.json(
      { error: "エクスポートには再開トークンが必要です。" },
      { status: 401 }
    );
  }

  const session = await repo.getSessionById(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "セッションが見つかりません。" },
      { status: 404 }
    );
  }

  const isValid = await repo.verifySessionToken(sessionId, token);
  if (!isValid) {
    return NextResponse.json(
      { error: "無効なトークンです。アクセス権がありません。" },
      { status: 403 }
    );
  }

  // 2. パラメータ取得
  const exportType = (request.nextUrl.searchParams.get("type") || "book_seed") as ExportType;
  const format = request.nextUrl.searchParams.get("format") || "json";

  // 3. データ取得とMarkdown生成
  const messages = await repo.getMessagesBySessionId(sessionId);
  const state = parseSessionState(session.stateJson);

  const markdown = generateExportMarkdown({
    state,
    messages,
    type: exportType,
  });

  const filename = `HON-NEo-${exportType.toUpperCase()}-${sessionId.slice(0, 8)}.md`;

  // 4. ファイルダウンロード形式
  if (format === "download") {
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  }

  // 5. JSON形式（プレビュー・コピー用）
  return NextResponse.json({
    markdown,
    type: exportType,
    filename,
  });
}
