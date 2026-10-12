import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MessageRecord,
  ProgramPhase,
  SessionRecord,
  UsageEventRecord,
  UsageEventType,
} from "@/types";
import { createInitialState } from "@/lib/state/session-state";
import {
  CreateMessageParams,
  CreateSessionParams,
  CreateUsageEventParams,
  SessionRepository,
  hashToken,
} from "./repository";

interface DbSessionRow {
  id: string;
  resume_token_hash: string;
  phase: string;
  state_json: Record<string, unknown>;
  prompt_version: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  deleted_at: string | null;
}

interface DbMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sequence_no: number;
  provider_request_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

interface DbUsageEventRow {
  id: string;
  session_id: string | null;
  event_type: UsageEventType;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
}

function toSessionRecord(row: DbSessionRow): SessionRecord {
  return {
    id: row.id,
    resumeTokenHash: row.resume_token_hash,
    phase: row.phase as ProgramPhase,
    stateJson: row.state_json,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    deletedAt: row.deleted_at,
  };
}

function toMessageRecord(row: DbMessageRow): MessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    sequenceNo: row.sequence_no,
    providerRequestId: row.provider_request_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  };
}

function toUsageEventRecord(row: DbUsageEventRow): UsageEventRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  };
}

export class SupabaseRepository implements SessionRepository {
  private client: SupabaseClient;

  constructor(supabaseUrlOrClient: string | SupabaseClient, supabaseKey?: string) {
    if (typeof supabaseUrlOrClient === "string") {
      if (!supabaseKey) {
        throw new Error("Supabase key is required when initializing with URL");
      }
      this.client = createClient(supabaseUrlOrClient, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      this.client = supabaseUrlOrClient;
    }
  }

  // ==========================================
  // Sessions
  // ==========================================

  public async createSession(
    params?: CreateSessionParams
  ): Promise<{ session: SessionRecord; resumeToken: string }> {
    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomBytes(24).toString("hex");
    const resumeTokenHash = hashToken(resumeToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const phase = params?.phase || "speak";
    const stateJson = params?.initialState || (createInitialState(phase) as unknown as Record<string, unknown>);
    const promptVersion = params?.promptVersion || "v1.0";

    const insertData = {
      id: sessionId,
      resume_token_hash: resumeTokenHash,
      phase,
      state_json: stateJson,
      prompt_version: promptVersion,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt,
      deleted_at: null,
    };

    const { data, error } = await this.client
      .from("sessions")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create session in Supabase: ${error?.message || "unknown"}`);
    }

    const session = toSessionRecord(data as DbSessionRow);

    await this.createUsageEvent({
      sessionId,
      eventType: "session_created",
    });

    return { session, resumeToken };
  }

  public async getSessionById(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toSessionRecord(data as DbSessionRow);
  }

  public async verifySessionToken(
    sessionId: string,
    rawToken: string
  ): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    if (!session) return false;

    const computedHash = hashToken(rawToken);
    return computedHash === session.resumeTokenHash;
  }

  public async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionRecord, "phase" | "stateJson" | "promptVersion">>
  ): Promise<SessionRecord | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.phase !== undefined) {
      updateData.phase = updates.phase;
    }
    if (updates.stateJson !== undefined) {
      updateData.state_json = updates.stateJson;
    }
    if (updates.promptVersion !== undefined) {
      updateData.prompt_version = updates.promptVersion;
    }

    const { data, error } = await this.client
      .from("sessions")
      .update(updateData)
      .eq("id", sessionId)
      .is("deleted_at", null)
      .select()
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toSessionRecord(data as DbSessionRow);
  }

  public async softDeleteSession(
    sessionId: string,
    rawToken: string
  ): Promise<boolean> {
    const isOwner = await this.verifySessionToken(sessionId, rawToken);
    if (!isOwner) return false;

    const now = new Date().toISOString();
    const { error } = await this.client
      .from("sessions")
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", sessionId);

    if (error) {
      return false;
    }

    await this.createUsageEvent({
      sessionId,
      eventType: "session_deleted",
    });

    return true;
  }

  // ==========================================
  // Messages
  // ==========================================

  public async createMessage(
    params: CreateMessageParams
  ): Promise<MessageRecord | null> {
    const session = await this.getSessionById(params.sessionId);
    if (!session) return null;

    // 現在のメッセージ件数をカウントして sequence_no を算出
    const { count, error: countError } = await this.client
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("session_id", params.sessionId);

    if (countError) {
      console.error("Failed to count messages:", countError);
    }

    const nextSeq = (count ?? 0) + 1;
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertData = {
      id: messageId,
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      sequence_no: nextSeq,
      provider_request_id: params.providerRequestId || null,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      created_at: now,
    };

    const { data, error } = await this.client
      .from("messages")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to create message in Supabase:", error);
      return null;
    }

    // セッションの updated_at を更新
    await this.client
      .from("sessions")
      .update({ updated_at: now })
      .eq("id", params.sessionId);

    return toMessageRecord(data as DbMessageRow);
  }

  public async getMessagesBySessionId(
    sessionId: string
  ): Promise<MessageRecord[]> {
    const session = await this.getSessionById(sessionId);
    if (!session) return [];

    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("sequence_no", { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as DbMessageRow[]).map(toMessageRecord);
  }

  public async getTurnCount(sessionId: string): Promise<number> {
    const { count, error } = await this.client
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("role", "assistant");

    if (error || count === null || count === undefined) {
      return 0;
    }

    return count;
  }

  // ==========================================
  // Usage Events
  // ==========================================

  public async createUsageEvent(
    params: CreateUsageEventParams
  ): Promise<UsageEventRecord> {
    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertData = {
      id: eventId,
      session_id: params.sessionId || null,
      event_type: params.eventType,
      model: params.model || null,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      latency_ms: params.latencyMs || null,
      created_at: now,
    };

    const { data, error } = await this.client
      .from("usage_events")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      // ログイベントの失敗時はフォールバックオブジェクトを返す
      return {
        id: eventId,
        sessionId: params.sessionId || null,
        eventType: params.eventType,
        model: params.model || null,
        inputTokens: params.inputTokens || null,
        outputTokens: params.outputTokens || null,
        latencyMs: params.latencyMs || null,
        createdAt: now,
      };
    }

    return toUsageEventRecord(data as DbUsageEventRow);
  }

  public async getUsageEventsBySessionId(
    sessionId: string
  ): Promise<UsageEventRecord[]> {
    const { data, error } = await this.client
      .from("usage_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return (data as DbUsageEventRow[]).map(toUsageEventRecord);
  }
}
