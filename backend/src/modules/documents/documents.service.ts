import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import * as path from 'path';
import * as fs from 'fs';

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
      // Lanza NotFoundException/ForbiddenException si el paciente no existe
      // o el usuario no tiene acceso a él
      await this.patientsService.findOne(patientId, userId, userRole);
    } catch (err) {
      // Elimina el archivo subido si la validación falla
      fs.unlinkSync(file.path);
      throw err;
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

  async findByPatient(patientId: string, userId: string, userRole: string) {
    // Lanza NotFoundException/ForbiddenException si el usuario no tiene acceso a este paciente
    await this.patientsService.findOne(patientId, userId, userRole);

    return this.prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDocument(id: string, userId: string, userRole: string) {
    const doc = await this.prisma.patientDocument.findUnique({
      where: { id },
    });

    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Lanza ForbiddenException si el usuario no tiene acceso al paciente dueño del documento
    await this.patientsService.findOne(doc.patientId, userId, userRole);

    return doc;
  }
}