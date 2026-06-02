import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export async function encryptBufferWithEnvelope(plain: Buffer, masterKeyBase64?: string) {
  // If KMS is configured, prefer GenerateDataKey flow
  const kmsKeyId = process.env.KMS_KEY_ID;
  if (kmsKeyId) {
    let AWS: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      AWS = require('aws-sdk');
    } catch (e) {
      throw new Error('aws-sdk is required when KMS_KEY_ID is set');
    }
    const kms = new AWS.KMS({ region: process.env.AWS_REGION || process.env.S3_REGION });
    const dk = await kms.generateDataKey({ KeyId: kmsKeyId, KeySpec: 'AES_256' }).promise();
    const dataKey = Buffer.from(dk.Plaintext as any);

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();

    const ciphertextBlob = Buffer.from(dk.CiphertextBlob as any);

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      encDataKey: ciphertextBlob.toString('base64'), // KMS-encrypted data key
      encDataKeyIv: null,
      encDataKeyTag: null,
      keyProvider: 'kms',
    };
  }

  // Fallback: local master key envelope (AES-GCM)
  if (!masterKeyBase64) throw new Error('No encryption key configured');
  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  const dataKey = randomBytes(32);

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const iv2 = randomBytes(12);
  const cipher2 = createCipheriv('aes-256-gcm', masterKey, iv2);
  const encDataKey = Buffer.concat([cipher2.update(dataKey), cipher2.final()]);
  const tag2 = cipher2.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    encDataKey: encDataKey.toString('base64'),
    encDataKeyIv: iv2.toString('base64'),
    encDataKeyTag: tag2.toString('base64'),
    keyProvider: 'local',
  };
}

export async function decryptBufferWithEnvelope(
  ciphertext: Buffer,
  meta: { iv: string; tag: string; encDataKey: string; encDataKeyIv?: string | null; encDataKeyTag?: string | null },
  masterKeyBase64?: string,
) {
  // If encDataKeyIv is missing, assume KMS-encrypted data key
  if (!meta.encDataKeyIv) {
    // KMS path
    let AWS: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      AWS = require('aws-sdk');
    } catch (e) {
      throw new Error('aws-sdk is required to decrypt KMS-encrypted keys');
    }
    const kms = new AWS.KMS({ region: process.env.AWS_REGION || process.env.S3_REGION });
    const cipherBlob = Buffer.from(meta.encDataKey, 'base64');
    const res = await kms.decrypt({ CiphertextBlob: cipherBlob }).promise();
    const dataKey = Buffer.from(res.Plaintext as any);

    const iv = Buffer.from(meta.iv, 'base64');
    const tag = Buffer.from(meta.tag, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain;
  }

  // Local master key path
  if (!masterKeyBase64) throw new Error('Missing master key for local decryption');
  const masterKey = Buffer.from(masterKeyBase64, 'base64');
  const encDataKey = Buffer.from(meta.encDataKey, 'base64');
  const iv2 = Buffer.from(meta.encDataKeyIv as string, 'base64');
  const tag2 = Buffer.from(meta.encDataKeyTag as string, 'base64');

  const decipher2 = createDecipheriv('aes-256-gcm', masterKey, iv2);
  decipher2.setAuthTag(tag2);
  const dataKey = Buffer.concat([decipher2.update(encDataKey), decipher2.final()]);

  const iv = Buffer.from(meta.iv, 'base64');
  const tag = Buffer.from(meta.tag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain;
}
