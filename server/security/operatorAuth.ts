import { createHash, timingSafeEqual } from "node:crypto";
import type express from "express";
import type { RequestHandler } from "express";
import { z } from "zod";

export interface Principal {
  subject: string;
}

export interface OperatorAuthConfig {
  operatorId: string;
  operatorToken: string;
}

export type PrincipalRequest = express.Request & { principal?: Principal };

const PLACEHOLDER_PATTERN = /(change[_-]?me|replace|password|example|placeholder|your[_-]?token)/i;
const OPERATOR_ID_SCHEMA = z.string().uuid();

function isValidTokenFormat(token: string): boolean {
  const bytes = Buffer.byteLength(token, "utf8");
  return bytes >= 32 && bytes <= 512 && !/[\s,\x00-\x1f\x7f]/u.test(token);
}

export function validateOperatorAuthConfig(config: OperatorAuthConfig): OperatorAuthConfig {
  const { operatorId, operatorToken } = config;
  if (!OPERATOR_ID_SCHEMA.safeParse(operatorId).success) {
    throw new Error("OPERATOR_ID must be a valid UUID.");
  }
  if (
    operatorToken !== operatorToken.trim()
    || !isValidTokenFormat(operatorToken)
    || PLACEHOLDER_PATTERN.test(operatorToken)
  ) {
    throw new Error("OPERATOR_TOKEN must be a non-placeholder token of 32-512 UTF-8 bytes without whitespace or control characters.");
  }
  return config;
}

export function loadOperatorAuthConfig(env: NodeJS.ProcessEnv = process.env): OperatorAuthConfig {
  return validateOperatorAuthConfig({
    operatorId: env.OPERATOR_ID ?? "",
    operatorToken: env.OPERATOR_TOKEN ?? ""
  });
}

function authError(res: express.Response, code: "AUTH_REQUIRED" | "AUTH_INVALID", message: string) {
  res.setHeader("WWW-Authenticate", "Bearer");
  return res.status(401).json({ error: { code, message } });
}

function parseBearerToken(req: express.Request): string | null | undefined {
  const raw = req.headers.authorization;
  if (raw === undefined) return undefined;
  if (Array.isArray(raw) || raw.includes(",")) {
    return null;
  }
  const match = /^Bearer ([^\s,\x00-\x1f\x7f]+)$/iu.exec(raw);
  return match && isValidTokenFormat(match[1]) ? match[1] : null;
}

export function tokensMatch(expected: string, supplied: string): boolean {
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();
  return digestsMatch(expectedDigest, suppliedDigest);
}

export function digestsMatch(expectedDigest?: Buffer, suppliedDigest?: Buffer): boolean {
  if (!expectedDigest || !suppliedDigest || expectedDigest.length !== suppliedDigest.length) {
    return false;
  }
  return timingSafeEqual(expectedDigest, suppliedDigest);
}

export function createOperatorAuthMiddleware(config: OperatorAuthConfig): RequestHandler {
  const validated = validateOperatorAuthConfig(config);
  return (req, res, next) => {
    const token = parseBearerToken(req);
    if (token === undefined) {
      return authError(res, "AUTH_REQUIRED", "Operator authentication is required.");
    }
    if (token === null || !tokensMatch(validated.operatorToken, token)) {
      return authError(res, "AUTH_INVALID", "Operator authentication is invalid.");
    }
    (req as PrincipalRequest).principal = { subject: validated.operatorId };
    next();
  };
}

export function getPrincipal(req: express.Request): Principal {
  const principal = (req as PrincipalRequest).principal;
  if (!principal) throw new Error("Missing authenticated principal.");
  return principal;
}
