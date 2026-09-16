import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOperatorToken, operatorFetch, setOperatorToken } from "./operatorAuth";

describe("runtime operator token storage", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("reads the token at request time and sends it as a bearer credential", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setOperatorToken("runtime-token-12345678901234567890");

    await operatorFetch("/api/jobs", { headers: { Authorization: "Bearer caller-supplied-token-that-must-not-win" } });

    expect(fetchMock).toHaveBeenCalledWith("/api/jobs", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer runtime-token-12345678901234567890" })
    }));
  });

  it("clears the token only for 401 authentication responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 422 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    setOperatorToken("runtime-token-12345678901234567890");

    for (let index = 0; index < 5; index += 1) {
      await operatorFetch("/api/jobs");
      expect(getOperatorToken()).toBe("runtime-token-12345678901234567890");
    }
    await operatorFetch("/api/jobs");
    expect(getOperatorToken()).toBeNull();
  });

  it("preserves the token when the network request rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    setOperatorToken("runtime-token-12345678901234567890");
    await expect(operatorFetch("/api/jobs")).rejects.toThrow("offline");
    expect(getOperatorToken()).toBe("runtime-token-12345678901234567890");
  });
});
