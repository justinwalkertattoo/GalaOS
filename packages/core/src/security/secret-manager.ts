/**
 * Secret Manager
 *
 * Handles encryption and decryption of sensitive data
 * Uses AES-256-GCM for encryption with secure key derivation
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

export class SecretManager {
  private masterKey: Buffer;

  constructor(masterSecret?: string) {
    const secret = masterSecret || process.env.ENCRYPTION_KEY;
    if (!secret) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    if (secret.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    // Derive a proper encryption key from the master secret
    this.masterKey = crypto.scryptSync(secret, 'galaos-salt', KEY_LENGTH);
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

      // Return base64 encoded
      return combined.toString('base64');
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(ciphertext: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract IV, encrypted data, and auth tag
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(combined.length - TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt an object (converts to JSON first)
   */
  encryptObject<T>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * Decrypt to an object (parses JSON after decryption)
   */
  decryptObject<T>(ciphertext: string): T {
    const decrypted = this.decrypt(ciphertext);
    return JSON.parse(decrypted) as T;
  }

  /**
   * Hash a password using PBKDF2
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');

    // Return salt + hash as base64
    return `${salt.toString('base64')}:${hash.toString('base64')}`;
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [saltB64, hashB64] = hashedPassword.split(':');
      const salt = Buffer.from(saltB64, 'base64');
      const hash = Buffer.from(hashB64, 'base64');

      const computedHash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');

      return crypto.timingSafeEqual(hash, computedHash);
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure API key
   */
  generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Hash an API key for storage
   */
  hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate a secure token (for CSRF, verification, etc.)
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  sign(data: string, secret?: string): string {
    const key = secret || this.masterKey.toString('hex');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verify(data: string, signature: string, secret?: string): boolean {
    const expected = this.sign(data, secret);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expected, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Rotate encryption key (re-encrypt data with new key)
   */
  rotateKey(oldSecret: string, newSecret: string, encryptedData: string): string {
    // Create manager with old key
    const oldManager = new SecretManager(oldSecret);

    // Decrypt with old key
    const plaintext = oldManager.decrypt(encryptedData);

    // Create manager with new key
    const newManager = new SecretManager(newSecret);

    // Encrypt with new key
    return newManager.encrypt(plaintext);
  }
}

// Singleton instance
let instance: SecretManager | null = null;

export function getSecretManager(): SecretManager {
  if (!instance) {
    instance = new SecretManager();
  }
  return instance;
}

export default SecretManager;
