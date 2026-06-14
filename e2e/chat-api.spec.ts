import { test, expect } from "@playwright/test";

/**
 * Chat API smoke tests via frontend proxy (no Clerk session).
 * Full authenticated flow is covered in backend vitest `api-chat.test.ts`.
 */
test.describe("chat API smoke", () => {
  test("helper chat returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/helper", {
      data: {
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "What nodes support image input?" }],
          },
        ],
      },
    });
    expect(res.status()).toBe(401);
  });

  test("thinkly chat returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/thinkly", {
      data: {
        chatId: "chat_test",
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Plan a workflow" }],
          },
        ],
      },
    });
    expect(res.status()).toBe(401);
  });

  test("brain chat returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/brain", {
      data: {
        chatId: "chat_test",
        messages: [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "create_workflow" }],
          },
        ],
      },
    });
    expect(res.status()).toBe(401);
  });

  test("run-token returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/run-token", {
      data: {
        orchestratorRunId: "tr_test",
        workflowId: "wf_test",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("brain activate returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/brain/activate", {
      data: { thinklyChatId: "thinkly_test" },
    });
    expect(res.status()).toBe(401);
  });

  test("workflow-context returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/chat/workflow-context", {
      data: { chatId: "chat_test", workflowId: "wf_test" },
    });
    expect(res.status()).toBe(401);
  });
});
