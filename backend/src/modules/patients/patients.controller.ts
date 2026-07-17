import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { RecordConsentDto } from './dto/record-consent.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ── Rutas protegidas ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: any) {
    return this.patientsService.create(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.patientsService.findAll(user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  getHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getHistory(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.findOne(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.update(id, dto, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  softDelete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.softDelete(id, user.id, user.role);
  }

  // T6.1 (issue #27): consentimiento granular por finalidad (Ley 21.719)
  @UseGuards(JwtAuthGuard)
  @Post(':id/consents')
  recordConsent(
    @Param('id') id: string,
    @Body() dto: RecordConsentDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.recordConsent(id, dto, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/consents/status')
  getConsentStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getCurrentConsentStatus(
      id,
      user.id,
      user.role,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/consents')
  getConsentLedger(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getConsentLedger(id, user.id, user.role);
  }
}