import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCHEME = "scrypt";

/** Stored format: `scrypt$<saltHex>$<keyHex>` */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(plain, salt, KEY_LENGTH);
  return [SCHEME, salt.toString("hex"), key.toString("hex")].join("$");
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== SCHEME || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(plain, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
