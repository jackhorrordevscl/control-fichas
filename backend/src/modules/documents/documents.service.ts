import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
  ) {}

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

    return this.prisma.patientDocument.create({
      data: {
        patientId,
        uploadedBy: userId,
        type: type as any,
        fileName: file.originalname,
        storagePath: file.path,
      },
    });
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
    userRole: string
  ) {
    const doc = await this.prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!doc) throw new NotFoundException('Documento no encontrado');

    await this.patientsService.findOne(doc.patientId, userId, userRole);

    return doc;
  }
}