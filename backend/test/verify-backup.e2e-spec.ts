import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

function sha256(filePath: string) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

describe('verify-backup script (e2e)', () => {
  it('verifica correctamente un backup con manifest y checksum coherentes', () => {
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-verify-'));
    const backupFile = 'backup-2026-06-03.sql.enc';
    const checksumFile = `${backupFile}.sha256`;
    const manifestFile = `${backupFile}.manifest.json`;
    const backupPath = path.join(backupDir, backupFile);
    const checksumPath = path.join(backupDir, checksumFile);
    const manifestPath = path.join(backupDir, manifestFile);

    fs.writeFileSync(backupPath, 'backup-payload');
    fs.writeFileSync(checksumPath, `${sha256(backupPath)}  ${backupFile}\n`);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          createdAt: '2026-06-03T12:00:00.000Z',
          backupFile,
          checksumFile,
          encrypted: true,
          retentionDays: 30,
        },
        null,
        2,
      ),
    );

    const output = execFileSync(
      'npx',
      ['tsx', 'scripts/verify-backup.ts', backupDir],
      {
        cwd: path.join(process.cwd()),
        encoding: 'utf8',
      },
    );

    expect(output).toContain('✅ Backup verificado correctamente');
    expect(output).toContain(manifestPath);
    expect(output).toContain(backupPath);
  });

  it('falla si el checksum no coincide', () => {
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-verify-bad-'));
    const backupFile = 'backup-2026-06-03.sql.enc';
    const checksumFile = `${backupFile}.sha256`;
    const manifestFile = `${backupFile}.manifest.json`;
    const backupPath = path.join(backupDir, backupFile);
    const checksumPath = path.join(backupDir, checksumFile);
    const manifestPath = path.join(backupDir, manifestFile);

    fs.writeFileSync(backupPath, 'backup-payload-corrupto');
    fs.writeFileSync(checksumPath, `deadbeef  ${backupFile}\n`);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          createdAt: '2026-06-03T12:00:00.000Z',
          backupFile,
          checksumFile,
          encrypted: true,
          retentionDays: 30,
        },
        null,
        2,
      ),
    );

    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/verify-backup.ts', backupDir], {
        cwd: path.join(process.cwd()),
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow();
  });
});