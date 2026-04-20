import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY; // 64 hex chars = 32 bytes

function getKey(): Uint8Array {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  // Convert hex string to Uint8Array (avoids Buffer type incompatibility with newer @types/node)
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(KEY_HEX.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const ivRaw = randomBytes(12); // 96-bit IV for GCM
  const iv = new Uint8Array(ivRaw);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const part1 = new Uint8Array(cipher.update(plaintext, "utf8"));
  const part2 = new Uint8Array(cipher.final());
  const tag = new Uint8Array(cipher.getAuthTag());

  const encrypted = new Uint8Array(part1.length + part2.length);
  encrypted.set(part1);
  encrypted.set(part2, part1.length);

  // Format: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  return uint8ArrayToHex(iv) + uint8ArrayToHex(tag) + uint8ArrayToHex(encrypted);
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const iv = hexToUint8Array(ciphertext.slice(0, 24));
  const tag = hexToUint8Array(ciphertext.slice(24, 56));
  const data = hexToUint8Array(ciphertext.slice(56));
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const part1 = new Uint8Array(decipher.update(data));
  const part2 = new Uint8Array(decipher.final());

  const decrypted = new Uint8Array(part1.length + part2.length);
  decrypted.set(part1);
  decrypted.set(part2, part1.length);

  return new TextDecoder().decode(decrypted);
}

/** Encrypt a value only if it's a non-empty string */
export function encryptField(value: string | undefined | null): string | undefined {
  if (!value) return value ?? undefined;
  return encrypt(value);
}

/** Decrypt a value, return original if decryption fails (for backward compat with unencrypted existing data) */
export function decryptField(value: string | undefined | null): string | undefined {
  if (!value) return value ?? undefined;
  try {
    return decrypt(value);
  } catch {
    return value; // already plain text (existing unencrypted data)
  }
}
