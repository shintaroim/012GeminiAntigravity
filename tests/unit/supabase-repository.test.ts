import { describe, it, expect, vi } from "vitest";
import { SupabaseRepository } from "@/lib/db/supabase-repository";
import { hashToken } from "@/lib/db/repository";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("SupabaseRepository", () => {
  it("should create session and save hash of resumeToken", async () => {
    let insertedData: Record<string, unknown> | null = null;

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sessions") {
          return {
            insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              insertedData = data;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...data },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === "usage_events") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "test-event-id" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient);
    const { session, resumeToken } = await repo.createSession({
      phase: "speak",
    });

    expect(session.id).toBeDefined();
    expect(session.phase).toBe("speak");
    expect(session.resumeTokenHash).toBe(hashToken(resumeToken));
    expect(insertedData!.resume_token_hash).toBe(hashToken(resumeToken));
    expect(insertedData!.deleted_at).toBeNull();
  });

  it("should verify session token correctly", async () => {
    const rawToken = "my-secret-token";
    const hashed = hashToken(rawToken);

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sessions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "session-123",
                      resume_token_hash: hashed,
                      phase: "speak",
                      state_json: {},
                      prompt_version: "v1.0",
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      expires_at: new Date().toISOString(),
                      deleted_at: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient);

    const isValid = await repo.verifySessionToken("session-123", rawToken);
    expect(isValid).toBe(true);

    const isInvalid = await repo.verifySessionToken("session-123", "wrong-token");
    expect(isInvalid).toBe(false);
  });

  it("should create message and count existing sequence number", async () => {
    let insertedMessage: Record<string, unknown> | null = null;

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "sessions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "session-456",
                      resume_token_hash: "hash",
                      phase: "speak",
                      state_json: {},
                      prompt_version: "v1.0",
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      expires_at: new Date().toISOString(),
                      deleted_at: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === "messages") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 3, // すでに3件ある想定
                error: null,
              }),
            }),
            insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              insertedMessage = data;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...data },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const repo = new SupabaseRepository(mockClient);
    const msg = await repo.createMessage({
      sessionId: "session-456",
      role: "assistant",
      content: "こんにちは",
    });

    expect(msg).not.toBeNull();
    expect(msg?.sequenceNo).toBe(4); // 3 + 1 = 4
    expect(insertedMessage!.sequence_no).toBe(4);
    expect(insertedMessage!.content).toBe("こんにちは");
  });
});
