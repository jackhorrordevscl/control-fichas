import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateConsentDto } from './dto/create-consent.dto';
import { RevokeConsentDto } from './dto/revoke-consent.dto';

@Controller('patients/:patientId/consents')
export class ConsentsController {
  constructor(private consentsService: ConsentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Param('patientId') patientId: string, @Body() body: CreateConsentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.consentsService.create(patientId, body, user.userId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Param('patientId') patientId: string) {
    return this.consentsService.findAll(patientId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':consentId/revoke')
  revoke(@Param('patientId') patientId: string, @Param('consentId') consentId: string, @Body() body: RevokeConsentDto, @CurrentUser() user: AuthenticatedUser) {
    const reason = body?.reason ?? null;
    return this.consentsService.revoke(patientId, consentId, user.userId ?? null, reason);
  }
}
