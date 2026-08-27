import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "pm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  uid: string;
  role: Role;
};

function secretKey(): Uint8Array {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("Missing required env var: SESSION_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Edge-safe: no `next/headers`, usable from middleware. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const uid = payload["uid"];
    const role = payload["role"];
    if (typeof uid !== "string" || (role !== "ADMIN" && role !== "EDITOR")) return null;
    return { uid, role };
  } catch {
    return null;
  }
}
