import { IsString } from 'class-validator';

export class ResolveDataSubjectRequestDto {
  @IsString()
  resolutionNote!: string;
}
