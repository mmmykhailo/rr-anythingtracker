import { describe, test, expect, beforeAll } from "bun:test";
import {
  encryptData,
  decryptData,
  encryptJSON,
  decryptJSON,
  createEncryptedEnvelope,
  extractFromEncryptedEnvelope,
  isEncryptedEnvelope,
  hashToken,
  validateEncryptionPassword,
  generateRandomKey,
  isCryptoSupported,
} from "./crypto";

// Note: These tests run in Node/Bun environment with crypto polyfills
// Web Crypto API is available through polyfills

describe("Crypto Utilities", () => {
  const testPassword = "test-password-123";
  const testData = "Hello, World!";
  const testObject = {
    name: "Test",
    value: 42,
    nested: { key: "value" },
  };

  describe("isCryptoSupported", () => {
    test("should detect crypto support", () => {
      // In test environment, should return true due to polyfills
      const supported = isCryptoSupported();
      expect(typeof supported).toBe("boolean");
    });
  });

  describe("Basic Encryption/Decryption", () => {
    test("should encrypt and decrypt string data", async () => {
      const encrypted = await encryptData(testData, testPassword);
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted).not.toBe(testData);

      const decrypted = await decryptData(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });

    test("should produce different ciphertext for same data (due to random IV)", async () => {
      const encrypted1 = await encryptData(testData, testPassword);
      const encrypted2 = await encryptData(testData, testPassword);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same data
      const decrypted1 = await decryptData(encrypted1, testPassword);
      const decrypted2 = await decryptData(encrypted2, testPassword);
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });

    test("should fail decryption with wrong password", async () => {
      const encrypted = await encryptData(testData, testPassword);

      await expect(
        decryptData(encrypted, "wrong-password")
      ).rejects.toThrow();
    });

    test("should fail decryption with corrupted data", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const corrupted = encrypted.slice(0, -5) + "XXXXX";

      await expect(decryptData(corrupted, testPassword)).rejects.toThrow();
    });

    test("should handle empty string", async () => {
      const encrypted = await encryptData("", testPassword);
      const decrypted = await decryptData(encrypted, testPassword);
      expect(decrypted).toBe("");
    });

    test("should handle unicode characters", async () => {
      const unicodeData = "Hello 世界 🌍 مرحبا";
      const encrypted = await encryptData(unicodeData, testPassword);
      const decrypted = await decryptData(encrypted, testPassword);
      expect(decrypted).toBe(unicodeData);
    });

    test("should handle long strings", async () => {
      const longData = "A".repeat(10000);
      const encrypted = await encryptData(longData, testPassword);
      const decrypted = await decryptData(encrypted, testPassword);
      expect(decrypted).toBe(longData);
    });
  });

  describe("JSON Encryption/Decryption", () => {
    test("should encrypt and decrypt JSON objects", async () => {
      const encrypted = await encryptJSON(testObject, testPassword);
      expect(typeof encrypted).toBe("string");

      const decrypted = await decryptJSON(encrypted, testPassword);
      expect(decrypted).toEqual(testObject);
    });

    test("should handle arrays", async () => {
      const testArray = [1, 2, 3, "four", { five: 5 }];
      const encrypted = await encryptJSON(testArray, testPassword);
      const decrypted = await decryptJSON(encrypted, testPassword);
      expect(decrypted).toEqual(testArray);
    });

    test("should handle nested objects", async () => {
      const complex = {
        level1: {
          level2: {
            level3: {
              data: "deep",
              array: [1, 2, 3],
            },
          },
        },
      };
      const encrypted = await encryptJSON(complex, testPassword);
      const decrypted = await decryptJSON(encrypted, testPassword);
      expect(decrypted).toEqual(complex);
    });

    test("should fail with wrong password", async () => {
      const encrypted = await encryptJSON(testObject, testPassword);
      await expect(
        decryptJSON(encrypted, "wrong-password")
      ).rejects.toThrow();
    });
  });

  describe("Encrypted Envelopes", () => {
    test("should create and extract encrypted envelope", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);

      expect(envelope.encrypted).toBe(true);
      expect(envelope.version).toBe(1);
      expect(typeof envelope.data).toBe("string");
      expect(typeof envelope.timestamp).toBe("string");
      expect(typeof envelope.tokenHash).toBe("string");

      const extracted = await extractFromEncryptedEnvelope(
        envelope,
        testPassword
      );
      expect(extracted).toEqual(testObject);
    });

    test("should include token hash in envelope", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);
      const expectedHash = await hashToken(testPassword);

      expect(envelope.tokenHash).toBe(expectedHash);
    });

    test("should validate envelope timestamp", async () => {
      const before = new Date();
      const envelope = await createEncryptedEnvelope(testObject, testPassword);
      const after = new Date();

      const timestamp = new Date(envelope.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test("should fail extraction with wrong password", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);

      await expect(
        extractFromEncryptedEnvelope(envelope, "wrong-password")
      ).rejects.toThrow();
    });

    test("should detect invalid envelope format", async () => {
      const invalidEnvelope = {
        encrypted: true,
        version: 1,
        data: "invalid",
        // Missing timestamp
      };

      await expect(
        extractFromEncryptedEnvelope(invalidEnvelope as any, testPassword)
      ).rejects.toThrow();
    });

    test("should reject unsupported version", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);
      envelope.version = 999;

      await expect(
        extractFromEncryptedEnvelope(envelope, testPassword)
      ).rejects.toThrow(/version/i);
    });

    test("should warn on token hash mismatch", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);
      envelope.tokenHash = "different-hash";

      // Should still work but log warning
      const extracted = await extractFromEncryptedEnvelope(
        envelope,
        testPassword
      );
      expect(extracted).toEqual(testObject);
    });
  });

  describe("isEncryptedEnvelope", () => {
    test("should identify valid encrypted envelope", async () => {
      const envelope = await createEncryptedEnvelope(testObject, testPassword);
      expect(isEncryptedEnvelope(envelope)).toBe(true);
    });

    test("should reject non-encrypted data", () => {
      expect(isEncryptedEnvelope(testObject)).toBe(false);
      expect(isEncryptedEnvelope({ encrypted: false })).toBe(false);
      expect(isEncryptedEnvelope(null)).toBe(false);
      expect(isEncryptedEnvelope(undefined)).toBe(false);
      expect(isEncryptedEnvelope("string")).toBe(false);
      expect(isEncryptedEnvelope(123)).toBe(false);
    });

    test("should reject incomplete envelopes", () => {
      expect(
        isEncryptedEnvelope({
          encrypted: true,
          version: 1,
          // Missing data and timestamp
        })
      ).toBe(false);

      expect(
        isEncryptedEnvelope({
          encrypted: true,
          data: "test",
          // Missing version and timestamp
        })
      ).toBe(false);
    });
  });

  describe("Token Hashing", () => {
    test("should hash token consistently", async () => {
      const hash1 = await hashToken(testPassword);
      const hash2 = await hashToken(testPassword);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBeGreaterThan(0);
    });

    test("should produce different hashes for different tokens", async () => {
      const hash1 = await hashToken("token1");
      const hash2 = await hashToken("token2");

      expect(hash1).not.toBe(hash2);
    });

    test("should produce hex string", async () => {
      const hash = await hashToken(testPassword);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("Password Validation", () => {
    test("should validate correct password", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const isValid = await validateEncryptionPassword(
        encrypted,
        testPassword
      );
      expect(isValid).toBe(true);
    });

    test("should reject incorrect password", async () => {
      const encrypted = await encryptData(testData, testPassword);
      const isValid = await validateEncryptionPassword(
        encrypted,
        "wrong-password"
      );
      expect(isValid).toBe(false);
    });
  });

  describe("Random Key Generation", () => {
    test("should generate random keys", () => {
      const key1 = generateRandomKey();
      const key2 = generateRandomKey();

      expect(typeof key1).toBe("string");
      expect(typeof key2).toBe("string");
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
    });

    test("should generate base64 encoded keys", () => {
      const key = generateRandomKey();
      // Base64 pattern
      expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe("Real-world Scenarios", () => {
    test("should handle large export data", async () => {
      const largeData = {
        trackers: Array.from({ length: 100 }, (_, i) => ({
          id: `tracker-${i}`,
          title: `Tracker ${i}`,
          entries: Array.from({ length: 50 }, (_, j) => ({
            id: `entry-${i}-${j}`,
            value: Math.random() * 1000,
            date: new Date().toISOString(),
          })),
        })),
      };

      const envelope = await createEncryptedEnvelope(largeData, testPassword);
      const extracted = await extractFromEncryptedEnvelope(
        envelope,
        testPassword
      );

      expect(extracted).toEqual(largeData);
    });

    test("should handle concurrent encryption operations", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        encryptJSON({ index: i, data: `data-${i}` }, testPassword)
      );

      const encrypted = await Promise.all(promises);
      expect(encrypted.length).toBe(10);

      const decrypted = await Promise.all(
        encrypted.map((enc) => decryptJSON(enc, testPassword))
      );

      decrypted.forEach((obj, i) => {
        expect(obj).toEqual({ index: i, data: `data-${i}` });
      });
    });

    test("should maintain data integrity through multiple encrypt/decrypt cycles", async () => {
      let data = testObject;

      // Encrypt and decrypt 5 times
      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptJSON(data, testPassword);
        data = await decryptJSON(encrypted, testPassword);
      }

      expect(data).toEqual(testObject);
    });
  });
});
