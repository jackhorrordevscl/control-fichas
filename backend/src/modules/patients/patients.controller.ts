import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ── Ruta protegida para consulta de próxima sesión (requiere autenticación)
  @UseGuards(JwtAuthGuard)
  @Get('next-session')
  consultarProximaSesion(@Query('rut') rut: string, @CurrentUser() user: any) {
    if (!rut || rut.trim().length < 5) {
      return { found: false, message: 'RUT inválido' };
    }
    // Requiere autenticación para evitar exposición pública por RUT
    return this.patientsService.consultarSesionPorRut(rut);
  }

  // ── Rutas protegidas ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.create(dto, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: any, @Query('q') query?: string) {
    return this.patientsService.findAll(user.userId, user.role, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  getHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.getHistory(id, user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.findOne(id, user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.update(id, dto, user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  softDelete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.softDelete(id, user.userId, user.role);
  }
}