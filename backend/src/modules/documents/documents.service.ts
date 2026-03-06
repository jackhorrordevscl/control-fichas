import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async uploadDocument(
    patientId: string,
    userId: string,
    file: Express.Multer.File,
    type: string,
  ) {
    // Verifica que el paciente existe
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      // Elimina el archivo subido si el paciente no existe
      fs.unlinkSync(file.path);
      throw new NotFoundException('Paciente no encontrado');
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

  async findByPatient(patientId: string) {
    return this.prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDocument(id: string) {
    const doc = await this.prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!doc) throw new NotFoundException('Documento no encontrado');

    return doc;
  }
}