import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { encryptBufferWithEnvelope, decryptBufferWithEnvelope } from '../src/modules/documents/encryption';

async function main() {
  const kmsKey = process.env.KMS_KEY_ID;
  const fileKey = process.env.FILE_ENCRYPTION_KEY;
  if (!kmsKey && !fileKey) {
    console.error('Falta configuración: exporta KMS_KEY_ID o FILE_ENCRYPTION_KEY');
    process.exit(1);
  }

  console.log('KMS_KEY_ID:', !!kmsKey);
  console.log('Using AWS region:', process.env.AWS_REGION || process.env.S3_REGION || 'not-set');

  const plaintext = Buffer.from(`kms-verification-${Date.now()}`);
  console.log('Plaintext:', plaintext.toString());

  try {
    const result: any = await encryptBufferWithEnvelope(plaintext, fileKey);

    const outdir = path.join(process.cwd(), 'tmp', 'kms-verify');
    fs.mkdirSync(outdir, { recursive: true });

    const ctPath = path.join(outdir, `ct_${Date.now()}.bin`);
    const metaPath = path.join(outdir, `meta_${Date.now()}.json`);

    fs.writeFileSync(ctPath, result.ciphertext);
    fs.writeFileSync(metaPath, JSON.stringify(result, null, 2));

    console.log('Wrote ciphertext:', ctPath);
    console.log('Wrote meta:', metaPath);

    const ciphertext = fs.readFileSync(ctPath);
    const plain = await decryptBufferWithEnvelope(ciphertext, {
      iv: result.iv,
      tag: result.tag,
      encDataKey: result.encDataKey,
      encDataKeyIv: result.encDataKeyIv ?? null,
      encDataKeyTag: result.encDataKeyTag ?? null,
    }, fileKey);

    if (plain.toString() === plaintext.toString()) {
      console.log('✅ KMS verification succeeded: decrypted plaintext matches');
      process.exit(0);
    } else {
      console.error('❌ Decrypted plaintext mismatch');
      process.exit(2);
    }
  } catch (err: any) {
    console.error('Verification failed:', err.message || err);
    process.exit(3);
  }
}

main();
