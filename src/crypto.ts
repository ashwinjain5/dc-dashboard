/**
 * Browser-side AES-256-GCM decryption using Web Crypto API.
 * Mirrors the Node.js encryption in scripts/encrypt_data.cjs.
 */

const PBKDF2_ITERATIONS = 100000;

interface EncryptedBundle {
  salt: string; // hex
  iv: string;   // hex
  tag: string;  // hex
  data: string; // base64
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(email: string, password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passphrase = email.toLowerCase().trim() + ':' + password;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Decrypt the encrypted bundle using email + password.
 * Returns the parsed JSON object, or throws on wrong credentials.
 */
export async function decryptBundle(
  bundle: EncryptedBundle,
  email: string,
  password: string
): Promise<Record<string, unknown>> {
  const salt = hexToBytes(bundle.salt);
  const iv = hexToBytes(bundle.iv);
  const tag = hexToBytes(bundle.tag);
  const ciphertext = base64ToBytes(bundle.data);

  // AES-GCM expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const key = await deriveKey(email, password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    combined
  );

  const text = new TextDecoder().decode(decrypted);
  return JSON.parse(text);
}
