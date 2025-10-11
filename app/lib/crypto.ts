/**
 * Crypto utilities for secure encryption/decryption of data
 * Uses Web Crypto API with AES-GCM encryption
 */

// Constants for encryption
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

// Encryption format version for future compatibility
const ENCRYPTION_VERSION = 1;

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using AES-GCM with a key derived from the password
 * @param plaintext - The string to encrypt
 * @param password - The password to derive the encryption key from
 * @returns Base64 encoded encrypted data with metadata
 */
export async function encryptData(
  plaintext: string,
  password: string
): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encoder.encode(plaintext)
    );

    // Combine version, salt, IV, and encrypted data
    // Format: [version(1)] [salt(16)] [iv(12)] [ciphertext+tag]
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(
      1 + SALT_LENGTH + IV_LENGTH + encryptedArray.length
    );

    combined[0] = ENCRYPTION_VERSION;
    combined.set(salt, 1);
    combined.set(iv, 1 + SALT_LENGTH);
    combined.set(encryptedArray, 1 + SALT_LENGTH + IV_LENGTH);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts a string that was encrypted using encryptData
 * @param encryptedData - Base64 encoded encrypted data with metadata
 * @param password - The password to derive the decryption key from
 * @returns The decrypted plaintext string
 */
export async function decryptData(
  encryptedData: string,
  password: string
): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0)
    );

    // Extract version, salt, IV, and ciphertext
    const version = combined[0];
    if (version !== ENCRYPTION_VERSION) {
      throw new Error(
        `Unsupported encryption version: ${version}. Expected: ${ENCRYPTION_VERSION}`
      );
    }

    const salt = combined.slice(1, 1 + SALT_LENGTH);
    const iv = combined.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(1 + SALT_LENGTH + IV_LENGTH);

    // Derive decryption key from password
    const key = await deriveKey(password, salt);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      ciphertext
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      "Failed to decrypt data. Invalid password or corrupted data."
    );
  }
}

/**
 * Tests if the Web Crypto API is available and functional
 * @returns True if crypto operations are supported
 */
export function isCryptoSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.crypto &&
      window.crypto.subtle &&
      typeof window.crypto.subtle.encrypt === "function" &&
      typeof window.crypto.subtle.decrypt === "function" &&
      typeof window.crypto.subtle.deriveBits === "function"
    );
  } catch {
    return false;
  }
}

/**
 * Creates a hash of the GitHub token for use as an encryption key identifier
 * This can be used to verify if the same token is being used without storing it
 * @param token - The GitHub access token
 * @returns A hex string hash of the token
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates that encrypted data can be decrypted with the given password
 * @param encryptedData - The encrypted data to validate
 * @param password - The password to test
 * @returns True if the password can decrypt the data
 */
export async function validateEncryptionPassword(
  encryptedData: string,
  password: string
): Promise<boolean> {
  try {
    await decryptData(encryptedData, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a secure random encryption key (for testing or key generation)
 * @returns A base64 encoded random key
 */
export function generateRandomKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...key));
}

/**
 * Encrypts an object as JSON
 * @param data - The object to encrypt
 * @param password - The password to derive the encryption key from
 * @returns Base64 encoded encrypted JSON data
 */
export async function encryptJSON(
  data: any,
  password: string
): Promise<string> {
  const jsonString = JSON.stringify(data);
  return encryptData(jsonString, password);
}

/**
 * Decrypts JSON data that was encrypted using encryptJSON
 * @param encryptedData - Base64 encoded encrypted JSON data
 * @param password - The password to derive the decryption key from
 * @returns The decrypted and parsed JSON object
 */
export async function decryptJSON(
  encryptedData: string,
  password: string
): Promise<any> {
  const jsonString = await decryptData(encryptedData, password);
  return JSON.parse(jsonString);
}

// Encrypted data format interface for type safety
export interface EncryptedDataEnvelope {
  encrypted: true;
  version: number;
  data: string; // Base64 encoded encrypted content
  timestamp: string; // ISO timestamp of encryption
  tokenHash?: string; // Optional hash of the token used for encryption
}

/**
 * Creates an encrypted data envelope with metadata
 * @param data - The data to encrypt
 * @param password - The password for encryption
 * @returns An encrypted data envelope
 */
export async function createEncryptedEnvelope(
  data: any,
  password: string
): Promise<EncryptedDataEnvelope> {
  const encryptedData = await encryptJSON(data, password);
  const tokenHash = await hashToken(password);

  return {
    encrypted: true,
    version: ENCRYPTION_VERSION,
    data: encryptedData,
    timestamp: new Date().toISOString(),
    tokenHash,
  };
}

/**
 * Extracts and decrypts data from an encrypted envelope
 * @param envelope - The encrypted data envelope
 * @param password - The password for decryption
 * @returns The decrypted data
 */
export async function extractFromEncryptedEnvelope(
  envelope: EncryptedDataEnvelope,
  password: string
): Promise<any> {
  // Verify envelope structure
  if (!envelope.encrypted || !envelope.data) {
    throw new Error("Invalid encrypted envelope format");
  }

  // Check version compatibility
  if (envelope.version > ENCRYPTION_VERSION) {
    throw new Error(
      `Unsupported encryption version: ${envelope.version}. Maximum supported: ${ENCRYPTION_VERSION}`
    );
  }

  // Optionally verify token hash if present
  if (envelope.tokenHash) {
    const currentTokenHash = await hashToken(password);
    if (envelope.tokenHash !== currentTokenHash) {
      console.warn("Token hash mismatch - the encryption key may have changed");
    }
  }

  return decryptJSON(envelope.data, password);
}

/**
 * Checks if data is an encrypted envelope
 * @param data - The data to check
 * @returns True if the data is an encrypted envelope
 */
export function isEncryptedEnvelope(data: any): data is EncryptedDataEnvelope {
  return (
    typeof data === "object" &&
    data !== null &&
    data.encrypted === true &&
    typeof data.version === "number" &&
    typeof data.data === "string" &&
    typeof data.timestamp === "string"
  );
}
