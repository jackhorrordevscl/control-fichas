import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

type BackupManifest = {
  createdAt: string;
  backupFile: string;
  checksumFile: string;
  encrypted: boolean;
  retentionDays: number;
};

function sha256(filePath: string) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function main() {
  const backupDir = process.argv[2] ?? path.join(process.cwd(), '..', 'backups', 'files');

  if (!fs.existsSync(backupDir)) {
    console.error(`No existe el directorio de backups: ${backupDir}`);
    process.exit(1);
  }

  const manifests = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith('.manifest.json'))
    .sort();

  if (manifests.length === 0) {
    console.error(`No se encontraron manifests en ${backupDir}`);
    process.exit(1);
  }

  const manifestPath = path.join(backupDir, manifests[manifests.length - 1]);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BackupManifest;
  const backupPath = path.join(backupDir, manifest.backupFile);
  const checksumPath = path.join(backupDir, manifest.checksumFile);

  if (!fs.existsSync(backupPath)) {
    console.error(`No existe el backup referenciado: ${backupPath}`);
    process.exit(2);
  }

  if (!fs.existsSync(checksumPath)) {
    console.error(`No existe el checksum referenciado: ${checksumPath}`);
    process.exit(3);
  }

  const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
  const actualChecksum = sha256(backupPath);

  if (expectedChecksum !== actualChecksum) {
    console.error('Checksum inválido para el backup más reciente');
    process.exit(4);
  }

  if (manifest.encrypted && !backupPath.endsWith('.enc')) {
    console.error('El manifest indica cifrado pero el artefacto no termina en .enc');
    process.exit(5);
  }

  console.log('✅ Backup verificado correctamente');
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Backup: ${backupPath}`);
}

main();