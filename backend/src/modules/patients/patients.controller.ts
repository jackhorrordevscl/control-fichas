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

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ── Ruta pública ────────────────────────────────────────────────
  @Get('public/next-session')
  consultarProximaSesion(@Query('rut') rut: string) {
    if (!rut || rut.trim().length < 5) {
      return { found: false, message: 'RUT inválido' };
    }
    return this.patientsService.consultarSesionPorRut(rut);
  }

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
}