import { createServer, type Server } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import {
  createOperatorAuthMiddleware,
  digestsMatch,
  getPrincipal,
  loadOperatorAuthConfig,
  tokensMatch,
  validateOperatorAuthConfig
} from "./operatorAuth.js";

const operatorId = "12345678-1234-4234-8234-1234567890ab";
const operatorToken = "correct-operator-token-123456789012";
let server: Server | undefined;

async function request(authorization?: string) {
  const app = express();
  app.get("/protected", createOperatorAuthMiddleware({ operatorId, operatorToken }), (req, res) => {
    res.json(getPrincipal(req));
  });
  server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}/protected`, authorization ? { headers: { authorization } } : undefined);
}

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  server = undefined;
});

describe("operator auth startup contract", () => {
  it.each([
    [{}, "OPERATOR_ID"],
    [{ OPERATOR_ID: operatorId }, "OPERATOR_TOKEN"],
    [{ OPERATOR_ID: operatorId, OPERATOR_TOKEN: "  " }, "OPERATOR_TOKEN"],
    [{ OPERATOR_ID: operatorId, OPERATOR_TOKEN: "change-me-change-me-change-me-change-me" }, "OPERATOR_TOKEN"],
    [{ OPERATOR_ID: operatorId, OPERATOR_TOKEN: "replace-with-a-random-token-of-at-least-32-characters" }, "OPERATOR_TOKEN"],
    [{ OPERATOR_ID: "operator", OPERATOR_TOKEN: operatorToken }, "OPERATOR_ID"]
  ])("rejects unsafe environment configuration", (env, expected) => {
    expect(() => loadOperatorAuthConfig(env)).toThrow(expected);
  });

  it("accepts a stable UUID and a 32-512 byte non-placeholder token", () => {
    expect(validateOperatorAuthConfig({ operatorId, operatorToken })).toEqual({ operatorId, operatorToken });
    const utf8Token = "é".repeat(16);
    expect(validateOperatorAuthConfig({ operatorId, operatorToken: utf8Token }).operatorToken).toBe(utf8Token);
  });
});

describe("bearer authorization contract", () => {
  it("distinguishes missing credentials", async () => {
    const response = await request();
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(await response.json()).toEqual({ error: { code: "AUTH_REQUIRED", message: "Operator authentication is required." } });
  });

  it.each([
    "Basic abcdefghijklmnopqrstuvwxyz123456",
    `Bearer  ${operatorToken}`,
    `Bearer ${operatorToken} extra`,
    `Bearer ${operatorToken},Bearer ${operatorToken}`,
    "Bearer too-short"
  ])("rejects malformed credentials", async authorization => {
    const response = await request(authorization);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "AUTH_INVALID", message: "Operator authentication is invalid." } });
  });

  it("rejects an incorrect token", async () => {
    const response = await request("Bearer incorrect-operator-token-1234567890");
    expect(response.status).toBe(401);
  });

  it("accepts a case-insensitive scheme and returns the stable principal", async () => {
    const response = await request(`bEaReR ${operatorToken}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ subject: operatorId });
  });

  it("supports token rotation without changing the principal", async () => {
    const rotated = "rotated-operator-token-123456789012";
    expect(tokensMatch(rotated, operatorToken)).toBe(false);
    expect(validateOperatorAuthConfig({ operatorId, operatorToken: rotated }).operatorId).toBe(operatorId);
  });

  it("fails closed before timingSafeEqual when a digest is absent or has a different length", () => {
    expect(digestsMatch(undefined, Buffer.alloc(32))).toBe(false);
    expect(digestsMatch(Buffer.alloc(32), Buffer.alloc(31))).toBe(false);
  });
});
