import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const DEFAULTS = { N: 16384, r: 8, p: 1, keyLen: 64 };

// Format: scrypt$N$r$p$saltHex$hashHex
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scryptPromise(password, salt, DEFAULTS.keyLen, DEFAULTS);

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

  const derivedKey = await scryptPromise(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return timingSafeEqual(expected, derivedKey);
}

function scryptPromise(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}
