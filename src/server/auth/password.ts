import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const DEFAULTS = { N: 16384, r: 8, p: 1, keyLen: 64 };

// Format: scrypt$N$r$p$saltHex$hashHex
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, DEFAULTS.keyLen, {
    N: DEFAULTS.N,
    r: DEFAULTS.r,
    p: DEFAULTS.p,
  })) as Buffer;

  return `scrypt$${DEFAULTS.N}$${DEFAULTS.r}$${DEFAULTS.p}$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, n, r, p, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");

  const derivedKey = (await scryptAsync(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })) as Buffer;

  return timingSafeEqual(expected, derivedKey);
}
