import { encryptBufferWithEnvelope, decryptBufferWithEnvelope } from './encryption';

describe('documents encryption', () => {
  afterEach(() => {
    delete process.env.KMS_KEY_ID;
    delete process.env.AWS_REGION;
    delete process.env.S3_REGION;
  });

  it('cifra y descifra un buffer con master key local', async () => {
    const masterKey = Buffer.from('0'.repeat(32)).toString('base64');
    const plain = Buffer.from('contenido sensible');

    const encrypted = await encryptBufferWithEnvelope(plain, masterKey);

    expect(encrypted.keyProvider).toBe('local');
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.encDataKey).toBeDefined();
    expect(encrypted.encDataKeyIv).toBeDefined();
    expect(encrypted.encDataKeyTag).toBeDefined();

    const decrypted = await decryptBufferWithEnvelope(
      encrypted.ciphertext,
      {
        iv: encrypted.iv,
        tag: encrypted.tag,
        encDataKey: encrypted.encDataKey,
        encDataKeyIv: encrypted.encDataKeyIv,
        encDataKeyTag: encrypted.encDataKeyTag,
      },
      masterKey,
    );

    expect(decrypted.toString()).toBe('contenido sensible');
  });

  it('rechaza cifrar sin llave maestra local cuando no hay KMS', async () => {
    await expect(
      encryptBufferWithEnvelope(Buffer.from('dato sensible')),
    ).rejects.toThrow('No encryption key configured');
  });
});
