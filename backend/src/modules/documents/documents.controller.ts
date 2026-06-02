import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as os from 'os';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Solo acepta PDFs e imágenes
        if (file.mimetype === 'application/pdf' ||
            file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos PDF e imágenes'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('patientId') patientId: string,
    @Body('type') type: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const created = await this.documentsService.uploadDocument(
      patientId,
      user.userId,
      user.role,
      file,
      type,
    );

    await this.documentsService.auditDocumentUpload(created, user.userId);

    return created;
  }

  @Get('patient/:patientId')
  findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findByPatient(
      patientId,
      user.userId,
      user.role,
    );
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string, 
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response
  ) {
    const doc = await this.documentsService.getDocument(
      id,
      user.userId,
      user.role,
    );
    const key = process.env.FILE_ENCRYPTION_KEY;
    // If stored in S3
    if (doc.storagePath?.startsWith('s3://')) {
      const AWS: any = require('aws-sdk');
      const s3 = new AWS.S3({ region: process.env.S3_REGION });
      const [, bucket, ...rest] = doc.storagePath.split('/');
      const keyName = rest.join('/');

      // If encrypted, download, decrypt to temp, then send
      if (doc.encrypted && doc.encDataKey && doc.iv && doc.tag) {
        const tmpEnc = join(os.tmpdir(), `umbral_enc_${id}_${Date.now()}`);
        const tmpDec = join(os.tmpdir(), `umbral_decrypt_${id}_${Date.now()}${extname(doc.fileName)}`);
        try {
          const obj = await s3.getObject({ Bucket: bucket, Key: keyName }).promise();
          fs.writeFileSync(tmpEnc, obj.Body as Buffer);
          // decrypt using Node crypto
          const { decryptBufferWithEnvelope } = require('./encryption');
          const ciphertext = fs.readFileSync(tmpEnc);
          const plain = await decryptBufferWithEnvelope(ciphertext, {
            iv: doc.iv,
            tag: doc.tag,
            encDataKey: doc.encDataKey,
            encDataKeyIv: doc.encDataKeyIv,
            encDataKeyTag: doc.encDataKeyTag,
          }, key);
          fs.writeFileSync(tmpDec, plain);
          await this.documentsService.auditDocumentDownload(doc, user.userId);
          res.download(tmpDec, doc.fileName, (err) => {
            try { fs.unlinkSync(tmpEnc); } catch {}
            try { fs.unlinkSync(tmpDec); } catch {}
          });
          return;
        } catch (err) {
          try { fs.unlinkSync(tmpEnc); } catch {}
          try { fs.unlinkSync(tmpDec); } catch {}
          res.status(500).send('Error al procesar archivo en S3');
          return;
        }
      }

      // Not encrypted: stream directly
      try {
        const s3Stream = s3.getObject({ Bucket: bucket, Key: keyName }).createReadStream();
        s3Stream.on('error', () => res.status(500).send('Error al leer desde S3'));
        res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
        await this.documentsService.auditDocumentDownload(doc, user.userId);
        s3Stream.pipe(res);
        return;
      } catch (err) {
        res.status(500).send('Error al leer desde S3');
        return;
      }
    }

    const filePath = join(process.cwd(), doc.storagePath);
    if (doc.encrypted && doc.encDataKey && doc.iv && doc.tag) {
      const tmpPath = join(os.tmpdir(), `umbral_decrypt_${id}_${Date.now()}${extname(doc.fileName)}`);
      try {
        const ciphertext = fs.readFileSync(filePath);
        const { decryptBufferWithEnvelope } = require('./encryption');
        const plain = await decryptBufferWithEnvelope(ciphertext, {
          iv: doc.iv,
          tag: doc.tag,
          encDataKey: doc.encDataKey,
          encDataKeyIv: doc.encDataKeyIv,
          encDataKeyTag: doc.encDataKeyTag,
        }, key);
        fs.writeFileSync(tmpPath, plain);
        await this.documentsService.auditDocumentDownload(doc, user.userId);
        res.download(tmpPath, doc.fileName, (err) => { try { fs.unlinkSync(tmpPath); } catch {} });
        return;
      } catch (err) {
        // fallthrough to sending stored file
      }
    }

    await this.documentsService.auditDocumentDownload(doc, user.userId);
    res.download(filePath, doc.fileName);
  }
}