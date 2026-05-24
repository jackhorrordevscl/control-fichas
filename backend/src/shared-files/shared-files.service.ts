import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileCategory, Role } from '@prisma/client';
import * as fs from 'fs';

export interface UploadFileDto {
  name: string;
  description?: string;
  category?: FileCategory;
}

@Injectable()
export class SharedFilesService {
  constructor(private prisma: PrismaService) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    dto?: UploadFileDto,
  ) {
    return this.prisma.sharedFile.create({
      data: {
        name:
          dto?.name ||
          file.originalname,
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          category: dto?.category ?? 'GENERAL',
          description: dto?.description,
          uploadedById: userId,
      },
      include: { 
        uploadedBy: { 
          select: { 
            name: true, 
            email: true 
          }, 
        },
      },
    });
  }

  async findAll(
    category: FileCategory | undefined,
    role: string,
    userId: string,
  ) {
    const whereClause: any = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category;
    }

    if (
      role !== 'ADMIN' &&
      role !== 'DIRECTOR'
    ) {
      whereClause.uploadedById =
        userId;
    }

    return this.prisma.sharedFile.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        filename: true,
        mimetype: true,
        category: true,
        description: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const file =
      await this.prisma.sharedFile.findFirst({
        where: {
          id,
          isActive: true,
        },
      });
    
    if (!file) {
      throw new NotFoundException(
        'Archivo no encontrado',
      );
    }

    return file;
  }

  async validateAccess(
    id: string,
    userId: string,
    role: string,
  ) {
    const file =
      await this.findOne(id);

      if (
        role !== 'ADMIN' &&
        role !== 'DIRECTOR' &&
        file.uploadedById !== userId
      ) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a este archivo',
        );
      }

      return true;
    }

  async getFilePath(
    id: string,
  ): Promise<string> {
    const file = 
      await this.findOne(id);

    if (
      !fs.existsSync(file.path)
    ) {
      throw new NotFoundException(
        'Archivo físico no encontrado en el servidor'
      );
    }
    return file.path;
  }

  async deleteFile(
    id: string, 
    userId: string, 
    userRole: Role,
  ) {
    const file = 
      await this.findOne(id);

    const canDelete =
      file.uploadedById === userId ||
      userRole === 'DIRECTOR' ||
      userRole === 'ADMIN';
    
      if (!canDelete) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este archivo'
      );
    }
    
    await this.prisma.sharedFile.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Archivo eliminado correctamente' };
  }

  async updateFile(
    id: string,
    dto: Partial<UploadFileDto>,
    userId: string,
    userRole: Role,
  ) {
    const file = await this.findOne(id);

    const canEdit =
      file.uploadedById === userId ||
      userRole === 'DIRECTOR' ||
      userRole === 'ADMIN';

    if (!canEdit) {
      throw new ForbiddenException(
        'Sin permiso para editar'
      );
    }

    return this.prisma.sharedFile.update({
      where: { id },
      data: {
        ...(dto.name && { 
          name: dto.name, 
        }),

        ...(dto.description !== 
          undefined && { 
          description: 
            dto.description,
          }),

        ...(dto.category && { 
          category: dto.category,
        }),
      },
    });
  }
}
