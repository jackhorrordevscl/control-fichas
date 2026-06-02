import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { encryptBufferWithEnvelope } from './encryption';
import { PatientsService } from '../patients/patients.service';
import { AuditService } from '../audit/audit.service';
import { DocumentType, Prisma } from '@prisma/client';

const CLINICAL_DOCUMENT_TYPES = new Set<DocumentType>([
  DocumentType.INFORMED_CONSENT,
  DocumentType.TELEMED_AGREEMENT,
  DocumentType.PATIENT_REPORT,
  DocumentType.CONSULTATION_ATTACHMENT,
]);

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
    private auditService: AuditService,
  ) {}

  private normalizeDocumentType(type: string) {
    const normalized = type?.trim() as DocumentType | undefined;

    if (!normalized || !Object.values(DocumentType).includes(normalized)) {
      throw new BadRequestException('Tipo de documento inválido');
    }

    return normalized;
  }

  private assertEncryptionConfiguredForClinicalDocs(type: DocumentType) {
    if (!CLINICAL_DOCUMENT_TYPES.has(type)) {
      return;
    }

    if (!process.env.FILE_ENCRYPTION_KEY && !process.env.KMS_KEY_ID) {
      throw new ConflictException(
        'Los documentos clínicos requieren cifrado configurado antes de subirlos',
      );
    }
  }

  async uploadDocument(
    patientId: string,
    userId: string,
    userRole: string,
    file: Express.Multer.File,
    type: string,
  ) {
    try {
      await this.patientsService.findOne(patientId, userId, userRole);
    } catch (error) {
      fs.unlinkSync(file.path);
      throw error;
    }

    const documentType = this.normalizeDocumentType(type);
    this.assertEncryptionConfiguredForClinicalDocs(documentType);

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const masterKey = process.env.FILE_ENCRYPTION_KEY;
      const kmsKey = process.env.KMS_KEY_ID;
      let storagePath = file.path;
      let encrypted = false;
      let encDataKey: string | undefined;
      let encDataKeyIv: string | undefined | null;
      let encDataKeyTag: string | undefined | null;
      let iv: string | undefined;
      let tag: string | undefined;

      if (masterKey || kmsKey) {
        try {
          const result = await encryptBufferWithEnvelope(fileBuffer, masterKey);
          const { ciphertext, iv: _iv, tag: _tag, encDataKey: _encDataKey, encDataKeyIv: _encIv, encDataKeyTag: _encTag } = result as any;
          const encPath = `${file.path}.enc`;
          fs.writeFileSync(encPath, ciphertext);
          try { fs.unlinkSync(file.path); } catch {}
          storagePath = encPath;
          encrypted = true;
          encDataKey = _encDataKey;
          encDataKeyIv = _encIv;
          encDataKeyTag = _encTag;
          iv = _iv;
          tag = _tag;
        } catch (err) {
          storagePath = file.path;
          encrypted = false;
        }
      }

      const s3Bucket = process.env.S3_BUCKET;
      if (s3Bucket) {
        try {
          const AWS: any = require('aws-sdk');
          const s3 = new AWS.S3({ region: process.env.S3_REGION });
          const keyName = `documents/${patientId}/${Date.now()}_${file.originalname}`;
          const params: any = {
            Bucket: s3Bucket,
            Key: keyName,
            Body: fs.createReadStream(storagePath),
            ContentType: file.mimetype,
          };

          await s3.upload(params).promise();

          try { fs.unlinkSync(storagePath); } catch {}

          const s3Path = `s3://${s3Bucket}/${keyName}`;

          return this.prisma.patientDocument.create({
            data: {
              patientId,
              uploadedBy: userId,
              type: documentType,
              fileName: file.originalname,
              storagePath: s3Path,
              contentHash: hash,
              encrypted: encrypted,
              encDataKey,
              encDataKeyIv,
              encDataKeyTag,
              iv,
              tag,
            },
          });
        } catch (err) {
          // fallthrough to local storage
        }
      }

      return this.prisma.patientDocument.create({
        data: {
          patientId,
          uploadedBy: userId,
          type: documentType,
          fileName: file.originalname,
          storagePath,
          contentHash: hash,
          encrypted,
          encDataKey,
          encDataKeyIv,
          encDataKeyTag,
          iv,
          tag,
        },
      });
    } catch (error) {
      try { fs.unlinkSync(file.path); } catch {}
      try { fs.unlinkSync(`${file.path}.enc`); } catch {}
      throw error;
    }
  }

  async findByPatient(
    patientId: string,
    userId: string,
    userRole: string,
  ) {
    await this.patientsService.findOne(patientId, userId, userRole);

    return this.prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDocument(
    id: string,
    userId: string,
    userRole: string,
  ) {
    const doc = await this.prisma.patientDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.patientsService.findOne(doc.patientId, userId, userRole);
    return doc;
  }

  async auditDocumentUpload(document: { id: string; patientId: string; fileName: string }, userId: string | undefined) {
    await this.auditService.log({
      userId,
      action: 'DOCUMENT_UPLOAD',
      resource: 'PatientDocument',
      resourceId: document.id,
      detail: `Documento ${document.fileName} subido para paciente ${document.patientId}`,
      statusCode: 201,
    }).catch(() => undefined);
  }

  async auditDocumentDownload(document: { id: string; patientId: string; fileName: string }, userId: string | undefined) {
    await this.auditService.log({
      userId,
      action: 'DOCUMENT_DOWNLOAD',
      resource: 'PatientDocument',
      resourceId: document.id,
      detail: `Documento ${document.fileName} descargado para paciente ${document.patientId}`,
      statusCode: 200,
    }).catch(() => undefined);
  }
}
