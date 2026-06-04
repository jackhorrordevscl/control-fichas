import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDataSubjectRequestDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsObject()
  evidence?: unknown;
}
