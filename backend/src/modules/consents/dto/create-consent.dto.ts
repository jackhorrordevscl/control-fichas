import { ConsentType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateConsentDto {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsString()
  version!: string;

  @IsString()
  method!: string;

  @IsString()
  documentId!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
