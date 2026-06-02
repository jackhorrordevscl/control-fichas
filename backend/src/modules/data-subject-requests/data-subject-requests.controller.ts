import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DataSubjectRequestsService } from './data-subject-requests.service';
import { CreateDataSubjectRequestDto } from './dto/create-data-subject-request.dto';
import { ResolveDataSubjectRequestDto } from './dto/resolve-data-subject-request.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DIRECTOR', 'COORDINATOR')
@Controller('patients/:patientId/data-subject-requests')
export class DataSubjectRequestsController {
  constructor(private readonly dataSubjectRequestsService: DataSubjectRequestsService) {}

  @Get()
  findAll(@Param('patientId') patientId: string) {
    return this.dataSubjectRequestsService.findAll(patientId);
  }

  @Post()
  create(
    @Param('patientId') patientId: string,
    @Body() body: CreateDataSubjectRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataSubjectRequestsService.create(patientId, body, user.userId ?? null);
  }

  @Patch(':requestId/resolve')
  resolve(
    @Param('patientId') patientId: string,
    @Param('requestId') requestId: string,
    @Body() body: ResolveDataSubjectRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataSubjectRequestsService.resolve(
      patientId,
      requestId,
      body.resolutionNote,
      user.userId ?? null,
    );
  }
}
