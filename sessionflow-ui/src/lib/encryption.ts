/**
 * Feature #30 — Client-side AES-GCM encryption utilities
 * Key never leaves the browser. Server stores only encrypted blobs.
 */

const ALGORITHM = "AES-GCM";
const KEY_DERIVATION = "PBKDF2";
const SALT_PREFIX = "sessionflow-notes-v1:";
const ITERATIONS = 100_000;

// ── Key Derivation ──────────────────────────────────────────
let cachedKey: CryptoKey | null = null;
let cachedKeyHash: string | null = null;

export async function deriveEncryptionKey(passwordHash: string): Promise<CryptoKey> {
  // Return cached key if same password hash
  if (cachedKey && cachedKeyHash === passwordHash) return cachedKey;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passwordHash),
    KEY_DERIVATION,
    false,
    ["deriveKey"]
  );

  const salt = encoder.encode(SALT_PREFIX + passwordHash.slice(0, 8));

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION,
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  cachedKeyHash = passwordHash;
  return cachedKey;
}

// ── Encrypt ─────────────────────────────────────────────────
export async function encryptNote(
  plaintext: string,
  passwordHash: string
): Promise<{ encryptedBlob: string; iv: string }> {
  const key = await deriveEncryptionKey(passwordHash);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    encryptedBlob: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
  };
}

// ── Decrypt ─────────────────────────────────────────────────
export async function decryptNote(
  encryptedBlob: string,
  iv: string,
  passwordHash: string
): Promise<string> {
  const key = await deriveEncryptionKey(passwordHash);
  const decoder = new TextDecoder();

  const plainBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(encryptedBlob)
  );

  return decoder.decode(plainBuffer);
}

// ── Helpers ─────────────────────────────────────────────────
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ── Clear cache (on logout) ─────────────────────────────────
export function clearEncryptionCache() {
  cachedKey = null;
  cachedKeyHash = null;
}
