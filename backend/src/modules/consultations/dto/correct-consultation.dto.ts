import { IsString, IsOptional, IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { SessionType } from './create-consultation.dto';

export class CorrectConsultationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @IsOptional()
  @IsString()
  consultReason?: string;

  @IsOptional()
  @IsString()
  intervention?: string;

  @IsOptional()
  @IsString()
  agreements?: string;

  @IsOptional()
  @IsDateString()
  nextSessionDate?: string;

  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;
}