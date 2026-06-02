import { IsOptional, IsString } from 'class-validator';

export class RevokeConsentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}