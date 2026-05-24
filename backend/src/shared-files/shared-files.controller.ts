import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SharedFilesService } from './shared-files.service';
import { FileCategory } from '@prisma/client';
import type { Response } from 'express'

@Controller('shared-files')
@UseGuards(JwtAuthGuard)
export class SharedFilesController {
  constructor(private readonly sharedFilesService: SharedFilesService) {}

  @Get()
  findAll(
    @Query('category') category: FileCategory | undefined,
    @Req() req: any,
  ) {
    return this.sharedFilesService.findAll(
      category,
      req.user.role,
      req.user.userId,
    );
  }
  

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.sharedFilesService.validateAccess(
      id,
      req.user.userId,
      req.user.role,
    );

    return this.sharedFilesService.findOne(id);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    await this.sharedFilesService.validateAccess(
      id,
      req.user.userId,
      req.user.role,
    );

    const file =
      await this.sharedFilesService.findOne(id);

    return res.download(
      file.path, 
      file.filename
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
        ];

        if (
          !allowedMimeTypes.includes(file.mimetype)
        ) {
          return cb(
            new BadRequestException(
              'Tipo de archivo no permitido',
            ),
            false,
          );
        }

        cb (null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe adjuntar un archivo válido',
      );
    }

    const sanitizedFileName = 
    file.originalname.replace(
      /[^a-zA-Z0-9.\-.]/g,
      '_',
    );

    file.originalname = sanitizedFileName;

    return this.sharedFilesService.uploadFile(
      file,
      req.user.userId,
    );
  }

  @Patch(':id')
  updateFile(
    @Param('id') id: string,
    @Body()
    dto: { 
      name?: string; 
      description?: string; 
      category?: FileCategory;
    },

    @Req() req: any,
  ) {
    return this.sharedFilesService.updateFile(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  deleteFile(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.sharedFilesService.deleteFile(
      id, 
      req.user.userId, 
      req.user.role
    );
  }
}
