import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "pm";
const PREFIX_BYTES = 4; // 8 hex chars
const SECRET_BYTES = 24; // 48 hex chars

export type GeneratedKey = {
  /** Full key. Shown once, never stored. */
  key: string;
  /** Identifying segment, safe to display. */
  prefix: string;
  /** SHA-256 of the full key. */
  keyHash: string;
};

/**
 * API keys are 24 random bytes, so a digest is enough - the slow hashing that
 * protects a human-chosen password buys nothing against this much entropy, and
 * a plain digest can be looked up by a unique index in one query.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateKey(): GeneratedKey {
  const prefix = randomBytes(PREFIX_BYTES).toString("hex");
  const secret = randomBytes(SECRET_BYTES).toString("hex");
  const key = `${PREFIX}_${prefix}_${secret}`;
  return { key, prefix, keyHash: hashKey(key) };
}

export function looksLikeKey(value: string): boolean {
  return /^pm_[0-9a-f]{8}_[0-9a-f]{48}$/.test(value);
}

/** Constant-time digest comparison, for the rare non-indexed check. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** `pm_a1b2c3d4...` - what the UI shows for an existing key. */
export function displayPrefix(prefix: string): string {
  return `${PREFIX}_${prefix}...`;
}
