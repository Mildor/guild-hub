import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>('ENCRYPTION_KEY');

    if (!rawKey) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is missing from environment variables.',
      );
    }

    const normalizedKey = rawKey.trim();
    if (!/^[0-9a-fA-F]{64}$/.test(normalizedKey)) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
      );
    }

    this.key = Buffer.from(normalizedKey, 'hex');
  }

  encrypt(plainText: string): string {
    if (!plainText) {
      return plainText;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(cipherText: string): string {
    if (!cipherText) {
      return cipherText;
    }

    if (!this.isEncryptedPayload(cipherText)) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new InternalServerErrorException('Invalid encrypted payload format.');
    }

    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private isEncryptedPayload(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const isHex = (input: string) => /^[0-9a-fA-F]+$/.test(input);

    return (
      ivHex.length === 24 &&
      authTagHex.length === 32 &&
      encryptedHex.length > 0 &&
      isHex(ivHex) &&
      isHex(authTagHex) &&
      isHex(encryptedHex)
    );
  }
}
