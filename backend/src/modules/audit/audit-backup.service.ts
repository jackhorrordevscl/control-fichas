import { Injectable, Logger } from '@nestjs/common';


@Injectable()
export class AuditBackupService {
  private s3: any | null = null;
  private bucket?: string;
  private readonly logger = new Logger(AuditBackupService.name);

  constructor() {
    const bucket = process.env.S3_AUDIT_BUCKET || process.env.S3_BUCKET;
    this.bucket = bucket;
    if (!bucket) return;

    let AWS: any;
    try {
      // require dynamically so tests without aws-sdk installed don't fail
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      AWS = require('aws-sdk');
    } catch (e) {
      this.logger.warn('aws-sdk not available; S3 audit backups disabled');
      return;
    }

    const s3config: any = { region: process.env.S3_REGION };
    if (process.env.S3_ENDPOINT) s3config.endpoint = process.env.S3_ENDPOINT;
    if (process.env.AWS_ACCESS_KEY_ID) s3config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (process.env.AWS_SECRET_ACCESS_KEY) s3config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    this.s3 = new AWS.S3(s3config);
  }

  async backup(auditRecord: any) {
    if (!this.s3 || !this.bucket) return;
    try {
      const date = new Date();
      const day = date.toISOString().slice(0, 10);
      const key = `audit/${day}/${Date.now()}_${auditRecord.id}.json`;
      const body = JSON.stringify(auditRecord);

      const params: any = {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      };

      const lockMode = process.env.S3_OBJECT_LOCK_MODE; // e.g., 'GOVERNANCE' or 'COMPLIANCE'
      const retainDays = Number(process.env.S3_OBJECT_LOCK_RETAIN_DAYS || '0');
      if (lockMode && retainDays > 0) {
        params.ObjectLockMode = lockMode;
        params.ObjectLockRetainUntilDate = new Date(Date.now() + retainDays * 24 * 60 * 60 * 1000);
      }

      await this.s3.putObject(params).promise();
      this.logger.debug(`Audit backup stored s3://${this.bucket}/${key}`);
    } catch (err) {
      this.logger.warn('Failed to write audit backup to S3', err as any);
    }
  }
}
